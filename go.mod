module github.com/pulumi/pulumi-awsx

go 1.13

replace github.com/Azure/go-autorest => github.com/Azure/go-autorest v12.4.3+incompatible

require (
	github.com/Azure/go-autorest v12.0.0+incompatible
	github.com/aws/aws-sdk-go v1.29.27
	github.com/docker/docker v1.13.1 // indirect
	github.com/pulumi/pulumi/pkg/v2 v2.0.0
	github.com/pulumi/pulumi/sdk/v2 v2.0.0
	github.com/stretchr/testify v1.5.1
)
