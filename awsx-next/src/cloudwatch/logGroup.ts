import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { ComponentIdentity } from '../componentIdentity';

export interface LogGroupReference {
  readonly name: pulumi.Output<string>;
  readonly arn: pulumi.Output<string>;
  readonly region: pulumi.Output<string>;
}
export interface LogGroupArgs {
  existingLogGroupName?: pulumi.Input<string>;
}
export class LogGroup extends pulumi.ComponentResource<LogGroupReference> {
  public readonly name: pulumi.Output<string>;
  public readonly region: pulumi.Output<string>;
  public readonly arn: pulumi.Output<string>;
  constructor(
    name: string,
    args: LogGroupArgs,
    opts: pulumi.ComponentResourceOptions = {},
    /**
     * @internal
     */
    identity: ComponentIdentity = {
      type: 'awsx-experimental:index:LogGroup',
      aliases: [{ type: 'awsx:cloudwatch/logGroup:LogGroup' }],
    },
  ) {
    const inputs = opts.urn ? { name: undefined } : { name, args, opts };
    super(
      identity.type,
      name,
      inputs,
      pulumi.mergeOptions(opts, {
        aliases: identity.aliases,
      }),
    );
    const data = pulumi.output(this.getData());
    this.name = data.name;
    this.region = data.region;
    this.arn = data.arn;
    this.registerOutputs({
      name: this.name,
      region: this.region,
      arn: this.arn,
    });
  }

  /**
   * Creates or reads the underlying CloudWatch log group.
   *
   * @param props The resolved component inputs.
   * @param props.name The Pulumi resource name.
   * @param props.args The log group arguments.
   * @param props.opts The component resource options.
   * @returns A reference to the CloudWatch log group.
   */
  protected override async initialize(props: {
    name: string;
    args: LogGroupArgs;
    opts?: pulumi.ComponentResourceOptions;
  }): Promise<LogGroupReference> {
    if (props.args.existingLogGroupName) {
      const logGroup = aws.cloudwatch.LogGroup.get(
        props.name,
        props.args.existingLogGroupName,
        undefined,
        {
          parent: this,
        },
      );
      return {
        name: logGroup.name,
        region: logGroup.region,
        arn: logGroup.arn,
      };
    }

    const logGroup = new aws.cloudwatch.LogGroup(props.name, {}, { parent: this });

    return {
      name: logGroup.name,
      region: logGroup.region,
      arn: logGroup.arn,
    };
  }
}
