import * as pulumi from '@pulumi/pulumi';
import {
  ApplicationProtocolVersion,
  validateListenerRulePriorities,
  validateTargetProtocolVersion,
  resolveIngressSourceGroup,
} from '../../../src/ecs/fargate/serviceLoadBalancer';

it('reuses one source group when attachments request the same task port', () => {
  expect(
    resolveIngressSourceGroup(3000, [
      { attachmentName: 'api', sourceGroupId: 'sg-shared' },
      { attachmentName: 'admin', sourceGroupId: 'sg-shared' },
    ]),
  ).toBe('sg-shared');
});

it('rejects different source groups on the same port with manual-mode guidance', () => {
  expect(() =>
    resolveIngressSourceGroup(3000, [
      { attachmentName: 'public', sourceGroupId: 'sg-public' },
      { attachmentName: 'private', sourceGroupId: 'sg-private' },
    ]),
  ).toThrow(
    expect.objectContaining({
      propertyPath: 'manageIngress',
      message:
        'Cannot automatically configure ingress for port 3000 from multiple ALB security groups ' +
        '(attachments: public, private). Set manageIngress: false, supply securityGroupIds, and create ' +
        'the required standalone ingress rules independently of this component.',
    }),
  );
});

it('rejects two attachments using the same listener and priority', () => {
  expect(() =>
    validateListenerRulePriorities([
      { attachmentName: 'api', listenerArn: 'listener', priority: 10 },
      { attachmentName: 'admin', listenerArn: 'listener', priority: 10 },
    ]),
  ).toThrow(
    expect.objectContaining({
      propertyPath: 'loadBalancerAttachments.admin.application.priority',
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
        'loadBalancerAttachments.app.application.targetProtocolVersion',
      ),
    ).toThrow(
      new pulumi.InputPropertyError({
        propertyPath: 'loadBalancerAttachments.app.application.targetProtocolVersion',
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
      'loadBalancerAttachments.app.application.targetProtocolVersion',
    ),
  ).not.toThrow();
});
