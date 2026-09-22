import "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as awsxExperimental from "@pulumi/awsx-experimental";

const task = new awsxExperimental.FargateTaskDefinitionV2("task", {
  cpu: 256,
  memory: 512,
  containers: {
    app: {
      image: "public.ecr.aws/nginx/nginx:latest",
      logging: {
        cloudwatch: {
          streamPrefix: "app",
        },
      },
    },
  },
}, {
  transforms: [async (args) => {
    if (args.type === "awsx-experimental:index:ContainerDefinition") {
      return {
        props: { ...args.props, environment: [{ name: "TRANSFORMED", value: "true" }] },
        opts: args.opts,
      };
    }
    return undefined;
  }],
});

export const componentName = task.name;
export const taskDefinitionArn = task.taskDefinition.arn;
export const executionRoleArn = task.executionRole.arn;
export const logGroupName = task.logGroup.apply(group  => group?.name ?? "");
export const containerDefinitions = task.taskDefinition.containerDefinitions;
