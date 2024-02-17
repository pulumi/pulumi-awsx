The VPC component provides a VPC with configured subnets and NAT gateways.

{{% examples %}}

## Example Usage

{{% example %}}

Basic usage:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

const vpc = new awsx.ec2.Vpc("vpc", {});
export const vpcId = vpc.vpcId;
export const vpcPrivateSubnetIds = vpc.privateSubnetIds;
export const vpcPublicSubnetIds = vpc.publicSubnetIds;
```

```python
import pulumi
import pulumi_awsx as awsx

vpc = awsx.ec2.Vpc("vpc")
pulumi.export("vpcId", vpc.vpc_id)
pulumi.export("vpcPrivateSubnetIds", vpc.private_subnet_ids)
pulumi.export("vpcPublicSubnetIds", vpc.public_subnet_ids)
```

```csharp
using System.Collections.Generic;
using System.Linq;
using Pulumi;
using Awsx = Pulumi.Awsx;

return await Deployment.RunAsync(() => 
{
    var vpc = new Awsx.Ec2.Vpc("vpc");

    return new Dictionary<string, object?>
    {
        ["vpcId"] = vpc.VpcId,
        ["vpcPrivateSubnetIds"] = vpc.PrivateSubnetIds,
        ["vpcPublicSubnetIds"] = vpc.PublicSubnetIds,
    };
});
```

```go
package main

import (
	"github.com/pulumi/pulumi-awsx/sdk/v2/go/awsx/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		vpc, err := ec2.NewVpc(ctx, "vpc", nil)
		if err != nil {
			return err
		}
		ctx.Export("vpcId", vpc.VpcId)
		ctx.Export("vpcPrivateSubnetIds", vpc.PrivateSubnetIds)
		ctx.Export("vpcPublicSubnetIds", vpc.PublicSubnetIds)
		return nil
	})
}
```

```java
package generated_program;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.core.Output;
import com.pulumi.awsx.ec2.Vpc;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    public static void stack(Context ctx) {
        var vpc = new Vpc("vpc");

        ctx.export("vpcId", vpc.vpcId());
        ctx.export("vpcPrivateSubnetIds", vpc.privateSubnetIds());
        ctx.export("vpcPublicSubnetIds", vpc.publicSubnetIds());
    }
}
```

```yaml
resources:
  vpc:
    type: awsx:ec2:Vpc
outputs:
  vpcId: ${vpc.vpcId}
  vpcPrivateSubnetIds: ${vpc.privateSubnetIds}
  vpcPublicSubnetIds: ${vpc.publicSubnetIds}
```

{{% /example %}}
{{% /examples %}}

## Subnet Layout Strategies

If no subnet arguments are passed, then a public and private subnet will be created in each AZ with default sizing. The layout of these subnets can be customised by specifying additional arguments.

All strategies are designed to help build a uniform layout of subnets each each availability zone.

If no strategy is specified, "Legacy" will be used for backward compatibility reasons. In the next major version this will change to defaulting to "Auto".

### Auto

The "Auto" strategy divides the VPC space evenly between the availability zones. Within each availability zone it allocates each subnet in the order they were specified. If a CIDR mask or size was not specified it will default to an even division of the availability zone range. If subnets have different sizes, spaces will be automatically added to ensure subnets don't overlap (e.g. where a previous subnet is smaller than the next).

### Exact

The "Exact" strategy is the same as "Auto" with the additional requirement to explicitly specify what the whole of each zone's range will be used for. Where you expect to have a gap between or after subnets, these must be passed using the subnet specification type "Unused" to show all space has been properly accounted for.

### Explicit CIDR Blocks

If you prefer to do your CIDR block calculations yourself, you can specify a list of CIDR blocks for each subnet spec which it will be allocated for in each availability zone. If using explicit layouts, all subnet specs must be declared with explicit CIDR blocks. Each list of CIDR blocks must have the same length as the number of availability zones for the VPC.

### Legacy

The "Legacy" works similarly to the "Auto" strategy except that within each availability zone it allocates the private subnet first, followed by the public subnets, and lastly the isolated subnets. The order of subnet specifications of the same type can be changed, but the ordering of private, public, isolated is not overridable. For more flexibility we recommend moving to the "Auto" strategy. The output property `subnetLayout` shows the configuration required if specifying the "Auto" strategy to maintain the current layout.
