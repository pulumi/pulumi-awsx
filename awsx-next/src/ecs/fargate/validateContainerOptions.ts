import * as pulumi from '@pulumi/pulumi';
import type { FargateContainerDefinitionOptions } from './containerDefinition';

/**
 * Validates the AWSX container configuration before rendering Native inputs.
 *
 * @param options The container configuration.
 * @param path The container's input property path.
 */
export function validateContainerOptions(
  options: FargateContainerDefinitionOptions,
  path: string,
): void {
  if (
    options.memoryMiB !== undefined &&
    options.memoryReservationMiB !== undefined &&
    options.memoryMiB <= options.memoryReservationMiB
  ) {
    throw new pulumi.InputPropertyError({
      propertyPath: `${path}.memoryMiB`,
      reason: 'memoryMiB must be greater than memoryReservationMiB',
    });
  }

  const health = options.healthCheck;
  if (health) {
    if (!health.command?.length || !['CMD', 'CMD-SHELL'].includes(health.command[0]!)) {
      throw new pulumi.InputPropertyError({
        propertyPath: `${path}.healthCheck.command`,
        reason: 'healthCheck.command must not be empty and must start with CMD or CMD-SHELL',
      });
    }
    for (const [property, minimum, maximum] of [
      ['intervalSeconds', 5, 300],
      ['retries', 1, 10],
      ['startPeriodSeconds', 0, 300],
      ['timeoutSeconds', 2, 60],
    ] as const) {
      const value = health[property];
      if (value !== undefined && (!Number.isInteger(value) || value < minimum || value > maximum)) {
        throw new pulumi.InputPropertyError({
          propertyPath: `${path}.healthCheck.${property}`,
          reason: `${property} must be an integer between ${minimum} and ${maximum}; got ${value}`,
        });
      }
    }
  }

  options.portMappings?.forEach((mapping, index) => {
    const propertyPath = `${path}.portMappings[${index}]`;
    if ((mapping.containerPort !== undefined) === (mapping.containerPortRange !== undefined)) {
      throw new pulumi.InputPropertyError({
        propertyPath,
        reason: 'Exactly one of containerPort or containerPortRange must be provided',
      });
    }
    if (
      mapping.containerPort !== undefined &&
      (mapping.containerPort < 1 || mapping.containerPort > 65535)
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: `${propertyPath}.containerPort`,
        reason: `containerPort must be between 1 and 65535; got ${mapping.containerPort}`,
      });
    }
    const range = mapping.containerPortRange;
    if (
      range &&
      (!Number.isFinite(range.start) ||
        !Number.isFinite(range.end) ||
        range.start < 1 ||
        range.end > 65535 ||
        range.start >= range.end)
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: `${propertyPath}.containerPortRange`,
        reason:
          'containerPortRange must contain values between 1 and 65535 with start less than end',
      });
    }
  });
}
