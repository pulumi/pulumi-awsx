import * as path from "node:path";
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

const config = new pulumi.Config();
const release = config.get("release") ?? "stable";
const stableRevisionId = config.get("stableRevisionId");

// Keep old revisions available during the rollout. Deleting the Web Function deletes its
// revisions. Disable retention for the supporting resources that Lambda doesn't clean up.
const app = new awsx.lambda.WebFunction("app", {
    code: { archive: new pulumi.asset.FileArchive(path.join(__dirname, "app")) },
    runtime: awsx.lambda.WebFunctionRuntime.NODEJS_LATEST,
    environmentVariables: { RELEASE: release },
}, {
    transforms: [async (args) => {
        if (args.name !== "app" && !args.name.startsWith("app-")) {
            return undefined;
        }
        if (["aws-native:iam:Role",
            "aws-native:iam:RolePolicy", "aws:cloudwatch/logGroup:LogGroup"].includes(args.type)) {
            return { props: args.props, opts: { ...args.opts, retainOnDelete: false } };
        }
        return undefined;
    }],
});

const endpoint = new awsx.lambda.WebFunctionEndpoint("app", {
    functionName: app.functionName,
    revisions: stableRevisionId
        ? [
            { revisionId: stableRevisionId, weight: 50 },
            { revisionId: app.revisionId, weight: 50 },
        ]
        : [{ revisionId: app.revisionId }],
    authType: "ApplicationManaged",
});

export const endpointArn = endpoint.endpointArn;
export const endpointDomainName = endpoint.domainName;
export const functionArn = app.functionArn;
export const revisionId = app.revisionId;
export const revisionArn = app.revisionArn;
