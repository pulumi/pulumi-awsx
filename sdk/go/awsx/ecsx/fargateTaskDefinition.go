// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package ecsx

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/cloudwatch"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/ecs"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/iam"
	"github.com/pulumi/pulumi-awsx/sdk/go/awsx/cloudwatch"
	"github.com/pulumi/pulumi-awsx/sdk/go/awsx/iam"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// Create a TaskDefinition resource with the given unique name, arguments, and options.
// Creates required log-group and task & execution roles.
// Presents required Service load balancers if target group included in port mappings.
type FargateTaskDefinition struct {
	pulumi.ResourceState

	// Auto-created IAM task execution role that the Amazon ECS container agent and the Docker daemon can assume.
	ExecutionRole iam.RoleOutput `pulumi:"executionRole"`
	// Computed load balancers from target groups specified of container port mappings.
	LoadBalancers ecs.ServiceLoadBalancerArrayOutput `pulumi:"loadBalancers"`
	// Auto-created Log Group resource for use by containers.
	LogGroup cloudwatch.LogGroupOutput `pulumi:"logGroup"`
	// Underlying ECS Task Definition resource
	TaskDefinition ecs.TaskDefinitionOutput `pulumi:"taskDefinition"`
	// Auto-created IAM role that allows your Amazon ECS container task to make calls to other AWS services.
	TaskRole iam.RoleOutput `pulumi:"taskRole"`
}

// NewFargateTaskDefinition registers a new resource with the given unique name, arguments, and options.
func NewFargateTaskDefinition(ctx *pulumi.Context,
	name string, args *FargateTaskDefinitionArgs, opts ...pulumi.ResourceOption) (*FargateTaskDefinition, error) {
	if args == nil {
		args = &FargateTaskDefinitionArgs{}
	}

	var resource FargateTaskDefinition
	err := ctx.RegisterRemoteComponentResource("awsx:ecsx:FargateTaskDefinition", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type fargateTaskDefinitionArgs struct {
	// Single container to make a TaskDefinition from.  Useful for simple cases where there aren't
	// multiple containers, especially when creating a TaskDefinition to call [run] on.
	//
	// Either [container] or [containers] must be provided.
	Container *TaskDefinitionContainerDefinition `pulumi:"container"`
	// All the containers to make a TaskDefinition from.  Useful when creating a Service that will
	// contain many containers within.
	//
	// Either [container] or [containers] must be provided.
	Containers map[string]TaskDefinitionContainerDefinition `pulumi:"containers"`
	// The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
	Cpu *string `pulumi:"cpu"`
	// The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
	EphemeralStorage *ecs.TaskDefinitionEphemeralStorage `pulumi:"ephemeralStorage"`
	// The execution role that the Amazon ECS container agent and the Docker daemon can assume.
	// Will be created automatically if not defined.
	ExecutionRole *iam.DefaultRoleWithPolicy `pulumi:"executionRole"`
	// An optional unique name for your task definition. If not specified, then a default will be created.
	Family *string `pulumi:"family"`
	// Configuration block(s) with Inference Accelerators settings. Detailed below.
	InferenceAccelerators []ecs.TaskDefinitionInferenceAccelerator `pulumi:"inferenceAccelerators"`
	// IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
	IpcMode *string `pulumi:"ipcMode"`
	// A set of volume blocks that containers in your task may use.
	LogGroup *cloudwatch.DefaultLogGroup `pulumi:"logGroup"`
	// The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
	// based on the cumulative needs specified by [containerDefinitions]
	Memory *string `pulumi:"memory"`
	// Docker networking mode to use for the containers in the task. Valid values are `none`, `bridge`, `awsvpc`, and `host`.
	NetworkMode *string `pulumi:"networkMode"`
	// Process namespace to use for the containers in the task. The valid values are `host` and `task`.
	PidMode *string `pulumi:"pidMode"`
	// Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
	PlacementConstraints []ecs.TaskDefinitionPlacementConstraint `pulumi:"placementConstraints"`
	// Configuration block for the App Mesh proxy. Detailed below.
	ProxyConfiguration *ecs.TaskDefinitionProxyConfiguration `pulumi:"proxyConfiguration"`
	// Set of launch types required by the task. The valid values are `EC2` and `FARGATE`.
	RequiresCompatibilities []string `pulumi:"requiresCompatibilities"`
	// Configuration block for runtime_platform that containers in your task may use.
	RuntimePlatform *ecs.TaskDefinitionRuntimePlatform `pulumi:"runtimePlatform"`
	SkipDestroy     *bool                              `pulumi:"skipDestroy"`
	// Key-value map of resource tags.
	Tags map[string]string `pulumi:"tags"`
	// IAM role that allows your Amazon ECS container task to make calls to other AWS services.
	// Will be created automatically if not defined.
	TaskRole *iam.DefaultRoleWithPolicy `pulumi:"taskRole"`
	// Configuration block for volumes that containers in your task may use. Detailed below.
	Volumes []ecs.TaskDefinitionVolume `pulumi:"volumes"`
}

// The set of arguments for constructing a FargateTaskDefinition resource.
type FargateTaskDefinitionArgs struct {
	// Single container to make a TaskDefinition from.  Useful for simple cases where there aren't
	// multiple containers, especially when creating a TaskDefinition to call [run] on.
	//
	// Either [container] or [containers] must be provided.
	Container *TaskDefinitionContainerDefinitionArgs
	// All the containers to make a TaskDefinition from.  Useful when creating a Service that will
	// contain many containers within.
	//
	// Either [container] or [containers] must be provided.
	Containers map[string]TaskDefinitionContainerDefinitionArgs
	// The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
	Cpu pulumi.StringPtrInput
	// The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
	EphemeralStorage ecs.TaskDefinitionEphemeralStoragePtrInput
	// The execution role that the Amazon ECS container agent and the Docker daemon can assume.
	// Will be created automatically if not defined.
	ExecutionRole *iam.DefaultRoleWithPolicyArgs
	// An optional unique name for your task definition. If not specified, then a default will be created.
	Family pulumi.StringPtrInput
	// Configuration block(s) with Inference Accelerators settings. Detailed below.
	InferenceAccelerators ecs.TaskDefinitionInferenceAcceleratorArrayInput
	// IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
	IpcMode pulumi.StringPtrInput
	// A set of volume blocks that containers in your task may use.
	LogGroup *cloudwatch.DefaultLogGroupArgs
	// The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
	// based on the cumulative needs specified by [containerDefinitions]
	Memory pulumi.StringPtrInput
	// Docker networking mode to use for the containers in the task. Valid values are `none`, `bridge`, `awsvpc`, and `host`.
	NetworkMode pulumi.StringPtrInput
	// Process namespace to use for the containers in the task. The valid values are `host` and `task`.
	PidMode pulumi.StringPtrInput
	// Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
	PlacementConstraints ecs.TaskDefinitionPlacementConstraintArrayInput
	// Configuration block for the App Mesh proxy. Detailed below.
	ProxyConfiguration ecs.TaskDefinitionProxyConfigurationPtrInput
	// Set of launch types required by the task. The valid values are `EC2` and `FARGATE`.
	RequiresCompatibilities pulumi.StringArrayInput
	// Configuration block for runtime_platform that containers in your task may use.
	RuntimePlatform ecs.TaskDefinitionRuntimePlatformPtrInput
	SkipDestroy     pulumi.BoolPtrInput
	// Key-value map of resource tags.
	Tags pulumi.StringMapInput
	// IAM role that allows your Amazon ECS container task to make calls to other AWS services.
	// Will be created automatically if not defined.
	TaskRole *iam.DefaultRoleWithPolicyArgs
	// Configuration block for volumes that containers in your task may use. Detailed below.
	Volumes ecs.TaskDefinitionVolumeArrayInput
}

func (FargateTaskDefinitionArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*fargateTaskDefinitionArgs)(nil)).Elem()
}

type FargateTaskDefinitionInput interface {
	pulumi.Input

	ToFargateTaskDefinitionOutput() FargateTaskDefinitionOutput
	ToFargateTaskDefinitionOutputWithContext(ctx context.Context) FargateTaskDefinitionOutput
}

func (*FargateTaskDefinition) ElementType() reflect.Type {
	return reflect.TypeOf((**FargateTaskDefinition)(nil)).Elem()
}

func (i *FargateTaskDefinition) ToFargateTaskDefinitionOutput() FargateTaskDefinitionOutput {
	return i.ToFargateTaskDefinitionOutputWithContext(context.Background())
}

func (i *FargateTaskDefinition) ToFargateTaskDefinitionOutputWithContext(ctx context.Context) FargateTaskDefinitionOutput {
	return pulumi.ToOutputWithContext(ctx, i).(FargateTaskDefinitionOutput)
}

// FargateTaskDefinitionArrayInput is an input type that accepts FargateTaskDefinitionArray and FargateTaskDefinitionArrayOutput values.
// You can construct a concrete instance of `FargateTaskDefinitionArrayInput` via:
//
//          FargateTaskDefinitionArray{ FargateTaskDefinitionArgs{...} }
type FargateTaskDefinitionArrayInput interface {
	pulumi.Input

	ToFargateTaskDefinitionArrayOutput() FargateTaskDefinitionArrayOutput
	ToFargateTaskDefinitionArrayOutputWithContext(context.Context) FargateTaskDefinitionArrayOutput
}

type FargateTaskDefinitionArray []FargateTaskDefinitionInput

func (FargateTaskDefinitionArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*FargateTaskDefinition)(nil)).Elem()
}

func (i FargateTaskDefinitionArray) ToFargateTaskDefinitionArrayOutput() FargateTaskDefinitionArrayOutput {
	return i.ToFargateTaskDefinitionArrayOutputWithContext(context.Background())
}

func (i FargateTaskDefinitionArray) ToFargateTaskDefinitionArrayOutputWithContext(ctx context.Context) FargateTaskDefinitionArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(FargateTaskDefinitionArrayOutput)
}

// FargateTaskDefinitionMapInput is an input type that accepts FargateTaskDefinitionMap and FargateTaskDefinitionMapOutput values.
// You can construct a concrete instance of `FargateTaskDefinitionMapInput` via:
//
//          FargateTaskDefinitionMap{ "key": FargateTaskDefinitionArgs{...} }
type FargateTaskDefinitionMapInput interface {
	pulumi.Input

	ToFargateTaskDefinitionMapOutput() FargateTaskDefinitionMapOutput
	ToFargateTaskDefinitionMapOutputWithContext(context.Context) FargateTaskDefinitionMapOutput
}

type FargateTaskDefinitionMap map[string]FargateTaskDefinitionInput

func (FargateTaskDefinitionMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*FargateTaskDefinition)(nil)).Elem()
}

func (i FargateTaskDefinitionMap) ToFargateTaskDefinitionMapOutput() FargateTaskDefinitionMapOutput {
	return i.ToFargateTaskDefinitionMapOutputWithContext(context.Background())
}

func (i FargateTaskDefinitionMap) ToFargateTaskDefinitionMapOutputWithContext(ctx context.Context) FargateTaskDefinitionMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(FargateTaskDefinitionMapOutput)
}

type FargateTaskDefinitionOutput struct{ *pulumi.OutputState }

func (FargateTaskDefinitionOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**FargateTaskDefinition)(nil)).Elem()
}

func (o FargateTaskDefinitionOutput) ToFargateTaskDefinitionOutput() FargateTaskDefinitionOutput {
	return o
}

func (o FargateTaskDefinitionOutput) ToFargateTaskDefinitionOutputWithContext(ctx context.Context) FargateTaskDefinitionOutput {
	return o
}

type FargateTaskDefinitionArrayOutput struct{ *pulumi.OutputState }

func (FargateTaskDefinitionArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*FargateTaskDefinition)(nil)).Elem()
}

func (o FargateTaskDefinitionArrayOutput) ToFargateTaskDefinitionArrayOutput() FargateTaskDefinitionArrayOutput {
	return o
}

func (o FargateTaskDefinitionArrayOutput) ToFargateTaskDefinitionArrayOutputWithContext(ctx context.Context) FargateTaskDefinitionArrayOutput {
	return o
}

func (o FargateTaskDefinitionArrayOutput) Index(i pulumi.IntInput) FargateTaskDefinitionOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *FargateTaskDefinition {
		return vs[0].([]*FargateTaskDefinition)[vs[1].(int)]
	}).(FargateTaskDefinitionOutput)
}

type FargateTaskDefinitionMapOutput struct{ *pulumi.OutputState }

func (FargateTaskDefinitionMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*FargateTaskDefinition)(nil)).Elem()
}

func (o FargateTaskDefinitionMapOutput) ToFargateTaskDefinitionMapOutput() FargateTaskDefinitionMapOutput {
	return o
}

func (o FargateTaskDefinitionMapOutput) ToFargateTaskDefinitionMapOutputWithContext(ctx context.Context) FargateTaskDefinitionMapOutput {
	return o
}

func (o FargateTaskDefinitionMapOutput) MapIndex(k pulumi.StringInput) FargateTaskDefinitionOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *FargateTaskDefinition {
		return vs[0].(map[string]*FargateTaskDefinition)[vs[1].(string)]
	}).(FargateTaskDefinitionOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*FargateTaskDefinitionInput)(nil)).Elem(), &FargateTaskDefinition{})
	pulumi.RegisterInputType(reflect.TypeOf((*FargateTaskDefinitionArrayInput)(nil)).Elem(), FargateTaskDefinitionArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*FargateTaskDefinitionMapInput)(nil)).Elem(), FargateTaskDefinitionMap{})
	pulumi.RegisterOutputType(FargateTaskDefinitionOutput{})
	pulumi.RegisterOutputType(FargateTaskDefinitionArrayOutput{})
	pulumi.RegisterOutputType(FargateTaskDefinitionMapOutput{})
}
