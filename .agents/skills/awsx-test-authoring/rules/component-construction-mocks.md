---
title: Use Mocks For Component Construction
tags: pulumi-mocks, component, child-resources, providers, outputs
status: draft
---

## Rule

Use Pulumi runtime mocks when the behavior is which child resources a component
creates, what inputs it passes to them, what providers/options/regions it uses,
or what outputs it exposes. Do not use live AWS tests for component construction
logic.

## Why

AWSX components are imperative TypeScript constructors over schema-backed public
surface. The component contract is usually visible in Pulumi resource
registrations and outputs, so mocks can prove it quickly and deterministically.

## Avoid

Only asserting that construction does not throw:

```ts
new Repository("repo", { forceDelete: true }, {});
```

Only checking one constructor branch when the constructor also creates or
normalizes other child resources:

```ts
expect(task.networkMode).toEqual("bridge");
```

## Prefer

Record resource registrations and assert the exact child contract:

```ts
import * as pulumi from "@pulumi/pulumi";
import { Repository } from "./repository";

const resources: pulumi.runtime.MockResourceArgs[] = [];

beforeAll(async () => {
  await pulumi.runtime.setMocks({
    newResource(args) {
      resources.push(args);
      const state =
        args.type === "aws:ecr/repository:Repository"
          ? { ...args.inputs, name: args.inputs.name ?? args.name }
          : args.inputs;
      return { id: `${args.name}_id`, state };
    },
    call(args) {
      return args.inputs;
    },
  });
});

beforeEach(() => {
  resources.length = 0;
});

function unwrap<T>(x: pulumi.Output<T> | T): Promise<T> {
  return new Promise((resolve) =>
    pulumi.Output.isInstance(x) ? x.apply(resolve) : resolve(x),
  );
}

it("creates repository children with expected names and inputs", async () => {
  const repository = new Repository("MyRepo", { forceDelete: true }, {});

  expect(await unwrap(repository.repository.name)).toBe("myrepo");

  const ecrChildren = resources
    .filter((r) => r.type.startsWith("aws:ecr/"))
    .map((r) => ({
      type: r.type,
      name: r.name,
      forceDelete: r.inputs.forceDelete,
      policy: r.inputs.policy,
    }));

  expect(ecrChildren).toEqual([
    {
      type: "aws:ecr/repository:Repository",
      name: "myrepo",
      forceDelete: true,
      policy: undefined,
    },
    {
      type: "aws:ecr/lifecyclePolicy:LifecyclePolicy",
      name: "myrepo",
      forceDelete: undefined,
      policy: {
        rules: [{
          rulePriority: 1,
          description: "remove untagged images",
          selection: {
            tagStatus: "untagged",
            countType: "imageCountMoreThan",
            countNumber: 1,
          },
          action: { type: "expire" },
        }],
      },
    },
  ]);
});
```

## AWSX Notes

- `awsx/ec2/vpc.test.ts` is the richest local pattern: it uses `setMocks`,
  records `call` and `newResource`, instantiates components, unwraps Outputs,
  and asserts child resource shape.
- `awsx/ecr/auth.test.ts` and `awsx/ecr/image.test.ts` are smaller mock-test
  examples.
- The `Repository` test above is a distilled example of the pattern, not
  current suite coverage. If changing `awsx/ecr/repository.ts`, add a real
  focused test instead of treating the example as existing proof.
- Current gap: some ECS tests prove only a narrow constructor slice. When
  changing ECS constructor behavior, add assertions for normalized containers,
  roles, `requiresCompatibilities`, load balancers, and outputs as relevant.
- Assert exact cardinality when it matters. `arrayContaining` proves a value
  exists, not that duplicate or extra resources were avoided.
- Assert security-relevant child inputs exactly when they are part of the
  behavior under review. Examples include security group ingress and egress,
  IAM managed policies and policy statements, bucket policy conditions such as
  `aws:SourceArn` or `aws:SourceAccount`, whether child resources are public or
  internal, and whether sensitive args can reach log or debug sinks.
- When the behavior under review is an input derived from another child
  `Output`, write a focused assertion for that behavior and verify the mock
  semantics first. Do not assume `MockResourceArgs.inputs` will always contain a
  plain resolved value for unresolved, secret, or preview-unknown outputs.
- Current Pulumi runtime mocks expose child type, logical name, inputs,
  provider, custom flag, and ID. They do not expose enough engine state to prove
  parentage, aliases, or full URN compatibility by themselves.
- For provider or region behavior, include negative cases as relevant: explicit
  provider without region, explicit `region` plus provider region, nested child
  region fields, invokes using the wrong provider, and existing uneven behavior
  that must be preserved until compatibility review says otherwise.

## Hand Off When

Use `$awsx-breaking-change-evaluation` if the test reveals changed child names,
parentage, aliases, default-created children, providers, regions, or outputs.
