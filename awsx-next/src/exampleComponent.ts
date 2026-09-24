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
 * A temporary component that verifies source-based plugin discovery and schema inference.
 *
 * The next PR replaces this component with the first AWSX component implementation.
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
    super('awsx-next:index:ExampleComponent', name, args, opts);

    this.message = pulumi.output(args.message);

    this.registerOutputs({
      message: this.message,
    });
  }
}
