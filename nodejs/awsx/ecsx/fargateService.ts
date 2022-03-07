import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {
    FargateTaskDefinition,
    FargateTaskDefinitionArgs,
} from "./fargateTaskDefinition";
import * as utils from "../utils";

export interface FargateServiceArgs
    extends Omit<
            aws.ecs.ServiceArgs,
            | "launchType"
            | "networkConfiguration"
            | "taskDefinition"
            | "waitForSteadyState"
        >,
        Required<Pick<aws.ecs.ServiceArgs, "networkConfiguration">> {
    /**
     * If `true`, this provider will not wait for the service to reach a steady state (like [`aws ecs wait services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)) before continuing. Default `false`.
     */
    continueBeforeSteadyState?: pulumi.Input<boolean>;

    /**
     * Family and revision (`family:revision`) or full ARN of the task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
     */
    taskDefinition?: pulumi.Input<string>;

    /**
     * The args of task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
     */
    taskDefinitionArgs?: FargateTaskDefinitionArgs;
}

/**
 * Create an ECS Service resource for Fargate with the given unique name, arguments, and options.
 * Creates Task definition if `taskDefinitionArgs` is specified.
 */
export class FargateService extends pulumi.ComponentResource {
    /** Underlying ECS Service resource */
    public readonly service: aws.ecs.Service;
    /** Underlying Fargate component resource if created from args */
    public readonly taskDefinition?: FargateTaskDefinition;

    constructor(
        name: string,
        args: FargateServiceArgs,
        opts: pulumi.ComponentResourceOptions = {}
    ) {
        super("awsx:x:ecs:FargateService", name, {}, opts);

        if (
            args.taskDefinition !== undefined &&
            args.taskDefinitionArgs !== undefined
        ) {
            throw new Error(
                "Only one of `taskDefinition` or `taskDefinitionArgs` can be provided."
            );
        }
        let taskDefinition = args.taskDefinition;
        if (args.taskDefinitionArgs) {
            this.taskDefinition = new FargateTaskDefinition(
                name,
                args.taskDefinitionArgs,
                {
                    parent: this,
                }
            );
            taskDefinition = this.taskDefinition.taskDefinition.arn;
        }
        if (taskDefinition == undefined) {
            throw new Error(
                "Either `taskDefinition` or `taskDefinitionArgs` must be provided."
            );
        }

        this.service = new aws.ecs.Service(
            name,
            {
                ...args,
                cluster: aws.ecs.Cluster.isInstance(args.cluster)
                    ? args.cluster.arn
                    : args.cluster,
                launchType: "FARGATE",
                loadBalancers:
                    args.loadBalancers ?? this.taskDefinition?.loadBalancers,
                waitForSteadyState: !utils.ifUndefined(
                    args.continueBeforeSteadyState,
                    false
                ),
                taskDefinition,
            },
            { parent: this }
        );

        this.registerOutputs();
    }
}
