import * as pulumi from '@pulumi/pulumi';
import { ComponentIdentity } from '../componentIdentity';
import * as aws from '@pulumi/aws';

export const albStandaloneIdentity: ComponentIdentity = {
  type: 'awsx-next:index:ApplicationLoadBalancerV2',
  aliases: [],
};

export interface ApplicationLoadBalancerV2Args {
  /**
   * The subnets to associate with the ALB
   */
  readonly vpcSubnetIds: pulumi.Input<pulumi.Input<string>[]>;

  /**
   * The security groups to associate with the ALB. If you do not specify a security group, a new
   * security group is created.
   *
   * Default - A new security group is created.
   */
  readonly securityGroupIds?: pulumi.Input<string>[];
}

export class ApplicationLoadBalancerV2 extends pulumi.ComponentResource {
  declare public readonly loadBalancer: aws.alb.LoadBalancer;
  declare public readonly securityGroups: aws.ec2.SecurityGroup[];
  constructor(
    name: string,
    args: ApplicationLoadBalancerV2Args,
    opts: pulumi.ComponentResourceOptions = {},
    /**
     * @internal
     */
    identity: ComponentIdentity = albStandaloneIdentity,
  ) {
    const inputs = opts.urn ? {} : args;
    super(identity.type, name, inputs, pulumi.mergeOptions(opts, { aliases: identity.aliases }));

    const firstSubnetId = pulumi.output(args.vpcSubnetIds).apply((subnets) => {
      const id = subnets[0];
      if (id === undefined) {
        throw new pulumi.InputPropertyError({
          propertyPath: 'vpcSubnets',
          reason: 'At least one subnet must be provided',
        });
      }
      return id;
    });

    const subnet = aws.ec2.getSubnetOutput({ id: firstSubnetId }, { parent: this });
    const vpcId = subnet.vpcId;

    if (args.securityGroupIds) {
      this.securityGroups = args.securityGroupIds.flatMap((id, idx) => {
        return aws.ec2.SecurityGroup.get(`${name}-security-group-${idx}`, id, undefined, {
          parent: this,
        });
      });
    } else {
      const securityGroup = new aws.ec2.SecurityGroup(
        `${name}-security-group`,
        {
          vpcId,
        },
        { parent: this },
      );
      // By default AWS always creates an egress all rule when a security group is created.
      // The Terraform provider removes that egress-all rule and make you add it yourself
      new aws.vpc.SecurityGroupEgressRule(
        `${name}-security-group-egress-all`,
        {
          ipProtocol: '-1',
          securityGroupId: securityGroup.id,
          cidrIpv4: '0.0.0.0/0',
          fromPort: 0,
          toPort: 0,
        },
        { parent: this },
      );
      this.securityGroups = [securityGroup];
    }

    this.loadBalancer = new aws.alb.LoadBalancer(
      name,
      {
        securityGroups: this.securityGroups.flatMap((sg) => sg.id),
        loadBalancerType: 'application',
        subnets: args.vpcSubnetIds,
      },
      { parent: this },
    );

    this.registerOutputs({
      securityGroups: this.securityGroups,
      loadBalancer: this.loadBalancer,
    });
  }
}
