// Copyright 2016-2026, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import * as pulumi from '@pulumi/pulumi';
import { ContainerDefinitionArgs, PortMapping } from './containerDefinitionArgs';
import { ComponentIdentity } from '../componentIdentity';

export const containerDefinitionStandaloneIdentity = {
  type: 'awsx-next:index:ContainerDefinition',
  aliases: [],
};

export const containerDefinitionAwsxIdentity = {
  type: 'awsx:experimental/ecs:ContainerDefinition',
  aliases: [],
};

interface ContainerDefinitionData {
  definition: ContainerDefinitionArgs;
}

/**
 * Represents one container definition used in an ECS Task Definition.
 *
 * The component provides a resource boundary where Pulumi resource transforms can modify the raw
 * container definition before a task definition serializes it.
 */
export class ContainerDefinition extends pulumi.ComponentResource<ContainerDefinitionData> {
  /**
   * The typed container definition. This can be combined with other container definitions and used
   * to construct the containerDefinition string value used in a TaskDefinition.
   */
  public readonly definition!: pulumi.Output<ContainerDefinitionArgs>;
  constructor(
    name: string,
    args: ContainerDefinitionArgs,
    opts: pulumi.ComponentResourceOptions = {},
    /**
     * @internal
     */
    identity: ComponentIdentity = containerDefinitionStandaloneIdentity,
    /**
     * @internal
     */
    remote = false,
  ) {
    validateContainerDefinition(args);

    super(
      identity.type,
      name,
      remote
        ? {
            ...args,
            definition: undefined,
          }
        : args,
      pulumi.mergeOptions(opts, {
        aliases: identity.aliases,
      }),
      remote,
    );

    if (!remote) {
      this.definition = pulumi.output(args);

      this.registerOutputs({
        definition: this.definition,
      });
    }
  }
}

/**
 * Validates a container definition.
 *
 * @param args The container definition to validate.
 */
function validateContainerDefinition(args: ContainerDefinitionArgs): void {
  validateCredentialSpecs(args.credentialSpecs);
  validateMemory(args);
  validateTimeout('startTimeout', args.startTimeout, 2, 120);
  validateTimeout('stopTimeout', args.stopTimeout, 2, 120);
  validateHealthCheck(args.healthCheck);
  validatePortMappings(args.portMappings);
}

/**
 * Validates the credential specifications.
 *
 * @param credentialSpecs The credential specifications to validate.
 */
function validateCredentialSpecs(
  credentialSpecs: ContainerDefinitionArgs['credentialSpecs'],
): void {
  if (credentialSpecs && credentialSpecs.length > 1) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'credentialSpecs',
      reason: 'Only one credential spec is allowed per container definition',
    });
  }
}

/**
 * Validates the container memory settings.
 *
 * @param args The container definition to validate.
 */
function validateMemory(args: ContainerDefinitionArgs): void {
  if (
    args.memory !== undefined &&
    args.memoryReservation !== undefined &&
    args.memory <= args.memoryReservation
  ) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'memory',
      reason: `memory must be greater than memoryReservation. Got memory: ${args.memory}; memoryReservation: ${args.memoryReservation}`,
    });
  }
}

/**
 * Validates a timeout value.
 *
 * @param propertyPath The input property path used in validation errors.
 * @param value The timeout value to validate.
 * @param minimum The minimum permitted value.
 * @param maximum The maximum permitted value.
 */
function validateTimeout(
  propertyPath: string,
  value: number | undefined,
  minimum: number,
  maximum: number,
): void {
  if (value !== undefined && (value < minimum || value > maximum)) {
    throw new pulumi.InputPropertyError({
      propertyPath,
      reason: `${propertyPath} must be between ${minimum} and ${maximum}; got ${value}`,
    });
  }
}

/**
 * Validates a container health check.
 *
 * @param healthCheck The health check to validate.
 */
function validateHealthCheck(healthCheck: ContainerDefinitionArgs['healthCheck']): void {
  if (!healthCheck) {
    return;
  }

  if (!healthCheck.command || healthCheck.command.length === 0) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'healthCheck.command',
      reason: 'healthCheck.command must not be empty',
    });
  }
  if (healthCheck.command[0] !== 'CMD' && healthCheck.command[0] !== 'CMD-SHELL') {
    throw new pulumi.InputPropertyError({
      propertyPath: 'healthCheck.command',
      reason: 'healthCheck.command must start with CMD or CMD-SHELL',
    });
  }

  validateIntegerRange('healthCheck.interval', healthCheck.interval, 5, 300);
  validateIntegerRange('healthCheck.retries', healthCheck.retries, 1, 10);
  validateIntegerRange('healthCheck.startPeriod', healthCheck.startPeriod, 0, 300);
  validateIntegerRange('healthCheck.timeout', healthCheck.timeout, 2, 60);
}

/**
 * Validates that an optional value is an integer in a permitted range.
 *
 * @param propertyPath The input property path used in validation errors.
 * @param value The value to validate.
 * @param minimum The minimum permitted value.
 * @param maximum The maximum permitted value.
 */
function validateIntegerRange(
  propertyPath: string,
  value: number | undefined,
  minimum: number,
  maximum: number,
): void {
  if (value !== undefined && (!Number.isInteger(value) || value < minimum || value > maximum)) {
    throw new pulumi.InputPropertyError({
      propertyPath,
      reason: `${propertyPath} must be an integer between ${minimum} and ${maximum}; got ${value}`,
    });
  }
}

/**
 * Validates container port mappings.
 *
 * @param mappings The port mappings to validate.
 */
function validatePortMappings(mappings: PortMapping[] | undefined): void {
  mappings?.forEach((mapping, index) => {
    const propertyPath = `portMappings[${index}]`;
    const hasPort = mapping.containerPort !== undefined;
    const hasRange = mapping.containerPortRange !== undefined;

    if (hasPort === hasRange) {
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

    if (mapping.containerPortRange !== undefined) {
      const [startText, endText, ...extra] = mapping.containerPortRange.split('-');
      const start = Number(startText);
      const end = Number(endText);
      if (
        extra.length > 0 ||
        startText === '' ||
        endText === '' ||
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 1 ||
        end > 65535 ||
        start >= end
      ) {
        throw new pulumi.InputPropertyError({
          propertyPath: `${propertyPath}.containerPortRange`,
          reason: `containerPortRange must contain values between 1 and 65535 with start less than end; got ${mapping.containerPortRange}`,
        });
      }
    }
  });
}
