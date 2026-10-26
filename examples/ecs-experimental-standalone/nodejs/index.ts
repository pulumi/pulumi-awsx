import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as awsxNext from "@pulumi/awsx-next";

const task = new awsxNext.FargateTaskDefinitionV2("task", {
  cpuUnits: 256,
  memoryMiB: 512,
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
    if (args.type === "aws-native:ecs:TaskDefinition") {
      return {
        props: {
          ...args.props,
          containerDefinitions: args.props.containerDefinitions.map((container: { name: string }) =>
            container.name === "app"
              ? { ...container, environment: [{ name: "TRANSFORMED", value: "true" }] }
              : container,
          ),
        },
        opts: args.opts,
      };
    }
    return undefined;
  }],
});

export const componentName = task.name;
export const taskDefinitionArn = task.taskDefinitionArn;
export const executionRoleArn = task.executionRole.arn;
export const logGroupName = task.logGroup.apply(group  => group?.name ?? "");
// Read the registered definition from AWS to verify the engine transform end to end.
export const containerDefinitions = aws.ecs.getTaskDefinitionOutput({
  taskDefinition: task.taskDefinitionArn,
}).containerDefinitions.apply(definitions => JSON.parse(definitions));
export const family = task.family;
export const revision = task.revision;
