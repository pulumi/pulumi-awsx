import * as pulumi from '@pulumi/pulumi';
import {
  ApplicationProtocolVersion,
  createApplicationServiceAttachment,
} from '../../../src/ecs/fargate/serviceLoadBalancer';

// Pulumi's mock runtime is shared within a test file. Keep preview mode and unknown
// outputs isolated from the deployment-mode mocks in serviceLoadBalancer.test.ts.
const registrations: pulumi.runtime.MockResourceArgs[] = [];

beforeAll(async () => {
  await pulumi.runtime.setMocks(
    {
      newResource(args) {
        registrations.push(args);
        return {
          id: args.id || args.name,
          state: args.id
            ? { arn: 'listener', loadBalancerArn: 'alb', protocol: pulumi.runtime.unknownValue }
            : { ...args.inputs, arn: args.name },
        };
      },
      call(args) {
        return { ...args.inputs, vpcId: 'vpc', securityGroups: ['sg-alb'] };
      },
    },
    'project',
    'stack',
    true,
  );
});

it('declares the target group and rule even when the listener protocol is unknown in preview', async () => {
  const children: pulumi.Resource[] = [];
  const parent = new pulumi.ComponentResource(
    'test:index:Service',
    'service',
    {},
    {
      transformations: [
        (args): undefined => {
          if (args.type.startsWith('aws:')) children.push(args.resource);
          return undefined;
        },
      ],
    },
  );
  createApplicationServiceAttachment(
    'service',
    'app',
    {
      containerName: 'app',
      containerPort: 3000,
      targetProtocolVersion: ApplicationProtocolVersion.HTTP_2,
      listenerArn: 'listener',
      priority: 10,
      match: { methods: ['GET'] },
    },
    { parent },
  );

  // Resource declarations are synchronous; resolving protocol validation never creates children.
  expect(children).toHaveLength(3);
  await Promise.all(children.map((child) => new Promise((done) => child.urn.apply(done))));
  expect(
    registrations
      .filter((args) => args.type.startsWith('aws:'))
      .map(({ type, name }) => ({ type, name })),
  ).toEqual([
    { type: 'aws:lb/listener:Listener', name: 'service-app-existing-listener' },
    { type: 'aws:lb/targetGroup:TargetGroup', name: 'service-app-target-main' },
    { type: 'aws:lb/listenerRule:ListenerRule', name: 'service-app-listener-rule' },
  ]);
});
