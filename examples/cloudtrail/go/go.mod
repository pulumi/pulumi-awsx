module github.com/pulumi/pulumi-awsx/examples/go-trail

go 1.16

require (
	github.com/pulumi/pulumi-aws/sdk/v5 v5.1.2
	github.com/pulumi/pulumi-awsx/sdk v0.0.0-20220413174901-ab146e2dfade
	github.com/pulumi/pulumi/sdk/v3 v3.25.1
)

replace github.com/pulumi/pulumi-awsx/sdk => ../../sdk
