import * as pulumi from '@pulumi/pulumi';

/**
 * Arguments for {@link ExampleComponent}.
 */
export interface ExampleComponentArgs {
  /**
   * A value that the component exposes as an output.
   */
  message: pulumi.Input<string>;
}

/**
 * A minimal component that verifies source-based plugin discovery and schema inference.
 */
export class ExampleComponent extends pulumi.ComponentResource {
  /**
   * The component message.
   */
  public readonly message: pulumi.Output<string>;

  public constructor(
    name: string,
    args: ExampleComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('awsx-experimental:index:ExampleComponent', name, args, opts);

    this.message = pulumi.output(args.message);

    this.registerOutputs({
      message: this.message,
    });
  }
}
