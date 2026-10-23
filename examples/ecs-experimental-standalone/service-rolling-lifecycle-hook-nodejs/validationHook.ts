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
// Preflight validation only needs CloudWatch Logs permissions. Keep the Lambda
// execution role separate from the ECS invocation role created by the service.
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
      const stage = event.lifecycleStage;
      if (attempt === 0) {
        // Ask ECS to retry with updated hookDetails before checking the deployment.
        console.log(`AWSX_HOOK_RETRY:${details.revision}:${stage}`);
        return {
          hookStatus: "IN_PROGRESS",
          callBackDelay: 5,
          hookDetails: { ...details, validationExecutionId: event.executionId, attempt: 1 },
        };
      }
      if (event.lifecycleStage !== "PRE_SCALE_UP") {
        console.error(`Unexpected hook stage ${event.lifecycleStage}`);
        return { hookStatus: "FAILED" };
      }
      // PRE_SCALE_UP runs before new tasks start. Validate the supplied settings and
      // retry protocol here, rather than expecting the new revision to serve traffic.
      console.log(
        `AWSX_HOOK_OK:${details.revision}:${stage}`,
        JSON.stringify({
          deploymentArn: event.resourceArn,
          executionId: event.executionId,
          attempt,
        }),
      );
      return { hookStatus: "SUCCEEDED" };
    },
  },
  { dependsOn: [logPolicy] },
);
