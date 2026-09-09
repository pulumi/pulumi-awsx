import * as pulumi from '@pulumi/pulumi';

import { ContainerDefinition } from '../src/ecs/containerDefinition';

const resources: pulumi.runtime.MockResourceArgs[] = [];

beforeAll(async () => {
  await pulumi.runtime.setMocks({
    newResource(args) {
      resources.push(args);
      return {
        id: `${args.name}-id`,
        state: args.inputs,
      };
    },
    call(args) {
      return args.inputs;
    },
  });
});

beforeEach(() => {
  resources.length = 0;
});

/**
 * Resolves a Pulumi output for test assertions.
 *
 * @param output The output to resolve.
 * @returns The resolved output value.
 */
function unwrap<T>(output: pulumi.Output<T>): Promise<T> {
  return new Promise<T>((resolve) => output.apply(resolve));
}

describe('ContainerDefinition', () => {
  test('registers the standalone component and renders its definition', async () => {
    const component = new ContainerDefinition('container', {
      image: 'nginx',
      name: 'web',
    });

    await expect(unwrap(component.definitionJSON)).resolves.toBe('{"image":"nginx","name":"web"}');
    await unwrap(component.urn);

    expect(resources.map(({ type, name, custom }) => ({ type, name, custom }))).toEqual([
      {
        type: 'awsx-experimental:index:ContainerDefinition',
        name: 'container',
        custom: false,
      },
    ]);
  });

  test('rejects more than one credential spec', () => {
    expect(
      () =>
        new ContainerDefinition('container', {
          image: 'nginx',
          name: 'web',
          credentialSpecs: ['credentialspec:first', 'credentialspec:second'],
        }),
    ).toThrow('Only one credential spec is allowed per container definition');
  });

  test('rejects a hard memory limit that is not greater than the reservation', () => {
    expect(
      () =>
        new ContainerDefinition('container', {
          image: 'nginx',
          name: 'web',
          memory: 128,
          memoryReservation: 128,
        }),
    ).toThrow('memory must be greater than memoryReservation');
  });

  test.each([
    { property: 'startTimeout', value: 1 },
    { property: 'startTimeout', value: 121 },
    { property: 'stopTimeout', value: 1 },
    { property: 'stopTimeout', value: 121 },
  ] as const)('rejects $property=$value outside the supported range', ({ property, value }) => {
    expect(
      () =>
        new ContainerDefinition('container', {
          image: 'nginx',
          name: 'web',
          [property]: value,
        }),
    ).toThrow(`${property} must be between 2 and 120`);
  });

  test.each([
    { healthCheck: { command: [] }, error: 'healthCheck.command must not be empty' },
    {
      healthCheck: { command: ['curl', 'http://localhost'] },
      error: 'healthCheck.command must start with CMD or CMD-SHELL',
    },
    {
      healthCheck: { command: ['CMD', 'true'], interval: 4 },
      error: 'healthCheck.interval must be an integer between 5 and 300',
    },
    {
      healthCheck: { command: ['CMD', 'true'], retries: 11 },
      error: 'healthCheck.retries must be an integer between 1 and 10',
    },
    {
      healthCheck: { command: ['CMD', 'true'], startPeriod: -1 },
      error: 'healthCheck.startPeriod must be an integer between 0 and 300',
    },
    {
      healthCheck: { command: ['CMD', 'true'], timeout: 1 },
      error: 'healthCheck.timeout must be an integer between 2 and 60',
    },
  ])('rejects invalid health check values', ({ healthCheck, error }) => {
    expect(
      () => new ContainerDefinition('container', { image: 'nginx', name: 'web', healthCheck }),
    ).toThrow(error);
  });

  test.each([
    {
      portMappings: [{ containerPort: 0 }],
      error: 'containerPort must be between 1 and 65535',
    },
    {
      portMappings: [{ containerPort: 65536 }],
      error: 'containerPort must be between 1 and 65535',
    },
    {
      portMappings: [{ containerPort: 80, containerPortRange: '80-90' }],
      error: 'Exactly one of containerPort or containerPortRange must be provided',
    },
    {
      portMappings: [{}],
      error: 'Exactly one of containerPort or containerPortRange must be provided',
    },
    {
      portMappings: [{ containerPortRange: '0-90' }],
      error: 'containerPortRange must contain values between 1 and 65535',
    },
    {
      portMappings: [{ containerPortRange: '90-90' }],
      error: 'containerPortRange must contain values between 1 and 65535',
    },
    {
      portMappings: [{ containerPortRange: '100-90' }],
      error: 'containerPortRange must contain values between 1 and 65535',
    },
    {
      portMappings: [{ containerPortRange: '80-65536' }],
      error: 'containerPortRange must contain values between 1 and 65535',
    },
  ])('rejects invalid port mappings', ({ portMappings, error }) => {
    expect(
      () => new ContainerDefinition('container', { image: 'nginx', name: 'web', portMappings }),
    ).toThrow(error);
  });
});
