import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const result = spawnSync('pulumi', ['package', 'get-schema', '.'], {
  cwd: packageDirectory,
  encoding: 'utf8',
});

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const schema = JSON.parse(result.stdout);
const token = 'awsx-next:index:ExampleComponent';
const component = schema.resources?.[token];

assert.equal(schema.name, 'awsx-next');
assert.ok(component, `schema does not contain ${token}`);
assert.deepEqual(component.requiredInputs, ['message']);
assert.deepEqual(component.required, ['message']);
assert.equal(component.inputProperties.message.type, 'string');
assert.equal(component.properties.message.type, 'string');

console.log(`Validated source-based plugin schema for ${token}.`);
