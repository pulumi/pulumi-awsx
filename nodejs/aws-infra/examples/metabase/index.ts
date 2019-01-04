// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsinfra from "@pulumi/aws-infra";
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
        // const certificateValidation = new aws.acm.CertificateValidation(`${name}metabase`, {
        //     certificateArn: certificate.arn,
        //     validationRecordFqdns: [certificateValidationRecord.fqdn],
        // }, { parent: this });

        // Stable load balancer endpoint (no other way to get a consistent IP for an ECS service!!!)
        const vpcId = pulumi.output(args.subnetIds[0]).apply(async subnetId => {
            const res = await aws.ec2.getSubnet({ id: subnetId }, { parent: this });
            return res.vpcId;
        });
        const loadbalancerSecurityGroup = new aws.ec2.SecurityGroup(`${name}metabase`, {
            vpcId: vpcId,
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
            egress: [{
                // Send requests only to the port that the Metabase container is serving in the target security group
                protocol: "tcp",
                toPort: metabasePort,
                fromPort: metabasePort,
                securityGroups: args.securityGroupIds,
            }],
        }, { parent: this });
        const loadbalancer = new aws.elasticloadbalancingv2.LoadBalancer(`${name}metabase`, {
            loadBalancerType: "application",
            subnets: args.subnetIds,
            securityGroups: [loadbalancerSecurityGroup.id],
        }, { parent: this });
        const targetgroup = new aws.elasticloadbalancingv2.TargetGroup(`${name}metabase`, {
            targetType: "ip",
            port: metabasePort,
            protocol: "HTTP",
            vpcId: vpcId,
        }, { parent: this });
        const listener = new aws.elasticloadbalancingv2.Listener(`${name}metabase`, {
            loadBalancerArn: loadbalancer.arn,
            port: 8080,
            protocol: "HTTP",
            // certificateArn: certificate.arn,
            defaultAction: {
                type: "forward",
                targetGroupArn: targetgroup.arn,
            },
            // Require the use of SSL/TLS v1.2 or higher to connect.
            // sslPolicy: "ELBSecurityPolicy-TLS-1-2-2017-01",
        }, { parent: this });
        const httpRedirectListener = new aws.elasticloadbalancingv2.Listener(`${name}metabase-redirecthttp`, {
            loadBalancerArn: loadbalancer.arn,
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
        }, { parent: this });

        // Fargate Service to run Metabase
        const metabaseCluster = new aws.ecs.Cluster(`${name}metabase`, {}, { parent: this });
        const metabaseExecutionRole = aws.iam.Role.get(`${name}metabase`, "ecsTaskExecutionRole", {}, { parent: this });
        const regionName = aws.getRegion({}, { parent: this}).then(r => r.name);
        function metabaseContainer(cluster: aws.rds.Cluster): pulumi.Output<string> {
            return pulumi
                .all([
                    cluster.endpoint, cluster.masterUsername, cluster.masterPassword,
                    cluster.port, cluster.databaseName, regionName])
                .apply(([hostname, username, password, port, dbName, region]) => JSON.stringify([{
                    name: "metabase",
                    image: "metabase/metabase",
                    portMappings: [{ containerPort: metabasePort }],
                    environment: [
                        { name: "JAVA_TIMEZONE", value: "US/Pacific" },
                        { name: "MB_DB_TYPE", value: "mysql" },
                        { name: "MB_DB_DBNAME", value: dbName },
                        { name: "MB_DB_PORT", value: port },
                        { name: "MB_DB_USER", value: username },
                        { name: "MB_DB_PASS", value: password },
                        { name: "MB_DB_HOST", value: hostname },
                    ],
                    logConfiguration: {
                        logDriver: "awslogs",
                        options: {
                            "awslogs-group": "/ecs/metabase",
                            "awslogs-region": region,
                            "awslogs-stream-prefix": "ecs",
                        },
                    },
                }]));
        }
        const metabaseTaskDefintion = new aws.ecs.TaskDefinition(`${name}metabase`, {
            family: "metabase",
            cpu: "2048",
            memory: "4096",
            requiresCompatibilities: ["FARGATE"],
            networkMode: "awsvpc",
            executionRoleArn: metabaseExecutionRole.arn,
            containerDefinitions: metabaseContainer(metabaseMysqlCluster),
        }, { parent: this });
        const metabaseService = new aws.ecs.Service(`${name}metabase`, {
            cluster: metabaseCluster.arn,
            taskDefinition: metabaseTaskDefintion.arn,
            // We want only one instance connected to our database...
            desiredCount: 1,
            deploymentMaximumPercent: 100,
            // ...and are okay with allowing downtime during deployments to achieve this.
            deploymentMinimumHealthyPercent: 0,
            networkConfiguration: {
                // We don't actualy technically need/want a public IP, but need one to be able to access DockerHub when
                // running in a public subnet (without a NAT).
                assignPublicIp: true,
                subnets: args.subnetIds,
                securityGroups: args.securityGroupIds,
            },
            launchType: "FARGATE",
            loadBalancers: [{
                containerName: "metabase",
                containerPort: metabasePort,
                targetGroupArn: targetgroup.arn,
            }],
        }, { parent: this, dependsOn: [targetgroup, listener, loadbalancer] });

        // Add DNS record for public endpoint
        const metabaseDnsRecord = new aws.route53.Record(`${name}metabase`, {
            zoneId: hostedZoneId,
            type: "A",
            name: args.domainName, // "metabase.corp." + "pulumi-test.io",
            aliases: [{
                name: loadbalancer.dnsName,
                zoneId: loadbalancer.zoneId,
                evaluateTargetHealth: true,
            }],
        }, { parent: this });

        this.dnsName = metabaseDnsRecord.name.apply(dnsName => `https://${dnsName}`);
    }
}

export const vpc = awsinfra.x.ec2.Vpc.getDefault();
export const securityGroup = new awsinfra.x.ec2.SecurityGroup("testing", { vpc });
securityGroup.createIngressRule("test-ingress", {
    cidrBlocks: ["0.0.0.0/0"],
    protocol: "tcp",
    fromPort: 80,
    toPort: 80,
});

export const metabase = new Metabase("test", {
    hostedZoneName: "cyrus.moolumi.io",
    domainName: "metabase.corp.cyrus.moolumi.io",
    securityGroupIds: [securityGroup.id],
    subnetIds: vpc.publicSubnetIds,
});
