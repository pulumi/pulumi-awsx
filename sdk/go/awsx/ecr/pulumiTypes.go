// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package ecr

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// Arguments for building a docker image
type DockerBuild struct {
	// An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
	Args map[string]string `pulumi:"args"`
	// Images to consider as cache sources
	CacheFrom []string `pulumi:"cacheFrom"`
	// dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.
	Dockerfile *string `pulumi:"dockerfile"`
	// Environment variables to set on the invocation of `docker build`, for example to support `DOCKER_BUILDKIT=1 docker build`.
	Env map[string]string `pulumi:"env"`
	// An optional catch-all list of arguments to provide extra CLI options to the docker build command.  For example `['--network', 'host']`.
	ExtraOptions []string `pulumi:"extraOptions"`
	// Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.
	Path *string `pulumi:"path"`
	// The target of the dockerfile to build
	Target *string `pulumi:"target"`
}

// DockerBuildInput is an input type that accepts DockerBuildArgs and DockerBuildOutput values.
// You can construct a concrete instance of `DockerBuildInput` via:
//
//          DockerBuildArgs{...}
type DockerBuildInput interface {
	pulumi.Input

	ToDockerBuildOutput() DockerBuildOutput
	ToDockerBuildOutputWithContext(context.Context) DockerBuildOutput
}

// Arguments for building a docker image
type DockerBuildArgs struct {
	// An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
	Args pulumi.StringMapInput `pulumi:"args"`
	// Images to consider as cache sources
	CacheFrom pulumi.StringArrayInput `pulumi:"cacheFrom"`
	// dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.
	Dockerfile pulumi.StringPtrInput `pulumi:"dockerfile"`
	// Environment variables to set on the invocation of `docker build`, for example to support `DOCKER_BUILDKIT=1 docker build`.
	Env pulumi.StringMapInput `pulumi:"env"`
	// An optional catch-all list of arguments to provide extra CLI options to the docker build command.  For example `['--network', 'host']`.
	ExtraOptions pulumi.StringArrayInput `pulumi:"extraOptions"`
	// Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.
	Path pulumi.StringPtrInput `pulumi:"path"`
	// The target of the dockerfile to build
	Target pulumi.StringPtrInput `pulumi:"target"`
}

func (DockerBuildArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*DockerBuild)(nil)).Elem()
}

func (i DockerBuildArgs) ToDockerBuildOutput() DockerBuildOutput {
	return i.ToDockerBuildOutputWithContext(context.Background())
}

func (i DockerBuildArgs) ToDockerBuildOutputWithContext(ctx context.Context) DockerBuildOutput {
	return pulumi.ToOutputWithContext(ctx, i).(DockerBuildOutput)
}

func (i DockerBuildArgs) ToDockerBuildPtrOutput() DockerBuildPtrOutput {
	return i.ToDockerBuildPtrOutputWithContext(context.Background())
}

func (i DockerBuildArgs) ToDockerBuildPtrOutputWithContext(ctx context.Context) DockerBuildPtrOutput {
	return pulumi.ToOutputWithContext(ctx, i).(DockerBuildOutput).ToDockerBuildPtrOutputWithContext(ctx)
}

// DockerBuildPtrInput is an input type that accepts DockerBuildArgs, DockerBuildPtr and DockerBuildPtrOutput values.
// You can construct a concrete instance of `DockerBuildPtrInput` via:
//
//          DockerBuildArgs{...}
//
//  or:
//
//          nil
type DockerBuildPtrInput interface {
	pulumi.Input

	ToDockerBuildPtrOutput() DockerBuildPtrOutput
	ToDockerBuildPtrOutputWithContext(context.Context) DockerBuildPtrOutput
}

type dockerBuildPtrType DockerBuildArgs

func DockerBuildPtr(v *DockerBuildArgs) DockerBuildPtrInput {
	return (*dockerBuildPtrType)(v)
}

func (*dockerBuildPtrType) ElementType() reflect.Type {
	return reflect.TypeOf((**DockerBuild)(nil)).Elem()
}

func (i *dockerBuildPtrType) ToDockerBuildPtrOutput() DockerBuildPtrOutput {
	return i.ToDockerBuildPtrOutputWithContext(context.Background())
}

func (i *dockerBuildPtrType) ToDockerBuildPtrOutputWithContext(ctx context.Context) DockerBuildPtrOutput {
	return pulumi.ToOutputWithContext(ctx, i).(DockerBuildPtrOutput)
}

// Arguments for building a docker image
type DockerBuildOutput struct{ *pulumi.OutputState }

func (DockerBuildOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*DockerBuild)(nil)).Elem()
}

func (o DockerBuildOutput) ToDockerBuildOutput() DockerBuildOutput {
	return o
}

func (o DockerBuildOutput) ToDockerBuildOutputWithContext(ctx context.Context) DockerBuildOutput {
	return o
}

func (o DockerBuildOutput) ToDockerBuildPtrOutput() DockerBuildPtrOutput {
	return o.ToDockerBuildPtrOutputWithContext(context.Background())
}

func (o DockerBuildOutput) ToDockerBuildPtrOutputWithContext(ctx context.Context) DockerBuildPtrOutput {
	return o.ApplyTWithContext(ctx, func(_ context.Context, v DockerBuild) *DockerBuild {
		return &v
	}).(DockerBuildPtrOutput)
}

// An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
func (o DockerBuildOutput) Args() pulumi.StringMapOutput {
	return o.ApplyT(func(v DockerBuild) map[string]string { return v.Args }).(pulumi.StringMapOutput)
}

// Images to consider as cache sources
func (o DockerBuildOutput) CacheFrom() pulumi.StringArrayOutput {
	return o.ApplyT(func(v DockerBuild) []string { return v.CacheFrom }).(pulumi.StringArrayOutput)
}

// dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.
func (o DockerBuildOutput) Dockerfile() pulumi.StringPtrOutput {
	return o.ApplyT(func(v DockerBuild) *string { return v.Dockerfile }).(pulumi.StringPtrOutput)
}

// Environment variables to set on the invocation of `docker build`, for example to support `DOCKER_BUILDKIT=1 docker build`.
func (o DockerBuildOutput) Env() pulumi.StringMapOutput {
	return o.ApplyT(func(v DockerBuild) map[string]string { return v.Env }).(pulumi.StringMapOutput)
}

// An optional catch-all list of arguments to provide extra CLI options to the docker build command.  For example `['--network', 'host']`.
func (o DockerBuildOutput) ExtraOptions() pulumi.StringArrayOutput {
	return o.ApplyT(func(v DockerBuild) []string { return v.ExtraOptions }).(pulumi.StringArrayOutput)
}

// Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.
func (o DockerBuildOutput) Path() pulumi.StringPtrOutput {
	return o.ApplyT(func(v DockerBuild) *string { return v.Path }).(pulumi.StringPtrOutput)
}

// The target of the dockerfile to build
func (o DockerBuildOutput) Target() pulumi.StringPtrOutput {
	return o.ApplyT(func(v DockerBuild) *string { return v.Target }).(pulumi.StringPtrOutput)
}

type DockerBuildPtrOutput struct{ *pulumi.OutputState }

func (DockerBuildPtrOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**DockerBuild)(nil)).Elem()
}

func (o DockerBuildPtrOutput) ToDockerBuildPtrOutput() DockerBuildPtrOutput {
	return o
}

func (o DockerBuildPtrOutput) ToDockerBuildPtrOutputWithContext(ctx context.Context) DockerBuildPtrOutput {
	return o
}

func (o DockerBuildPtrOutput) Elem() DockerBuildOutput {
	return o.ApplyT(func(v *DockerBuild) DockerBuild {
		if v != nil {
			return *v
		}
		var ret DockerBuild
		return ret
	}).(DockerBuildOutput)
}

// An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
func (o DockerBuildPtrOutput) Args() pulumi.StringMapOutput {
	return o.ApplyT(func(v *DockerBuild) map[string]string {
		if v == nil {
			return nil
		}
		return v.Args
	}).(pulumi.StringMapOutput)
}

// Images to consider as cache sources
func (o DockerBuildPtrOutput) CacheFrom() pulumi.StringArrayOutput {
	return o.ApplyT(func(v *DockerBuild) []string {
		if v == nil {
			return nil
		}
		return v.CacheFrom
	}).(pulumi.StringArrayOutput)
}

// dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.
func (o DockerBuildPtrOutput) Dockerfile() pulumi.StringPtrOutput {
	return o.ApplyT(func(v *DockerBuild) *string {
		if v == nil {
			return nil
		}
		return v.Dockerfile
	}).(pulumi.StringPtrOutput)
}

// Environment variables to set on the invocation of `docker build`, for example to support `DOCKER_BUILDKIT=1 docker build`.
func (o DockerBuildPtrOutput) Env() pulumi.StringMapOutput {
	return o.ApplyT(func(v *DockerBuild) map[string]string {
		if v == nil {
			return nil
		}
		return v.Env
	}).(pulumi.StringMapOutput)
}

// An optional catch-all list of arguments to provide extra CLI options to the docker build command.  For example `['--network', 'host']`.
func (o DockerBuildPtrOutput) ExtraOptions() pulumi.StringArrayOutput {
	return o.ApplyT(func(v *DockerBuild) []string {
		if v == nil {
			return nil
		}
		return v.ExtraOptions
	}).(pulumi.StringArrayOutput)
}

// Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.
func (o DockerBuildPtrOutput) Path() pulumi.StringPtrOutput {
	return o.ApplyT(func(v *DockerBuild) *string {
		if v == nil {
			return nil
		}
		return v.Path
	}).(pulumi.StringPtrOutput)
}

// The target of the dockerfile to build
func (o DockerBuildPtrOutput) Target() pulumi.StringPtrOutput {
	return o.ApplyT(func(v *DockerBuild) *string {
		if v == nil {
			return nil
		}
		return v.Target
	}).(pulumi.StringPtrOutput)
}

// Simplified lifecycle policy model consisting of one or more rules that determine which images in a repository should be expired. See https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html for more details.
type LifecyclePolicy struct {
	// Specifies the rules to determine how images should be retired from this repository. Rules are ordered from lowest priority to highest.  If there is a rule with a `selection` value of `any`, then it will have the highest priority.
	Rules []LifecyclePolicyRule `pulumi:"rules"`
	// Skips creation of the policy if set to `true`.
	Skip *bool `pulumi:"skip"`
}

// A lifecycle policy rule that determine which images in a repository should be expired.
type LifecyclePolicyRule struct {
	// Describes the purpose of a rule within a lifecycle policy.
	Description *string `pulumi:"description"`
	// The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
	MaximumAgeLimit *float64 `pulumi:"maximumAgeLimit"`
	// The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
	MaximumNumberOfImages *float64 `pulumi:"maximumNumberOfImages"`
	// A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified "tagStatus": "tagged". For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
	TagPrefixList []string `pulumi:"tagPrefixList"`
	// Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
	TagStatus LifecycleTagStatus `pulumi:"tagStatus"`
}

// LifecyclePolicyRuleInput is an input type that accepts LifecyclePolicyRuleArgs and LifecyclePolicyRuleOutput values.
// You can construct a concrete instance of `LifecyclePolicyRuleInput` via:
//
//          LifecyclePolicyRuleArgs{...}
type LifecyclePolicyRuleInput interface {
	pulumi.Input

	ToLifecyclePolicyRuleOutput() LifecyclePolicyRuleOutput
	ToLifecyclePolicyRuleOutputWithContext(context.Context) LifecyclePolicyRuleOutput
}

// A lifecycle policy rule that determine which images in a repository should be expired.
type LifecyclePolicyRuleArgs struct {
	// Describes the purpose of a rule within a lifecycle policy.
	Description pulumi.StringPtrInput `pulumi:"description"`
	// The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
	MaximumAgeLimit pulumi.Float64PtrInput `pulumi:"maximumAgeLimit"`
	// The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
	MaximumNumberOfImages pulumi.Float64PtrInput `pulumi:"maximumNumberOfImages"`
	// A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified "tagStatus": "tagged". For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
	TagPrefixList pulumi.StringArrayInput `pulumi:"tagPrefixList"`
	// Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
	TagStatus LifecycleTagStatusInput `pulumi:"tagStatus"`
}

func (LifecyclePolicyRuleArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*LifecyclePolicyRule)(nil)).Elem()
}

func (i LifecyclePolicyRuleArgs) ToLifecyclePolicyRuleOutput() LifecyclePolicyRuleOutput {
	return i.ToLifecyclePolicyRuleOutputWithContext(context.Background())
}

func (i LifecyclePolicyRuleArgs) ToLifecyclePolicyRuleOutputWithContext(ctx context.Context) LifecyclePolicyRuleOutput {
	return pulumi.ToOutputWithContext(ctx, i).(LifecyclePolicyRuleOutput)
}

// LifecyclePolicyRuleArrayInput is an input type that accepts LifecyclePolicyRuleArray and LifecyclePolicyRuleArrayOutput values.
// You can construct a concrete instance of `LifecyclePolicyRuleArrayInput` via:
//
//          LifecyclePolicyRuleArray{ LifecyclePolicyRuleArgs{...} }
type LifecyclePolicyRuleArrayInput interface {
	pulumi.Input

	ToLifecyclePolicyRuleArrayOutput() LifecyclePolicyRuleArrayOutput
	ToLifecyclePolicyRuleArrayOutputWithContext(context.Context) LifecyclePolicyRuleArrayOutput
}

type LifecyclePolicyRuleArray []LifecyclePolicyRuleInput

func (LifecyclePolicyRuleArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]LifecyclePolicyRule)(nil)).Elem()
}

func (i LifecyclePolicyRuleArray) ToLifecyclePolicyRuleArrayOutput() LifecyclePolicyRuleArrayOutput {
	return i.ToLifecyclePolicyRuleArrayOutputWithContext(context.Background())
}

func (i LifecyclePolicyRuleArray) ToLifecyclePolicyRuleArrayOutputWithContext(ctx context.Context) LifecyclePolicyRuleArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(LifecyclePolicyRuleArrayOutput)
}

// A lifecycle policy rule that determine which images in a repository should be expired.
type LifecyclePolicyRuleOutput struct{ *pulumi.OutputState }

func (LifecyclePolicyRuleOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*LifecyclePolicyRule)(nil)).Elem()
}

func (o LifecyclePolicyRuleOutput) ToLifecyclePolicyRuleOutput() LifecyclePolicyRuleOutput {
	return o
}

func (o LifecyclePolicyRuleOutput) ToLifecyclePolicyRuleOutputWithContext(ctx context.Context) LifecyclePolicyRuleOutput {
	return o
}

// Describes the purpose of a rule within a lifecycle policy.
func (o LifecyclePolicyRuleOutput) Description() pulumi.StringPtrOutput {
	return o.ApplyT(func(v LifecyclePolicyRule) *string { return v.Description }).(pulumi.StringPtrOutput)
}

// The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
func (o LifecyclePolicyRuleOutput) MaximumAgeLimit() pulumi.Float64PtrOutput {
	return o.ApplyT(func(v LifecyclePolicyRule) *float64 { return v.MaximumAgeLimit }).(pulumi.Float64PtrOutput)
}

// The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
func (o LifecyclePolicyRuleOutput) MaximumNumberOfImages() pulumi.Float64PtrOutput {
	return o.ApplyT(func(v LifecyclePolicyRule) *float64 { return v.MaximumNumberOfImages }).(pulumi.Float64PtrOutput)
}

// A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified "tagStatus": "tagged". For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
func (o LifecyclePolicyRuleOutput) TagPrefixList() pulumi.StringArrayOutput {
	return o.ApplyT(func(v LifecyclePolicyRule) []string { return v.TagPrefixList }).(pulumi.StringArrayOutput)
}

// Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
func (o LifecyclePolicyRuleOutput) TagStatus() LifecycleTagStatusOutput {
	return o.ApplyT(func(v LifecyclePolicyRule) LifecycleTagStatus { return v.TagStatus }).(LifecycleTagStatusOutput)
}

type LifecyclePolicyRuleArrayOutput struct{ *pulumi.OutputState }

func (LifecyclePolicyRuleArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]LifecyclePolicyRule)(nil)).Elem()
}

func (o LifecyclePolicyRuleArrayOutput) ToLifecyclePolicyRuleArrayOutput() LifecyclePolicyRuleArrayOutput {
	return o
}

func (o LifecyclePolicyRuleArrayOutput) ToLifecyclePolicyRuleArrayOutputWithContext(ctx context.Context) LifecyclePolicyRuleArrayOutput {
	return o
}

func (o LifecyclePolicyRuleArrayOutput) Index(i pulumi.IntInput) LifecyclePolicyRuleOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) LifecyclePolicyRule {
		return vs[0].([]LifecyclePolicyRule)[vs[1].(int)]
	}).(LifecyclePolicyRuleOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*DockerBuildInput)(nil)).Elem(), DockerBuildArgs{})
	pulumi.RegisterInputType(reflect.TypeOf((*DockerBuildPtrInput)(nil)).Elem(), DockerBuildArgs{})
	pulumi.RegisterInputType(reflect.TypeOf((*LifecyclePolicyRuleInput)(nil)).Elem(), LifecyclePolicyRuleArgs{})
	pulumi.RegisterInputType(reflect.TypeOf((*LifecyclePolicyRuleArrayInput)(nil)).Elem(), LifecyclePolicyRuleArray{})
	pulumi.RegisterOutputType(DockerBuildOutput{})
	pulumi.RegisterOutputType(DockerBuildPtrOutput{})
	pulumi.RegisterOutputType(LifecyclePolicyRuleOutput{})
	pulumi.RegisterOutputType(LifecyclePolicyRuleArrayOutput{})
}
