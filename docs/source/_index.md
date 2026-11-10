---
title: AWSx (Pulumi AWS Components)
meta_desc: Well-Architected Infrastructure as Code for AWS. The easiest way to AWS — from development to production.
layout: package
---

The Amazon Web Services (AWS) AWSx library uses automatic well-architected best practices to make common infrastructure-as-code tasks in [AWS](https://aws.amazon.com/) easier and more secure. It uses the AWS SDK to manage and provision resources.

The AWSx provider must be configured with credentials to deploy and update resources in AWS; see [Installation & Configuration](./installation-configuration) for instructions.

**New to Pulumi and AWS?** [Get started with AWS using our AWSx tutorial](/docs/clouds/aws/guides/).

## Example

{{< chooser language "typescript,python,go,csharp,java,yaml,hcl" >}}

{{% choosable language typescript %}}

```typescript
import * as awsx from "@pulumi/awsx";

// Allocate a new VPC with the default settings:
const vpc = new awsx.ec2.Vpc("custom");

// Export a few resulting fields to make them easy to use:
export const vpcId = vpc.vpcId;
export const privateSubnetIds = vpc.privateSubnetIds;
export const publicSubnetIds = vpc.publicSubnetIds;
```

{{% /choosable %}}

{{% choosable language python %}}

```python
import pulumi
import pulumi_awsx as awsx

vpc = awsx.ec2.Vpc("custom")

pulumi.export("vpcId", vpc.vpc_id)
pulumi.export("publicSubnetIds", vpc.public_subnet_ids)
pulumi.export("privateSubnetIds", vpc.private_subnet_ids)
```

{{% /choosable %}}

{{% choosable language go %}}

```go
package main

import (
	"github.com/pulumi/pulumi-awsx/sdk/go/awsx/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		vpc, err := ec2.NewVpc(ctx, "my-vpc", nil)
		if err != nil {
			return err
		}
		ctx.Export("vpcId", vpc.VpcId)
		ctx.Export("privateSubnetIds", vpc.PrivateSubnetIds)
		ctx.Export("publicSubnetIds", vpc.PublicSubnetIds)
		return nil
	})
}
```

{{% /choosable %}}

{{% choosable language csharp %}}

```csharp
using Pulumi;
using Ec2 = Pulumi.Awsx.Ec2;

class MyStack : Stack
{
    public MyStack()
    {
        var vpc = new Ec2.Vpc("custom");

        this.VpcId = vpc.VpcId;
    }


    [Output] public Output<string> VpcId { get; set; }
}

class Program
{
    static Task<int> Main(string[] args) => Deployment.RunAsync<MyStack>();
}
```

{{% /choosable %}}

{{% choosable language java %}}

```java
package myproject;

import com.pulumi.Pulumi;
import com.pulumi.awsx.ec2.Vpc;

public class App {
    public static void main(String[] args) {
        Pulumi.run(ctx -> {
            var vpc = new Vpc("custom");

            ctx.export("vpcId", vpc.vpcId());
            ctx.export("privateSubnetIds", vpc.privateSubnetIds());
            ctx.export("publicSubnetIds", vpc.publicSubnetIds());
        });
    }
}
```

{{% /choosable %}}

{{% choosable language yaml %}}

```yaml
name: awsx-networking-yaml
runtime: yaml
description: A minimal AWS Pulumi YAML program

resources:
  # Allocate a new VPC with the default settings:
  vpc:
    type: awsx:ec2:Vpc

outputs:
  vpcId: ${vpc.vpcId}
  privateSubnetIds: ${vpc.privateSubnetIds}
  publicSubnetIds: ${vpc.publicSubnetIds}

```

{{% /choosable %}}

{{% choosable language hcl %}}

```hcl
terraform {
  required_providers {
    awsx = {
      source = "pulumi/awsx"
    }
  }
}

# Allocate a new VPC with the default settings:
resource "awsx_ec2_vpc" "vpc" {
}

output "vpcId" {
  value = awsx_ec2_vpc.vpc.vpc_id
}

output "privateSubnetIds" {
  value = awsx_ec2_vpc.vpc.private_subnet_ids
}

output "publicSubnetIds" {
  value = awsx_ec2_vpc.vpc.public_subnet_ids
}
```

{{% /choosable %}}

{{% /chooser %}}
