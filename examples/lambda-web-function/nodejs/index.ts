import * as path from "node:path";
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

// Clean up the retained children in this test stack.
const app = new awsx.lambda.WebFunction("app", {
    code: new pulumi.asset.FileArchive(path.join(__dirname, "app")),
}, {
    transforms: [async (args) => {
        if (args.name !== "app" && !args.name.startsWith("app-")) {
            return undefined;
        }
        if (["aws-native:lambda:WebFunctionRevision", "aws-native:iam:Role",
            "aws-native:iam:RolePolicy", "aws:cloudwatch/logGroup:LogGroup"].includes(args.type)) {
            return { props: args.props, opts: { ...args.opts, retainOnDelete: false } };
        }
        return undefined;
    }],
});

export const functionArn = app.functionArn;
export const revisionId = app.revisionId;
export const revisionArn = app.revisionArn;
