import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const result = spawnSync('pulumi', ['package', 'get-schema', '.'], {
  cwd: packageDirectory,
  stdio: ['ignore', 'pipe', 'inherit'],
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const schema = JSON.parse(result.stdout);
assert.equal(schema.resources['awsx-next:index:ContainerDefinition'], undefined);
const taskOutputs = schema.resources['awsx-next:index:FargateTaskDefinitionV2'].properties;
assert.equal(taskOutputs.taskDefinition, undefined);
assert.equal(taskOutputs.taskDefinitionArn.type, 'string');
assert.equal(taskOutputs.family.type, 'string');
assert.equal(taskOutputs.revision.type, 'number');

// Raw ECS types previously collided with the AWSX types under the same tokens,
// replacing these fields with interval/startPeriod/timeout in generated SDKs.
const healthCheck = schema.types['awsx-next:index:HealthCheck'];
for (const property of ['intervalSeconds', 'startPeriodSeconds', 'timeoutSeconds']) {
  assert.ok(healthCheck.properties[property], `Missing AWSX health-check input ${property}`);
}
for (const property of ['interval', 'startPeriod', 'timeout']) {
  assert.equal(healthCheck.properties[property], undefined, `Leaked raw ECS input ${property}`);
}
assert.ok(healthCheck.required.includes('command'));
