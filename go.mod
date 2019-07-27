module github.com/pulumi/pulumi-awsx

go 1.12

require (
	github.com/aws/aws-sdk-go v1.12.26
	github.com/pulumi/pulumi v0.17.7-0.20190411221028-bdc687e6544b
	github.com/pulumi/pulumi-cloud v0.18.0 // indirect
	github.com/stretchr/testify v1.3.0
)

replace (
	github.com/Nvveen/Gotty => github.com/ijc25/Gotty v0.0.0-20170406111628-a8b993ba6abd
	github.com/golang/glog => github.com/pulumi/glog v0.0.0-20180820174630-7eaa6ffb71e4
)
