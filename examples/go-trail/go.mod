module go-trail

go 1.14

require (
	github.com/pulumi/pulumi-aws/sdk/v4 v4.37.5
	github.com/pulumi/pulumi-awsx/sdk v0.13.0
	github.com/pulumi/pulumi/sdk/v3 v3.25.1
)

replace github.com/pulumi/pulumi-awsx/sdk => ../../sdk
