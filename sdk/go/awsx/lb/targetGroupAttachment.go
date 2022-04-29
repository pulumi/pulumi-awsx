// Code generated by pulumi-gen-awsx DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package lb

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws/lambda"
	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws/lb"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// Attach an EC2 instance or Lambda to a Load Balancer. This will create required permissions if attaching to a Lambda Function.
type TargetGroupAttachment struct {
	pulumi.ResourceState

	// Auto-created Lambda permission, if targeting a Lambda function
	LambdaPermission lambda.PermissionOutput `pulumi:"lambdaPermission"`
	// Underlying Target Group Attachment resource
	TargetGroupAttachment lb.TargetGroupAttachmentOutput `pulumi:"targetGroupAttachment"`
}

// NewTargetGroupAttachment registers a new resource with the given unique name, arguments, and options.
func NewTargetGroupAttachment(ctx *pulumi.Context,
	name string, args *TargetGroupAttachmentArgs, opts ...pulumi.ResourceOption) (*TargetGroupAttachment, error) {
	if args == nil {
		args = &TargetGroupAttachmentArgs{}
	}

	var resource TargetGroupAttachment
	err := ctx.RegisterRemoteComponentResource("awsx:lb:TargetGroupAttachment", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type targetGroupAttachmentArgs struct {
	// EC2 Instance to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
	Instance *ec2.Instance `pulumi:"instance"`
	// ID of an EC2 Instance to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
	InstanceId *string `pulumi:"instanceId"`
	// Lambda Function to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
	Lambda *lambda.Function `pulumi:"lambda"`
	// ARN of a Lambda Function to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
	LambdaArn *string `pulumi:"lambdaArn"`
	// Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.
	TargetGroup *lb.TargetGroup `pulumi:"targetGroup"`
	// ARN of the Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.
	TargetGroupArn *string `pulumi:"targetGroupArn"`
}

// The set of arguments for constructing a TargetGroupAttachment resource.
type TargetGroupAttachmentArgs struct {
	// EC2 Instance to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
	Instance ec2.InstanceInput
	// ID of an EC2 Instance to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
	InstanceId pulumi.StringPtrInput
	// Lambda Function to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
	Lambda lambda.FunctionInput
	// ARN of a Lambda Function to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
	LambdaArn pulumi.StringPtrInput
	// Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.
	TargetGroup lb.TargetGroupInput
	// ARN of the Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.
	TargetGroupArn pulumi.StringPtrInput
}

func (TargetGroupAttachmentArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*targetGroupAttachmentArgs)(nil)).Elem()
}

type TargetGroupAttachmentInput interface {
	pulumi.Input

	ToTargetGroupAttachmentOutput() TargetGroupAttachmentOutput
	ToTargetGroupAttachmentOutputWithContext(ctx context.Context) TargetGroupAttachmentOutput
}

func (*TargetGroupAttachment) ElementType() reflect.Type {
	return reflect.TypeOf((**TargetGroupAttachment)(nil)).Elem()
}

func (i *TargetGroupAttachment) ToTargetGroupAttachmentOutput() TargetGroupAttachmentOutput {
	return i.ToTargetGroupAttachmentOutputWithContext(context.Background())
}

func (i *TargetGroupAttachment) ToTargetGroupAttachmentOutputWithContext(ctx context.Context) TargetGroupAttachmentOutput {
	return pulumi.ToOutputWithContext(ctx, i).(TargetGroupAttachmentOutput)
}

// TargetGroupAttachmentArrayInput is an input type that accepts TargetGroupAttachmentArray and TargetGroupAttachmentArrayOutput values.
// You can construct a concrete instance of `TargetGroupAttachmentArrayInput` via:
//
//          TargetGroupAttachmentArray{ TargetGroupAttachmentArgs{...} }
type TargetGroupAttachmentArrayInput interface {
	pulumi.Input

	ToTargetGroupAttachmentArrayOutput() TargetGroupAttachmentArrayOutput
	ToTargetGroupAttachmentArrayOutputWithContext(context.Context) TargetGroupAttachmentArrayOutput
}

type TargetGroupAttachmentArray []TargetGroupAttachmentInput

func (TargetGroupAttachmentArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*TargetGroupAttachment)(nil)).Elem()
}

func (i TargetGroupAttachmentArray) ToTargetGroupAttachmentArrayOutput() TargetGroupAttachmentArrayOutput {
	return i.ToTargetGroupAttachmentArrayOutputWithContext(context.Background())
}

func (i TargetGroupAttachmentArray) ToTargetGroupAttachmentArrayOutputWithContext(ctx context.Context) TargetGroupAttachmentArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(TargetGroupAttachmentArrayOutput)
}

// TargetGroupAttachmentMapInput is an input type that accepts TargetGroupAttachmentMap and TargetGroupAttachmentMapOutput values.
// You can construct a concrete instance of `TargetGroupAttachmentMapInput` via:
//
//          TargetGroupAttachmentMap{ "key": TargetGroupAttachmentArgs{...} }
type TargetGroupAttachmentMapInput interface {
	pulumi.Input

	ToTargetGroupAttachmentMapOutput() TargetGroupAttachmentMapOutput
	ToTargetGroupAttachmentMapOutputWithContext(context.Context) TargetGroupAttachmentMapOutput
}

type TargetGroupAttachmentMap map[string]TargetGroupAttachmentInput

func (TargetGroupAttachmentMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*TargetGroupAttachment)(nil)).Elem()
}

func (i TargetGroupAttachmentMap) ToTargetGroupAttachmentMapOutput() TargetGroupAttachmentMapOutput {
	return i.ToTargetGroupAttachmentMapOutputWithContext(context.Background())
}

func (i TargetGroupAttachmentMap) ToTargetGroupAttachmentMapOutputWithContext(ctx context.Context) TargetGroupAttachmentMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(TargetGroupAttachmentMapOutput)
}

type TargetGroupAttachmentOutput struct{ *pulumi.OutputState }

func (TargetGroupAttachmentOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**TargetGroupAttachment)(nil)).Elem()
}

func (o TargetGroupAttachmentOutput) ToTargetGroupAttachmentOutput() TargetGroupAttachmentOutput {
	return o
}

func (o TargetGroupAttachmentOutput) ToTargetGroupAttachmentOutputWithContext(ctx context.Context) TargetGroupAttachmentOutput {
	return o
}

type TargetGroupAttachmentArrayOutput struct{ *pulumi.OutputState }

func (TargetGroupAttachmentArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*TargetGroupAttachment)(nil)).Elem()
}

func (o TargetGroupAttachmentArrayOutput) ToTargetGroupAttachmentArrayOutput() TargetGroupAttachmentArrayOutput {
	return o
}

func (o TargetGroupAttachmentArrayOutput) ToTargetGroupAttachmentArrayOutputWithContext(ctx context.Context) TargetGroupAttachmentArrayOutput {
	return o
}

func (o TargetGroupAttachmentArrayOutput) Index(i pulumi.IntInput) TargetGroupAttachmentOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *TargetGroupAttachment {
		return vs[0].([]*TargetGroupAttachment)[vs[1].(int)]
	}).(TargetGroupAttachmentOutput)
}

type TargetGroupAttachmentMapOutput struct{ *pulumi.OutputState }

func (TargetGroupAttachmentMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*TargetGroupAttachment)(nil)).Elem()
}

func (o TargetGroupAttachmentMapOutput) ToTargetGroupAttachmentMapOutput() TargetGroupAttachmentMapOutput {
	return o
}

func (o TargetGroupAttachmentMapOutput) ToTargetGroupAttachmentMapOutputWithContext(ctx context.Context) TargetGroupAttachmentMapOutput {
	return o
}

func (o TargetGroupAttachmentMapOutput) MapIndex(k pulumi.StringInput) TargetGroupAttachmentOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *TargetGroupAttachment {
		return vs[0].(map[string]*TargetGroupAttachment)[vs[1].(string)]
	}).(TargetGroupAttachmentOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*TargetGroupAttachmentInput)(nil)).Elem(), &TargetGroupAttachment{})
	pulumi.RegisterInputType(reflect.TypeOf((*TargetGroupAttachmentArrayInput)(nil)).Elem(), TargetGroupAttachmentArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*TargetGroupAttachmentMapInput)(nil)).Elem(), TargetGroupAttachmentMap{})
	pulumi.RegisterOutputType(TargetGroupAttachmentOutput{})
	pulumi.RegisterOutputType(TargetGroupAttachmentArrayOutput{})
	pulumi.RegisterOutputType(TargetGroupAttachmentMapOutput{})
}
