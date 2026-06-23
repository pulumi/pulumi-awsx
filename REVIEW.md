# AWSX Review Notes

Use this with `AGENTS.md`. Keep this file AWSX-specific; generic review advice
does not belong here.

Use the focused skills for detailed guidance:

- `.agents/skills/awsx-component-design/SKILL.md` for modern `awsx/**`
  component shape.
- `.agents/skills/awsx-breaking-change-evaluation/SKILL.md` for schema,
  generated SDK, identity, default, provider/region, or upgrade compatibility
  risk.
- `.agents/skills/awsx-test-authoring/SKILL.md` for test selection and
  assertion quality.
- `.agents/skills/awsx-aws-service-validation/SKILL.md` for AWS service
  behavior, API or CloudFormation constraints, regional availability, and
  provider-surface disagreements.

## Current Checks

- Schema changes under `provider/pkg/schemagen/**` are public-surface changes
  until the generated diff proves otherwise. Inspect schema and SDK output for
  renamed tokens, removed inputs/outputs, type changes, and changed defaults.
- When a schema diff is available, prefer a schema-level comparison with
  `schema-tools compare` before reviewing generated SDKs language by language.
- Treat code-level breaks and behavior-level breaks as compatibility risks. A
  change is breaking if existing users must update code or if their next
  preview/update changes deployed resources.
- Do not accept manual fixes in `sdk/**`, schema JSON, generated workflow locks,
  or `Makefile` without the matching source change and regeneration command.
- For modern AWSX behavior, prefer tests in `awsx/**` or `examples/**`.
  `examples_legacy/**` only proves legacy behavior.
- Treat child resource name changes as compatibility risks. They need aliases
  or an explicit migration story.
- A migration path that requires user action is not acceptable in a minor
  version.
- For new or touched components, child resources should normally use
  `parent: this`. Nest under another child only when preserving an audited
  existing hierarchy.
- New components should call `registerOutputs`. For existing components, a
  missing call is a review issue when the change touches constructor or
  output-publishing behavior unless the change proves why it is not needed.
- Explicit providers should flow through all child resources. Components that
  expose a top-level `region` should pass it to child resources and invokes that
  support region; see `pulumi/pulumi-awsx#1933` for the current tracking issue.
- Avoid new AWSX-owned defaults that can drift with AWS or `@pulumi/aws`
  behavior, such as version-like defaults.
- Review AWSX-owned defaults as provisioned security controls, not only
  convenience behavior.
- When a change encodes AWS service behavior, verify it against AWS docs,
  installed `@pulumi/aws` schema/SDK behavior, or live AWS evidence as
  appropriate. Use `.agents/skills/awsx-aws-service-validation/SKILL.md` for the
  detailed workflow.
- For component construction, a useful test should assert child resource types,
  names, tags, provider region, or invoke inputs. A test that only instantiates
  the component is weak.
- For AWS-backed examples, prefer targeted acceptance tests. Do not require or
  run the full `make test` suite locally.

## Missing Guidance

These are not solved yet:

- final abstraction admission rules, especially the L2/L2.5/L3 boundary;
- where modern component replay/snapshot fixtures should live beyond the current
  provider-upgrade preview fixtures.
