import { validateContainerOptions } from '../../../src/ecs/fargate/validateContainerOptions';
import type { FargateContainerDefinitionOptions } from '../../../src/ecs/fargate/containerDefinition';

// These invariants used to live on the removed raw ContainerDefinition resource.
describe('AWSX container validation', () => {
  test.each<[Partial<FargateContainerDefinitionOptions>, string]>([
    [{ memoryMiB: 128, memoryReservationMiB: 128 }, 'memoryMiB'],
    [{ healthCheck: { command: [] } }, 'healthCheck.command'],
    [{ healthCheck: { command: ['curl'] } }, 'healthCheck.command'],
    [
      { healthCheck: { command: ['CMD', 'true'], intervalSeconds: 4 } },
      'healthCheck.intervalSeconds',
    ],
    [
      { healthCheck: { command: ['CMD', 'true'], intervalSeconds: 301 } },
      'healthCheck.intervalSeconds',
    ],
    [{ healthCheck: { command: ['CMD', 'true'], retries: 11 } }, 'healthCheck.retries'],
    [
      { healthCheck: { command: ['CMD', 'true'], startPeriodSeconds: -1 } },
      'healthCheck.startPeriodSeconds',
    ],
    [
      { healthCheck: { command: ['CMD', 'true'], timeoutSeconds: 1 } },
      'healthCheck.timeoutSeconds',
    ],
    [{ portMappings: [{ containerPort: 0 }] }, 'portMappings[0].containerPort'],
    [{ portMappings: [{ containerPort: 65536 }] }, 'portMappings[0].containerPort'],
    [{ portMappings: [{}] }, 'portMappings[0]'],
    [
      { portMappings: [{ containerPort: 80, containerPortRange: { start: 80, end: 90 } }] },
      'portMappings[0]',
    ],
    [
      { portMappings: [{ containerPortRange: { start: 0, end: 90 } }] },
      'portMappings[0].containerPortRange',
    ],
    [
      { portMappings: [{ containerPortRange: { start: 90, end: 90 } }] },
      'portMappings[0].containerPortRange',
    ],
  ])('reports the AWSX input path for invalid configuration %j', (options, property) => {
    expect(() =>
      validateContainerOptions({ image: 'nginx', ...options }, 'containers.app'),
    ).toThrow(expect.objectContaining({ propertyPath: `containers.app.${property}` }));
  });

  test('accepts valid health, memory, and port boundaries', () => {
    expect(() =>
      validateContainerOptions(
        {
          image: 'nginx',
          memoryMiB: 256,
          memoryReservationMiB: 128,
          healthCheck: {
            command: ['CMD-SHELL', 'true'],
            intervalSeconds: 300,
            retries: 10,
            startPeriodSeconds: 0,
            timeoutSeconds: 60,
          },
          portMappings: [{ containerPort: 1 }, { containerPortRange: { start: 2, end: 65535 } }],
        },
        'containers.app',
      ),
    ).not.toThrow();
  });
});
