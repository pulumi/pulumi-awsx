import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface ValidationDetails {
  endpoint: string;
  revision: string;
  previousRevision: string;
  checks: { enabled: boolean; paths: string[] };
  attempt?: number;
  validationExecutionId?: string;
}
interface HookEvent {
  executionId: string;
  resourceArn: string;
  lifecycleStage: string;
  executionDetails: {
    targetServiceRevisionArn: string;
    productionTrafficWeights?: Record<string, number>;
  };
  hookDetails: ValidationDetails;
}
interface HookResult {
  hookStatus: "SUCCEEDED" | "FAILED" | "IN_PROGRESS";
  callBackDelay?: number;
  hookDetails?: ValidationDetails;
}

export const validationLogGroup = new aws.cloudwatch.LogGroup("deployment-validation", {
  retentionInDays: 1,
});
// HTTP validation needs no AWS API permissions. Keep execution and invocation roles separate.
const executionRole = new aws.iam.Role("deployment-validation-execution", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
});
const logPolicy = new aws.iam.RolePolicy("deployment-validation-logs", {
  role: executionRole.name,
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
        Resource: pulumi.interpolate`${validationLogGroup.arn}:*`,
      },
    ],
  }),
});
export const validationFunction = new aws.lambda.CallbackFunction<HookEvent, HookResult>(
  "deployment-validation",
  {
    role: executionRole,
    runtime: "nodejs22.x",
    timeout: 30,
    loggingConfig: { logFormat: "Text", logGroup: validationLogGroup.name },
    // Do not capture resources or revision values. ECS supplies resolved configuration and
    // per-execution retry state through hookDetails, keeping this function stable on updates.
    callback: async (event) => {
      const details = event.hookDetails;
      if (!details.checks?.enabled || details.checks.paths.join(",") !== "/api/ping") {
        console.error("Invalid nested hookDetails", details);
        return { hookStatus: "FAILED" };
      }
      // ECS can carry hookDetails into another stage. Give each execution its own retry
      // budget, including executions during rollback, rather than inheriting stale attempts.
      const attempt =
        details.validationExecutionId === event.executionId ? (details.attempt ?? 0) : 0;
      const weights = event.executionDetails.productionTrafficWeights ?? {};
      const targetWeight = weights[event.executionDetails.targetServiceRevisionArn];
      const stage =
        event.lifecycleStage === "PRODUCTION_TRAFFIC_SHIFT"
          ? `${event.lifecycleStage}:${targetWeight}`
          : event.lifecycleStage;
      if (attempt === 0) {
        // Ask ECS to retry with updated hookDetails before checking the deployment.
        console.log(`AWSX_HOOK_RETRY:${details.revision}:${stage}`);
        return {
          hookStatus: "IN_PROGRESS",
          callBackDelay: 5,
          hookDetails: { ...details, validationExecutionId: event.executionId, attempt: 1 },
        };
      }
      try {
        const request = async (testTraffic: boolean): Promise<string> => {
          const response = await fetch(`${details.endpoint}/api/ping`, {
            headers: testTraffic ? { "X-Deployment-Test": "true" } : {},
            signal: AbortSignal.timeout(3000),
          });
          const body = await response.text();
          if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${body}`);
          }
          return body;
        };
        const expected = `api-ok-${details.revision}\n`;
        if (event.lifecycleStage === "POST_TEST_TRAFFIC_SHIFT") {
          if ((await request(true)) !== expected) {
            throw new Error("Test traffic has not reached the new revision");
          }
          // Initial creation has no previous revision to validate. Sample multiple requests
          // on updates so an accidental partial production shift does not pass by chance.
          if (details.previousRevision) {
            const bodies = await Promise.all(Array.from({ length: 30 }, () => request(false)));
            if (bodies.some((body) => body !== `api-ok-${details.previousRevision}\n`)) {
              throw new Error("Production moved before post-test validation completed");
            }
          }
        } else if (
          event.lifecycleStage === "PRODUCTION_TRAFFIC_SHIFT" &&
          details.previousRevision
        ) {
          const otherWeight = Object.entries(weights)
            .filter(([arn]) => arn !== event.executionDetails.targetServiceRevisionArn)
            .reduce((sum, [, weight]) => sum + weight, 0);
          if (targetWeight === undefined || targetWeight + otherWeight <= 0) {
            throw new Error("Missing target revision traffic weight or no weighted revisions");
          }
          // Weights are relative, not necessarily percentages. Live ECS payloads can use
          // 500/500 for a 50 percent split. Zero target weight also supports rollback.
          const bodies = await Promise.all(Array.from({ length: 30 }, () => request(false)));
          const allowed = new Set<string>();
          if (targetWeight > 0) allowed.add(expected);
          if (otherWeight > 0) {
            allowed.add(`api-ok-${details.previousRevision}\n`);
          }
          if (
            allowed.size === 0 ||
            bodies.some((body) => !allowed.has(body)) ||
            [...allowed].some((body) => !bodies.includes(body))
          ) {
            throw new Error(
              `Traffic does not match weights ${JSON.stringify(weights)}: ${JSON.stringify(bodies)}`,
            );
          }
        } else if (
          event.lifecycleStage !== "PRE_SCALE_UP" &&
          event.lifecycleStage !== "PRODUCTION_TRAFFIC_SHIFT"
        ) {
          throw new Error(`Unexpected hook stage ${event.lifecycleStage}`);
        }
        // Include revision and stage details so successful validation is visible in the logs.
        console.log(
          `AWSX_HOOK_OK:${details.revision}:${stage}`,
          JSON.stringify({
            deploymentArn: event.resourceArn,
            executionId: event.executionId,
            attempt,
          }),
        );
        return { hookStatus: "SUCCEEDED" };
      } catch (error) {
        console.error("Deployment validation failed", error);
        return attempt >= 10
          ? { hookStatus: "FAILED" }
          : {
              hookStatus: "IN_PROGRESS",
              callBackDelay: 5,
              hookDetails: {
                ...details,
                validationExecutionId: event.executionId,
                attempt: attempt + 1,
              },
            };
      }
    },
  },
  { dependsOn: [logPolicy] },
);
