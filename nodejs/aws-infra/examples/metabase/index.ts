// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/aws-infra";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

export interface MetabaseArgs {
    /**
     * The subnets to use for the RDS instance and Fargate task.
     */
    subnetIds: pulumi.Input<string>[];
    /**
     * The security groups to use for the RDS instance and Fargate task.
     */
    securityGroupIds: pulumi.Input<string>[];
    /**
     * A hosted zone name in which to provision DNS records.
     */
    hostedZoneName: string;
    /**
     * The domain name on which to serve Metabase.  Must be a subdomain of the hostedZoneId.
     */
    domainName: pulumi.Input<string>;
}

// The default port that the `metabase/metabase` Docker image exposes it's HTTP endpoint.
const metabasePort = 3000;

/**
 * An instance of Metabase with a hosted MySQL database.
 */
export class Metabase extends pulumi.ComponentResource {
    dnsName: pulumi.Output<string>;

    constructor(name: string, args: MetabaseArgs, opts?: pulumi.ComponentResourceOptions) {
        super("pulumi:service:Metabase", name, {}, opts);

        // Aurora Serverless MySQL for Metabase query/dashboard state
        const metabasePassword = new random.RandomString(`${name}metabase`, {
            special: false,
            length: 20,
        }, { parent: this });
        const metabaseMysqlSubnetGroup = new aws.rds.SubnetGroup(`${name}metabase`, {
            subnetIds: args.subnetIds,
        }, { parent: this });
        const metabaseMysqlCluster = new aws.rds.Cluster(`${name}metabase`, {
            clusterIdentifier: `${name}metabasemysql`,
            databaseName: "metabase",
            masterUsername: "pulumi",
            masterPassword: metabasePassword.result,
            engine: "aurora",
            engineMode: "serverless",
            engineVersion: "5.6.10a",
            dbSubnetGroupName: metabaseMysqlSubnetGroup.name,
            vpcSecurityGroupIds: args.securityGroupIds,
            finalSnapshotIdentifier: `${name}metabasefinalsnapshot`,
        }, { parent: this });

        // DNS and Certificates for desired endpoint.
        const certificate = new aws.acm.Certificate(`${name}metabase`, {
            domainName: args.domainName,
            validationMethod: "DNS",
        }, { parent: this });
        const hostedZoneId = aws.route53.getZone({ name: args.hostedZoneName }, { parent: this }).then(zone => zone.id);
        const certificateValidationRecord = new aws.route53.Record(`${name}metabase-certvalidation`, {
            name: certificate.domainValidationOptions.apply(opt => opt[0].resourceRecordName),
            type: certificate.domainValidationOptions.apply(opt => opt[0].resourceRecordType),
            zoneId: hostedZoneId,
            records: [certificate.domainValidationOptions.apply(opt => opt[0].resourceRecordValue)],
            ttl: 60,
        }, { parent: this });
        const certificateValidation = new aws.acm.CertificateValidation(`${name}metabase`, {
            certificateArn: certificate.arn,
            validationRecordFqdns: [certificateValidationRecord.fqdn],
        }, { parent: this });

        // Stable load balancer endpoint (no other way to get a consistent IP for an ECS service!!!)
        const vpcId = pulumi.output(args.subnetIds[0]).apply(async subnetId => {
            const res = await aws.ec2.getSubnet({ id: subnetId }, { parent: this });
            return res.vpcId;
        });

        const vpc = awsx.ec2.Vpc.fromExistingIds("meta", {
            vpcId: vpcId,
            publicSubnetIds: args.subnetIds,
        });

        const loadbalancerSecurityGroup = new awsx.ec2.SecurityGroup(`${name}metabase`, {
            vpc,
            ingress: [{
                // Allow any access on HTTPS
                protocol: "tcp",
                toPort: 443,
                fromPort: 443,
                cidrBlocks: ["0.0.0.0/0"],
            }, {
                // And on HTTP to be redirected to HTTPS
                protocol: "tcp",
                toPort: 80,
                fromPort: 80,
                cidrBlocks: ["0.0.0.0/0"],
            }],
        }, { parent: this });

        // Send requests only to the port that the Metabase container is serving in the target security group
        for (let i = 0, n = args.securityGroupIds.length; i < n; i++) {
            const id = args.securityGroupIds[i];
            loadbalancerSecurityGroup.createEgressRule(`${name}metabase-egress-${i}`, {
                protocol: "tcp",
                toPort: metabasePort,
                fromPort: metabasePort,
                sourceSecurityGroupId: id,
            });
        }

        const loadbalancer = new awsx.elasticloadbalancingv2.ApplicationLoadBalancer(`${name}metabase`, {
            subnets: args.subnetIds,
            securityGroups: [loadbalancerSecurityGroup],
        }, { parent: this });

        const targetgroup = loadbalancer.createTargetGroup(`${name}metabase`, {
            targetType: "ip",
            port: metabasePort,
            protocol: "HTTP",
        });

        const listener = targetgroup.createListener(`${name}metabase`, {
            port: 443,
            protocol: "HTTPS",
            certificateArn: certificate.arn,
            // Require the use of SSL/TLS v1.2 or higher to connect.
            sslPolicy: "ELBSecurityPolicy-TLS-1-2-2017-01",
        }, { dependsOn: certificateValidation });

        const httpRedirectListener = loadbalancer.createListener(`${name}metabase-redirecthttp`, {
            port: 80,
            protocol: "HTTP",
            defaultAction: {
                type: "redirect",
                redirect: {
                    protocol: "HTTPS",
                    port: "443",
                    statusCode: "HTTP_301",
                },
            },
        });

        // Fargate Service to run Metabase
        const metabaseCluster = new awsx.ecs.Cluster(`${name}metabase`, {}, { parent: this });
        const metabaseExecutionRole = aws.iam.Role.get(`${name}metabase`, "ecsTaskExecutionRole", {}, { parent: this });
        const regionName = aws.getRegion({}, { parent: this}).then(r => r.name);
        function metabaseContainer(cluster: aws.rds.Cluster): Record<string, awsx.ecs.Container> {
            const allProps = pulumi.all([
                cluster.endpoint, cluster.masterUsername, cluster.masterPassword,
                cluster.port, cluster.databaseName]);

            return { "metabase": {
                image: "metabase/metabase",
                portMappings: [listener],
                environment: allProps.apply(([hostname, username, password, port, dbName]) => <aws.ecs.KeyValuePair[]>[
                    { name: "JAVA_TIMEZONE", value: "US/Pacific" },
                    { name: "MB_DB_TYPE", value: "mysql" },
                    { name: "MB_DB_DBNAME", value: dbName },
                    { name: "MB_DB_PORT", value: port },
                    { name: "MB_DB_USER", value: username },
                    { name: "MB_DB_PASS", value: password },
                    { name: "MB_DB_HOST", value: hostname },
                ]),
                logConfiguration: regionName.then(region => <aws.ecs.LogConfiguration>({
                    logDriver: "awslogs",
                    options: {
                        "awslogs-group": "/ecs/metabase",
                        "awslogs-region": region,
                        "awslogs-stream-prefix": "ecs",
                    },
                })),
            }};
        }
        const metabaseTaskDefinition = new awsx.ecs.FargateTaskDefinition(`${name}metabase`, {
            // family: "metabase",
            cpu: "2048",
            memory: "4096",
            executionRole: metabaseExecutionRole,
            containers: metabaseContainer(metabaseMysqlCluster),
        }, { parent: this });

        const metabaseService = metabaseTaskDefinition.createService(`${name}metabase`, {
            cluster: metabaseCluster,
            // We want only one instance connected to our database...
            desiredCount: 1,
            deploymentMaximumPercent: 100,
            // ...and are okay with allowing downtime during deployments to achieve this.
            deploymentMinimumHealthyPercent: 0,
            securityGroups: args.securityGroupIds,
            assignPublicIp: true,
            subnets: args.subnetIds,
        }, { parent: this });

        // Add DNS record for public endpoint
        const metabaseDnsRecord = new aws.route53.Record(`${name}metabase`, {
            zoneId: hostedZoneId,
            type: "A",
            name: args.domainName, // "metabase.corp." + "pulumi-test.io",
            aliases: [{
                name: loadbalancer.loadBalancer.dnsName,
                zoneId: loadbalancer.loadBalancer.zoneId,
                evaluateTargetHealth: true,
            }],
        }, { parent: this });

        this.dnsName = metabaseDnsRecord.name.apply(dnsName => `https://${dnsName}`);
    }
}

export const vpc = awsx.ec2.Vpc.getDefault();
export const securityGroup = new awsx.ec2.SecurityGroup("testing", { vpc });

export const metabase = new Metabase("test", {
    hostedZoneName: "pulumi-test.io",
    domainName: "metabase.corp.pulumi-test.io",
    securityGroupIds: [securityGroup.id],
    subnetIds: vpc.publicSubnetIds,
});
