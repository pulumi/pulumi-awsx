import * as pulumi from '@pulumi/pulumi';
import { ApplicationProtocolVersion } from '../../../src/ecs/fargate/serviceLoadBalancer';
import {
  validateListenerRulePriorities,
  validateTargetProtocolVersion,
} from '../../../src/ecs/fargate/serviceLoadBalancerValidation';

it('rejects two attachments using the same listener and priority', () => {
  expect(() =>
    validateListenerRulePriorities([
      { attachmentName: 'api', listenerArn: 'listener', priority: 10 },
      { attachmentName: 'admin', listenerArn: 'listener', priority: 10 },
    ]),
  ).toThrow(
    expect.objectContaining({
      propertyPath: 'loadBalancer.admin.application.priority',
      message: expect.stringContaining('Attachments "api" and "admin" both use priority 10'),
    }),
  );
});

it('allows different priorities on one listener and reusing a priority on another listener', () => {
  expect(() =>
    validateListenerRulePriorities([
      { attachmentName: 'api', listenerArn: 'public', priority: 10 },
      { attachmentName: 'admin', listenerArn: 'public', priority: 20 },
      { attachmentName: 'internal', listenerArn: 'private', priority: 10 },
    ]),
  ).not.toThrow();
});

it.each([ApplicationProtocolVersion.HTTP_2, ApplicationProtocolVersion.GRPC])(
  'rejects %s behind an HTTP listener with the attachment input path',
  (version) => {
    expect(() =>
      validateTargetProtocolVersion(
        version,
        'HTTP',
        'loadBalancer.app.application.targetProtocolVersion',
      ),
    ).toThrow(
      new pulumi.InputPropertyError({
        propertyPath: 'loadBalancer.app.application.targetProtocolVersion',
        reason: 'HTTP_2 and GRPC require an HTTPS listener',
      }),
    );
  },
);

it.each([
  { version: undefined, listenerProtocol: 'HTTP' },
  { version: ApplicationProtocolVersion.HTTP_1, listenerProtocol: 'HTTP' },
  { version: ApplicationProtocolVersion.HTTP_1, listenerProtocol: 'HTTPS' },
  { version: ApplicationProtocolVersion.HTTP_2, listenerProtocol: 'HTTPS' },
  { version: ApplicationProtocolVersion.GRPC, listenerProtocol: 'HTTPS' },
])('allows backend $version behind $listenerProtocol', ({ version, listenerProtocol }) => {
  expect(() =>
    validateTargetProtocolVersion(
      version,
      listenerProtocol,
      'loadBalancer.app.application.targetProtocolVersion',
    ),
  ).not.toThrow();
});
