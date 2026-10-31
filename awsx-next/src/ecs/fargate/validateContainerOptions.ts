import * as pulumi from '@pulumi/pulumi';
import type { FargateContainerDefinitionOptions } from './containerDefinition';

/**
 * Validates restrictions specific to Fargate containers.
 *
 * @param options The container configuration.
 * @param path The input property path.
 */
export function validateFargateContainerOptions(
  options: FargateContainerDefinitionOptions,
  path: string,
): void {
  options.linuxParameters?.capabilities?.add?.forEach((capability, index) => {
    if (capability !== 'SYS_PTRACE') {
      throw new pulumi.InputPropertyError({
        propertyPath: `${path}.linuxParameters.capabilities.add[${index}]`,
        reason: 'Fargate supports adding only the SYS_PTRACE Linux capability',
      });
    }
  });
}
