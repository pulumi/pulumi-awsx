import * as pulumi from '@pulumi/pulumi';

import { ExampleComponent } from '../index';

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

describe('ExampleComponent', () => {
  test('registers its input and output', async () => {
    const component = new ExampleComponent('example', {
      message: pulumi.output('hello'),
    });

    await expect(unwrap(component.message)).resolves.toBe('hello');
    await unwrap(component.urn);

    expect(
      resources.map(({ type, name, custom, inputs }) => ({ type, name, custom, inputs })),
    ).toEqual([
      {
        type: 'awsx-experimental:index:ExampleComponent',
        name: 'example',
        custom: false,
        inputs: { message: 'hello' },
      },
    ]);
  });
});
