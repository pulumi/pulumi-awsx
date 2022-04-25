// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package ecr

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// Build and push a docker image to ECR
func BuildAndPushImage(ctx *pulumi.Context, args *BuildAndPushImageArgs, opts ...pulumi.InvokeOption) (*BuildAndPushImageResult, error) {
	var rv BuildAndPushImageResult
	err := ctx.Invoke("awsx:ecr:buildAndPushImage", args, &rv, opts...)
	if err != nil {
		return nil, err
	}
	return &rv, nil
}

// Arguments for building and publishing a docker image to ECR
type BuildAndPushImageArgs struct {
	// Arguments for building the docker image.
	Docker *DockerBuild `pulumi:"docker"`
	// The Amazon Web Services account ID associated with the registry that contains the repository. If you do not specify a registry, the default registry is assumed.
	RegistryId     *string `pulumi:"registryId"`
	RepositoryName string  `pulumi:"repositoryName"`
}

// Outputs from the pushed docker image
type BuildAndPushImageResult struct {
	// Unique identifier of the pushed image
	Image *string `pulumi:"image"`
}

func BuildAndPushImageOutput(ctx *pulumi.Context, args BuildAndPushImageOutputArgs, opts ...pulumi.InvokeOption) BuildAndPushImageResultOutput {
	return pulumi.ToOutputWithContext(context.Background(), args).
		ApplyT(func(v interface{}) (BuildAndPushImageResult, error) {
			args := v.(BuildAndPushImageArgs)
			r, err := BuildAndPushImage(ctx, &args, opts...)
			return *r, err
		}).(BuildAndPushImageResultOutput)
}

// Arguments for building and publishing a docker image to ECR
type BuildAndPushImageOutputArgs struct {
	// Arguments for building the docker image.
	Docker DockerBuildPtrInput `pulumi:"docker"`
	// The Amazon Web Services account ID associated with the registry that contains the repository. If you do not specify a registry, the default registry is assumed.
	RegistryId     pulumi.StringPtrInput `pulumi:"registryId"`
	RepositoryName pulumi.StringInput    `pulumi:"repositoryName"`
}

func (BuildAndPushImageOutputArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*BuildAndPushImageArgs)(nil)).Elem()
}

// Outputs from the pushed docker image
type BuildAndPushImageResultOutput struct{ *pulumi.OutputState }

func (BuildAndPushImageResultOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*BuildAndPushImageResult)(nil)).Elem()
}

func (o BuildAndPushImageResultOutput) ToBuildAndPushImageResultOutput() BuildAndPushImageResultOutput {
	return o
}

func (o BuildAndPushImageResultOutput) ToBuildAndPushImageResultOutputWithContext(ctx context.Context) BuildAndPushImageResultOutput {
	return o
}

// Unique identifier of the pushed image
func (o BuildAndPushImageResultOutput) Image() pulumi.StringPtrOutput {
	return o.ApplyT(func(v BuildAndPushImageResult) *string { return v.Image }).(pulumi.StringPtrOutput)
}

func init() {
	pulumi.RegisterOutputType(BuildAndPushImageResultOutput{})
}
