Manages the lifecycle of a docker image in a registry. You can upload images to a registry (= `docker push`) and also delete them again. In contrast to [`awsx.ecr.Image`](/registry/packages/awsx/api-docs/ecr/image/), this resource does not require to build the image, but can be used to push an existing image to an ECR repository. The image will be pushed whenever the source image changes or is updated.

{{% examples %}}
## Example Usage
{{% example %}}
### Pushing an image to an ECR repository

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

const repository = new awsx.ecr.Repository("repository", { forceDelete: true });

const preTaggedImage = new awsx.ecr.RegistryImage("registry-image", {
  repositoryUrl: repository.url,
  sourceImage: "my-awesome-image:v1.0.0",
});
```
```python
import pulumi
import pulumi_awsx as awsx

repository = awsx.ecr.Repository("repository", force_delete=True)

registry_image = awsx.ecr.RegistryImage("registry_image",
    repository_url=repository.url,
    source_image="my-awesome-image:v1.0.0")
```
```go
package main

import (
	"github.com/pulumi/pulumi-awsx/sdk/v2/go/awsx/ecr"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		repository, err := ecr.NewRepository(ctx, "repository", &ecr.RepositoryArgs{
			ForceDelete: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		registryImage, err := ecr.NewRegistryImage(ctx, "registryImage", &ecr.RegistryImageArgs{
			RepositoryUrl: repository.Url,
			SourceImage:   pulumi.String("my-awesome-image:v1.0.0"),
		})
		if err != nil {
			return err
		}

		return nil
	})
}
```
```csharp
using Pulumi;
using Pulumi.Awsx.Ecr;

return await Pulumi.Deployment.RunAsync(() =>
{
    var repository = new Repository("repository", new RepositoryArgs
    {
        ForceDelete = true,
    });

    var registryImage = new RegistryImage("registryImage", new RegistryImageArgs
    {
        RepositoryUrl = repository.Url,
        SourceImage = "my-awesome-image:v1.0.0",
    });

    return new Dictionary<string, object?>{};
});
```
```yaml
name: example
runtime: yaml
resources:
  repository:
    type: awsx:ecr:Repository
    properties:
      forceDelete: true
  registryImage:
    type: awsx:ecr:RegistryImage
    properties:
      repositoryUrl: ${repository.url}
      sourceImage: "my-awesome-image:v1.0.0"
```
```java
import com.pulumi.Pulumi;
import com.pulumi.awsx.ecr.Repository;
import com.pulumi.awsx.ecr.RepositoryArgs;
import com.pulumi.awsx.ecr.RegistryImage;
import com.pulumi.awsx.ecr.RegistryImageArgs;

public class Main {
    public static void main(String[] args) {
        Pulumi.run(ctx -> {
            // Create an ECR repository with force delete enabled
            var repository = new Repository("repository", RepositoryArgs.builder()
                .forceDelete(true)
                .build());

            // Create a RegistryImage based on the ECR repository URL and source image
            var registryImage = new RegistryImage("registryImage", RegistryImageArgs.builder()
                .repositoryUrl(repository.url())
                .sourceImage("my-awesome-image:v1.0.0")
                .build());
        });
    }
}
```
{{% /example %}}
{{% /examples %}}
