# awsx-1884: Fix API Gateway Lambda Permission sourceArn Formatting

## Overview

This change fixes a regression in `awsx.classic.apigateway.API` where generated
`aws.lambda.Permission.sourceArn` is malformed after v2->v3 upgrade paths. The
current template omits a slash between `restAPI.executionArn` and the wildcard
stage segment, yielding `...<apiId>* /<METHOD>/<path>` semantics instead of the
required API Gateway execute-api form.

Goal: produce correctly formatted permission ARNs so API Gateway invocations are
authorized as expected, while preserving existing behavior in all other aspects.

Primary source issue: https://github.com/pulumi/pulumi-awsx/issues/1884

## Design

### Source-of-Truth Code Change

- File: `awsx-classic/apigateway/api.ts`
- Location: lambda permission construction in `createLambdaPermissions`
- Change ARN interpolation from:
  - ``${restAPI.executionArn}*/${methodAndPath}``
  to:
  - ``${restAPI.executionArn}/*/${methodAndPath}``

This ensures permission ARNs follow expected execute-api format:
`arn:aws:execute-api:<region>:<account>:<apiId>/*/<METHOD>/<path>`.

### Test Coverage Addition

Add focused apigateway unit coverage under `awsx-classic/tests` to assert the
permission `sourceArn` includes `/*/` between execution ARN and method/path.
Coverage should validate the specific string-shaping behavior causing #1884.

### Generation and Consistency

- Do not hand-edit generated files under `sdk/**`.
- Regenerate artifacts through `make build` (explicitly requested).
- Review resulting generated changes for expected mirrors only.

### Non-Goals in Design

- No refactor of deployment/stage dependency model.
- No permission model redesign.
- No unrelated API gateway modernization.

## Scope

In: Correct sourceArn interpolation in classic API gateway permission generation,
add focused regression test(s), regenerate outputs via `make build`, and run
targeted validation.

Out: Broad refactors, replacement-optimization work, behavior changes beyond ARN
format correction, and manual edits to generated SDK outputs.

## Non-Negotiables

- [N-1] Edit source-of-truth classic code only; generated outputs are derived via regeneration.
- [N-2] Preserve behavior except for corrected ARN path separator (`/*/`).
- [N-3] Include targeted validation and add regression-focused test coverage.
- [N-4] Use `make build` to regenerate/update generated artifacts.

## Forbidden Approaches

- [F-1] Manual edits in `sdk/**` generated files — violates generated-boundary invariants.
- [F-2] Scope expansion into broader API gateway refactors — increases regression risk and delays fix.
- [F-3] Shipping without test reinforcement for the specific ARN-format bug — weak regression protection.

## Decision Log

Every material trade-off from the session is serialized below.

| Decision ID | Topic | Chosen Option | Rejected Alternatives | Rationale | Status |
|-------------|-------|---------------|------------------------|-----------|--------|
| D-1 | Code surface | Classic source only | Classic + manual SDK edits; broader API gateway refactor | Keep source-of-truth clean and minimize drift/risk | Resolved |
| D-2 | Validation depth | Targeted checks | Full repo sweep; minimal checks only | Balanced confidence and session speed | Resolved |
| D-3 | Compatibility stance | No behavior change except ARN format fix | Allow minor behavior adjustments; include replacement-reduction improvements | Keep bug fix safe and narrowly scoped | Resolved |
| D-4 | Implementation strategy | Fix + add apigateway unit tests | Minimal surgical fix without tests; fix + adjacent cleanup | Add regression protection while preserving tight scope | Resolved |
| D-5 | Regeneration command | `make build` | Other regeneration flows | Explicit user preference and full regeneration path | Resolved |

## Traceability

| Spec Element | Source | Notes |
|--------------|--------|-------|
| Non-Negotiables N-1/N-2/N-4 | User answers (`scope_surface`, `compatibility`) | User chose classic source-only and strict behavior preservation; requested `make build` regeneration |
| Non-Negotiable N-3 + Decision D-4 | User answer (`implementation_approach`) | User selected fix + test coverage |
| Design (root-cause location) | `docs/plans/awsx-1884/codebase-context.tmp` | Identified malformed template in `awsx-classic/apigateway/api.ts` |
| Forbidden F-1/F-2 | Repo generated-boundary conventions + user scope choices | Prevent generated drift and scope creep |
| Decision D-2 | User answer (`validation_level`) | Targeted validation selected |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Unexpected generated diff churn after `make build` | Medium | Keep source diff minimal, inspect generated deltas for expected mirrors |
| Hidden behavior coupling in permission/deployment flow | Medium | Restrict logic change to ARN interpolation and add focused regression test |

## Testing

- Add/update unit test(s) in `awsx-classic/tests` for permission sourceArn formatting.
- Run `yarn --cwd awsx-classic lint`.
- Run targeted tests for affected area when feasible.
- Run `make build` to regenerate and verify outputs.

