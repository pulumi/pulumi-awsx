import * as pulumi from '@pulumi/pulumi';
import {
  ApplicationProtocolVersion,
  createApplicationServiceAttachment,
} from '../../../src/ecs/fargate/serviceLoadBalancer';
import { FargateServiceV2 } from '../../../src/ecs/fargate/service';
import { DeploymentStrategy } from '../../../src/ecs/fargate/serviceDeployment';

// Pulumi's mock runtime is shared within a test file. Keep preview mode and unknown
// outputs isolated from the deployment-mode mocks in serviceLoadBalancer.test.ts.
const registrations: pulumi.runtime.MockResourceArgs[] = [];

beforeAll(async () => {
  await pulumi.runtime.setMocks(
    {
      newResource(args) {
        registrations.push(args);
        return {
          id: args.name,
          state: { ...args.inputs, arn: args.name, ruleArn: args.name },
        };
      },
      call(args) {
        if (
          args.token === 'aws:index/getCallerIdentity:getCallerIdentity' ||
          args.token === 'aws-native:index:getAccountId'
        )
          return { accountId: '123456789012' };
        if (
          args.token === 'aws:index/getRegion:getRegion' ||
          args.token === 'aws-native:index:getRegion'
        )
          return { region: 'us-west-2' };
        return args.token === 'aws:lb/getListener:getListener'
          ? { ...args.inputs, loadBalancerArn: 'alb', protocol: pulumi.runtime.unknownValue }
          : { ...args.inputs, vpcId: 'vpc', securityGroups: pulumi.runtime.unknownValue };
      },
    },
    'project',
    'stack',
    true,
  );
});

beforeEach(() => {
  registrations.length = 0;
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
          if (args.type.startsWith('aws:') || args.type.startsWith('aws-native:'))
            children.push(args.resource);
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
  expect(children).toHaveLength(2);
  await Promise.all(children.map((child) => new Promise((done) => child.urn.apply(done))));
  expect(
    registrations
      .filter((args) => args.type.startsWith('aws:') || args.type.startsWith('aws-native:'))
      .map(({ type, name }) => ({ type, name })),
  ).toEqual([
    { type: 'aws:lb/targetGroup:TargetGroup', name: 'service-app-target-main' },
    { type: 'aws-native:elasticloadbalancingv2:ListenerRule', name: 'service-app-listener-rule' },
  ]);
});

it('declares progressive routing and IAM synchronously when ALB metadata is unknown', async () => {
  const children: pulumi.Resource[] = [];
  const owner = new pulumi.ComponentResource(
    'test:index:Service',
    'progressive-preview',
    {},
    {
      transformations: [
        (args): undefined => {
          if (args.type.startsWith('aws:') || args.type.startsWith('aws-native:'))
            children.push(args.resource);
          return undefined;
        },
      ],
    },
  );
  createApplicationServiceAttachment(
    'progressive-preview',
    'app',
    {
      containerName: 'app',
      containerPort: 3000,
      listenerArn: 'listener',
      priority: 25,
      testTraffic: { match: { methods: ['GET'] } },
    },
    { parent: owner, strategy: DeploymentStrategy.CANARY },
  );
  expect(children).toHaveLength(6);
  await Promise.all(children.map((child) => new Promise((done) => child.urn.apply(done))));
  expect(
    new Set(
      registrations
        .filter((args) => args.type.startsWith('aws:') || args.type.startsWith('aws-native:'))
        .map((args) => args.name),
    ),
  ).toEqual(
    new Set([
      'progressive-preview-app-target-main',
      'progressive-preview-app-target-alt',
      'progressive-preview-app-listener-rule',
      'progressive-preview-app-listener-rule-test',
      'progressive-preview-app-traffic-shift-role',
      'progressive-preview-app-traffic-shift-role-policy',
    ]),
  );
});

it('declares deduplicated service ingress synchronously when ALB source groups are unknown', async () => {
  const children: pulumi.Resource[] = [];
  new FargateServiceV2(
    'preview',
    {
      clusterArn: 'cluster',
      taskDefinition: 'task',
      vpcSubnetIds: ['subnet'],
      loadBalancerAttachments: {
        api: {
          application: {
            listenerArn: 'listener',
            containerName: 'app',
            containerPort: 3000,
            targetHealthCheck: { port: 3001 },
            priority: 10,
          },
        },
        admin: {
          application: {
            listenerArn: 'listener',
            containerName: 'app',
            containerPort: 3000,
            targetHealthCheck: { port: 3001 },
            priority: 20,
          },
        },
      },
    },
    {
      transformations: [
        (args): undefined => {
          if (args.type.startsWith('aws:') || args.type.startsWith('aws-native:'))
            children.push(args.resource);
          return undefined;
        },
      ],
    },
  );
  // Unknown source IDs affect inputs, never the number or identity of declared rules.
  expect(children).toHaveLength(9);
  await Promise.all(children.map((child) => new Promise((done) => child.urn.apply(done))));
  expect(
    registrations
      .filter((args) => args.type === 'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule')
      .map(({ name }) => name),
  ).toEqual(['preview-ingress-3000', 'preview-ingress-3001']);
});
