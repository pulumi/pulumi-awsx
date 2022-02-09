import * as pulumi from "@pulumi/pulumi";

export interface ServiceDeploymentCircuitBreaker {
    /**
     * Whether to enable the deployment circuit breaker logic for the service.
     */
    enable: pulumi.Input<boolean>;
    /**
     * Whether to enable Amazon ECS to roll back the service if a service deployment fails. If rollback is enabled, when a service deployment fails, the service is rolled back to the last deployment that completed successfully.
     */
    rollback: pulumi.Input<boolean>;
}

interface ServiceDeploymentController {
    /**
     * Type of deployment controller. Valid values: `CODE_DEPLOY`, `ECS`, `EXTERNAL`. Default: `ECS`.
     */
    type?: pulumi.Input<string>;
}

export interface FargateServiceArgs {
    /**
     * Configuration block for deployment circuit breaker.
     */
    deploymentCircuitBreaker?: pulumi.Input<ServiceDeploymentCircuitBreaker>;

    /**
     * Configuration block for deployment controller configuration. Detailed below.
     */
    deploymentController?: pulumi.Input<ServiceDeploymentController>;
}

export class FargateService extends pulumi.ComponentResource {
    constructor(
        name: string,
        args: FargateServiceArgs,
        opts: pulumi.ComponentResourceOptions = {}
    ) {
        super("awsx:x:ecs:FargateService", name, args, opts);
    }
}
