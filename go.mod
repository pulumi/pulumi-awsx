module github.com/pulumi/pulumi-awsx

go 1.12

require (
	github.com/aws/aws-sdk-go v1.19.16
	github.com/docker/docker v1.13.1 // indirect
	github.com/pulumi/pulumi v0.17.27
	github.com/stretchr/testify v1.3.0
)

replace (
	git.apache.org/thrift.git => github.com/apache/thrift v0.12.0
	github.com/Nvveen/Gotty => github.com/ijc25/Gotty v0.0.0-20170406111628-a8b993ba6abd
	github.com/golang/glog => github.com/pulumi/glog v0.0.0-20180820174630-7eaa6ffb71e4
)
