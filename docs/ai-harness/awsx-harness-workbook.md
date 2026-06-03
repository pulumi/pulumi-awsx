# AWSX Harness Workbook

This is a working document, not durable guidance yet. Fill this in with concrete
AWSX rules, examples, and non-goals. Once a section is clear, move the distilled
rule into `AGENTS.md`, `REVIEW.md`, or a focused harness doc.

Delete anything that does not earn its place.

Use "compatibility-sensitive" to mean behavior that can affect existing Pulumi
programs, state, generated SDK usage, URNs, aliases, previews, or replacements.
Do not turn a compatibility-sensitive rule into final guidance until the repo
has either examples or tests that show the boundary.

## 1. Breaking Change Rules

Goal: define what changes must be treated as compatibility risks.

### Public Surface

Candidate rules to validate:

- Evaluate schema changes at the Pulumi schema level first, not by manually
  reviewing each generated SDK language in isolation.
- Use `schema-tools compare` locally when possible. The tool already classifies
  semantic changes such as missing resources/functions/types/inputs/outputs,
  missing properties, type changes, optional-to-required, required-to-optional,
  signature changes, token remaps, and new resources/functions.
- Treat code-level breaks and behavior-level breaks as compatibility risks:
  - Code-level break: an existing user has to update their program after
    upgrading.
  - Behavior-level break: an existing user can keep their code, but the next
    preview or update changes deployed resources.
- Do not allow breaking changes in minor releases without an explicit override.
- Accept breaking changes inherited from upstream AWS provider changes only when
  AWSX is not adding additional breakage of its own.
- Input/output renames are breaking.
- Enum or allowed-value changes are breaking.
- Changed defaults are breaking when an existing user's next preview/update can
  change.
- Provider token or module path changes are breaking unless aliases or another
  compatibility mechanism handles the transition.

Open questions:

- Where should the local `schema-tools compare` command be documented once the
  exact AWSX invocation is settled?
- Which schema-tool categories should be treated as blocking vs warning in local
  agent review?
- Which language-specific SDK changes are still worth spot-checking after the
  schema-level comparison?

Current candidate rule:

> A schema change is public-surface risk until the generated SDK diff proves it
> is not.

### Component Behavior

Current maintainer notes:

- Child resource names are compatibility-sensitive. Changing a child name changes
  resource identity unless aliases or another migration path preserves existing
  stacks.
- Changing child resource parentage is compatibility-sensitive unless aliases
  handle the transition.
- A migration path that requires user action is not acceptable in a minor
  version.
- `registerOutputs` should be present in AWSX components. Existing omissions are
  likely cleanup candidates, but should be handled separately unless the current
  change touches constructor or output-publishing behavior.
- AWSX should not own defaults that can reasonably change upstream. A default
  version property is the kind of default that would eventually force AWSX to
  chase external changes.
- Issue `pulumi/pulumi-awsx#1913` and PR `pulumi/pulumi-awsx#1916` are useful
  examples of behavior-level compatibility risk: code compiled, but an upgrade
  changed the resources users would see in preview.

Open questions:

- When is adding, removing, or replacing default-created support resources a
  compatibility risk?
- Is changing default tags a breaking change?
- Is changing provider or region propagation a breaking change?
- Which behavior changes require an explicit compatibility decision?
- Which existing defaults are AWSX-owned behavior, and which are pass-through to
  AWS or `@pulumi/aws`?

## 2. AWSX Component Invariants

Goal: write the architectural rules that agents should not invent on their own.

### Resource Ownership

Current maintainer notes:

- Child resources should normally use `parent: this`.
- Nesting child resources under another child should be rare and intentional.
  Existing cases must be audited before turning this into a hard review rule.
- New components should call `registerOutputs`. Existing components without it
  should be investigated as possible bugs, but broad cleanup should be separate
  from unrelated component changes.

Repo findings to validate:

- `awsx/ec2/vpc.ts` has nested child parents such as `parent: vpc`,
  `parent: subnet`, and `parent: routeTable`.
- Several modern `awsx/**` component classes appear not to call
  `registerOutputs`; verify each before filing fixes.

Open questions:

- What should every component own directly?
- What should be passed through from `opts`?
- When should a component expose child resources as properties?
- Are there child resources that should stay private implementation details?
- Are the current nested VPC parent relationships intentional legacy hierarchy,
  or should they be migrated toward `parent: this` with aliases?

Candidate rules to validate:

- Do: parent new child resources to the component unless an audited exception
  says otherwise.
- Do: call `registerOutputs` in new component constructors and when touching
  output-publishing behavior.
- Do not: add a nested child parent just to express ordering; use explicit
  dependencies when ordering is the actual requirement.
- Stop and ask if: preserving compatibility would require aliases, a new
  component or touched output path lacks `registerOutputs`, or a proposed child
  parent is not `parent: this`.

### Naming

Current maintainer notes:

- Child names are part of the compatibility surface.
- A child name change requires aliases or an explicit migration story.

Open questions:

- How should AWSX name child resources?
- Are there legacy naming constraints for existing components?
- How should names balance readability, stability, and AWS constraints?
- Which generated-schema aliases already cover historical name or type changes?

### Providers And Regions

Current maintainer notes:

- AWS provider region can now be set at the provider level and at the resource
  level.
- Explicit providers should flow through all child resources.
- Components should expose an optional component-level `region` argument when
  they create child resources or call data sources that support `region`.
- AWSX should not expose separate per-child region settings inside one
  component.
- Region values can be passed through as inputs; the Pulumi engine/provider
  should handle unknowns rather than AWSX inventing its own dynamic-region
  policy.

Repo findings to validate:

- `awsx/ec2/vpc.ts` is the strongest current example: it uses `args.region` for
  availability-zone discovery and forwards it to child EC2 resources.
- Other modern components expose top-level `region` but appear to forward it
  unevenly. Known audit targets include CloudTrail, ECR repository lifecycle
  policy, ECS services/task definitions, and load balancers.
- Load balancer and ECS schemas also expose nested listener, target group, and
  task/service region fields. Decide whether those per-child surfaces should
  remain, be deprecated, or be treated as generated pass-through only.
- `pulumi/pulumi-awsx#1933` tracks modern component gaps where top-level
  `region` exists but is not consistently passed to children and invokes.

Open questions:

- Are there any components where calling AWS data sources during construction is
  invalid, or should this be considered allowed when the lookup is needed to
  construct the component?
- Which components currently expose `region` and still fail to pass it through
  everywhere?
- What should happen to existing nested per-resource `region` fields already in
  the schema?

Candidate rules to validate:

- Provider propagation: pass explicit providers through to all child resources.
- Region propagation: expose one component-level `region` and pass it through to
  all child resources and invokes that support it.
- AWS lookup behavior: allow AWS lookups during construction when they are part
  of constructing the component shape.

## 3. Test Authoring Rules

Goal: define what test to write when fixing a bug or adding a feature.

This section needs a fuller test audit, but the working model is:

- Unit/mock tests prove the component's decision logic.
- Acceptance tests prove the resource shape is valid in AWS.
- Recorded snapshot/replay tests should be the preferred repeatable form for
  AWS-observed behavior after the behavior has been proven live once.
- Broad examples are smoke tests. They are useful on a schedule, but they are
  usually too general for agents to validate a specific bug fix.

### Pure Logic And Mock Tests

Use when the behavior is inside the component:

- conditionally creating resources;
- conditionally setting child resource inputs;
- validating or normalizing arguments;
- deriving output shape;
- choosing defaults that AWSX owns.

Good examples:

- `awsx/ec2/vpc.test.ts` for VPC validation, subnet math, child resource shape,
  tag propagation, and region propagation.
- `awsx/ec2/subnetDistributorLegacy.test.ts` and
  `awsx/ec2/subnetDistributorNew.test.ts` for allocator behavior.
- `awsx/ecs/fargateMemoryAndCpu.test.ts` for CPU/memory normalization.
- `awsx/ecs/container.test.ts` for container helper behavior.

Open questions:

- Which helpers should always be covered by Jest tests?
- When should property tests be used?
- What makes a Jest test too shallow?

Mock assertion rule to draft:

- Component-construction tests should assert the exact child resource types,
  names, relevant inputs, parent/provider/region propagation, and invokes that
  prove the behavior under test. A test that only instantiates the component is
  too shallow.

### Acceptance And Replay Tests

Use when the question is whether AWS accepts or correctly wires the resource
shape:

- IAM permissions that must work against AWS;
- integrations between services;
- property combinations where provider schema acceptance is not enough;
- behavior only visible after deployment.

Preferred shape:

- Prove the behavior once with a targeted live acceptance test.
- Preserve a recorded fixture only when the repo has a concrete replay path for
  the behavior under review. Today, the concrete recorded path is provider
  upgrade preview coverage.
- Keep broad example tests as scheduled smoke tests, not the default agent
  validation path.

Open questions:

- When does a new feature need an example under `examples/**`?
- When should an acceptance test assert stack outputs with
  `ExtraRuntimeValidation`?
- When should a direct `pulumitest` test body read AWS instead of
  `ExtraRuntimeValidation`?
- What AWS-observed behavior is worth testing live?
- When does the claim require no-diff preview, update, refresh, or
  provider-upgrade proof beyond the first successful `up`?
- Where should AWSX put reusable snapshot/replay fixtures for modern
  components?

### Provider Upgrade Tests

Use when the risk is compatibility of existing programs or state across provider
versions.

Current coverage:

- `provider/provider_test.go` is the upgrade harness entry point.
- `provider/provider_nodejs_test.go` contains Node.js preview-upgrade cases.
- `provider/testdata/recorded/**/grpc.json` contains recorded fixtures used by
  the upgrade harness.

Open questions:

- What changes should add or update a provider upgrade test?
- What existing programs are the best coverage anchors?
- What kinds of replacement are acceptable vs blocking?
- Should this harness expand beyond preview compatibility when the risk is
  update, refresh, or import behavior?

## 4. AWS Domain Validation

Durable guidance now lives in
`.agents/skills/awsx-aws-service-validation/SKILL.md`. Keep this section only
for questions not yet covered by that skill.

Current maintainer notes:

- Because AWSX is schema driven, it should be able to support any data type that
  the Pulumi schema supports. The exact constraints still need research.
- AWS SDK or service models should only be used when AWSX code directly uses the
  AWS SDK or when no higher-level source can answer the question.

Open questions:

- Are there current AWSX schema generation limitations that reject otherwise
  valid Pulumi schema types?

## 5. Scope And Abstraction Discipline

Goal: prevent AI velocity from widening AWSX beyond maintainable abstractions.

Current maintainer notes:

- AWSX should avoid owning defaults that can drift with AWS or `@pulumi/aws`.
- Defaults are acceptable only when AWSX intentionally owns that behavior and can
  preserve it as compatibility surface.
- A component should wrap resource shapes that are complex enough to benefit
  from a component.
- Broadly applicable L2 and narrow L2.5 components are acceptable candidates.
- L3-style application patterns should generally be rejected. The more resources
  a component wraps, the more feature variation AWSX must support.
- Avoid components that invite a steady stream of "same pattern, slightly
  different use case" enhancement requests.

CDK-inspired vocabulary:

- L1: thin generated resource-level surface.
- L2: convenience wrapper around one primary resource with useful defaults,
  helpers, or integrations.
- L2.5: common usage scenario around one logical resource or a small resource
  cluster.
- L3: broad application pattern that composes multiple services into an
  architecture.

Current AWSX audit:

- Modern `awsx/` is mostly L2 with several L2.5 components.
- `awsx/ec2.Vpc` is L2.5: it creates and wires VPCs, subnets, route tables,
  NAT gateways, endpoints, and allocation strategy behavior.
- `awsx/ecr.Repository` is closer to L2: repository plus optional lifecycle
  policy.
- `awsx/ecr.Image` and `awsx/ecr.RegistryImage` are convenience wrappers around
  image build/publish flows.
- `awsx/lb.ApplicationLoadBalancer`, `awsx/lb.NetworkLoadBalancer`, and modern
  ECS service/task-definition components are L2.5 because they synthesize
  multiple supporting resources and defaults.
- `awsx/cloudtrail.Trail` is L2.5 because it creates or adopts a bucket, bucket
  policy, optional log group, IAM role, and trail.
- `awsx-classic/**` contains the broader legacy surface and should not be used
  as the model for new L3 additions without an explicit decision.

Open questions:

- What kinds of abstractions belong in AWSX?
- What should remain plain `@pulumi/aws` usage?
- When should a feature be rejected as too narrow, too broad, or too AWS-service
  specific?
- How much opinion should AWSX encode?
- What is the bar for adding a new component?

Candidate rules to validate:

- AWSX should provide: broadly useful L2 convenience and carefully bounded L2.5
  resource shapes.
- AWSX should not provide: new L3 application blueprints by default.
- Defaults AWSX may own: stable convenience defaults that AWSX can preserve as
  compatibility surface.
- Defaults AWSX should pass through: version-like, service-owned, or provider
  defaults that can drift outside AWSX.
- Stop and ask before: adding a broad multi-service pattern, adding a default
  that may drift, or wrapping a resource whose use case is not broadly shared.

## 6. Review Integration

Goal: decide what repo-specific review knowledge should be visible to humans,
Codex, and gh-aw.

Open questions:

- Should `REVIEW.md` be the repo-local review entry point?
- What should gh-aw enforce automatically vs leave for human review?
- Which AWSX review rules are blocking?
- Which AWSX review rules are advisory?

Candidate rules to validate:

- Blocking review findings: unapproved public-surface breaks, behavior-level
  compatibility breaks, manual generated-file fixes, missing aliases for child
  renames, missing `registerOutputs` in new components or touched output paths,
  or missing provider and region propagation in touched component code.
- Advisory review findings: broad examples used as proof for narrow behavior,
  AWS functionality claims without a source, or new abstractions that look
  closer to L3 than L2/L2.5.
- gh-aw should read: `REVIEW.md` first, then any focused docs or skills it
  links to.
- gh-aw should not do: treat generic review advice as AWSX-specific guidance.

## 7. Harness Evolution

Goal: decide when to update the harness after real work.

Open questions:

- What counts as a reusable agent miss?
- When should a correction become a doc update?
- When should a correction become a skill or deterministic tool?
- When should it remain session-local context?
- How do we prevent harness docs from accumulating generic advice?

Decision rule to confirm or replace:

> A harness update is justified only when it prevents a likely recurring AWSX
> mistake or captures a concrete AWSX rule.
