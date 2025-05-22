# Contributing to the Pulumi ecosystem

Do you want to contribute to Pulumi? Awesome! We are so happy to have you.
We have a few tips and housekeeping items to help you get up and running.

## Code of Conduct

Please make sure to read and observe our [Code of Conduct](./CODE-OF-CONDUCT.md)

## Community Expectations

Please read about our [contribution guidelines here.](https://github.com/pulumi/pulumi/blob/master/CONTRIBUTING.md#communications)

## Setting up your development environment

### Pulumi prerequisites

Please refer to the [main Pulumi repo](https://github.com/pulumi/pulumi/)'s [CONTRIBUTING.md file](
https://github.com/pulumi/pulumi/blob/master/CONTRIBUTING.md#developing) for details on how to get set up with Pulumi.

You can quickly launch a shell environment with all the required dependencies using
[devbox](https://www.jetpack.io/devbox/):
```
# Install devbox if needed
$ which devbox || curl -fsSL https://get.jetpack.io/devbox | bash
$ devbox shell
```

Alternatively, you can develop in a preconfigured container environment using 
[an editor or service that supports the devcontainer standard](https://containers.dev/supporting#editors)
such as [VS Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) or [Github Codespaces](https://codespaces.new/pulumi/pulumi-aws-native). Please note that building this project can be fairly memory intensive, if you are having trouble building in a container, please ensure you have at least 12GB of memory available for the container.

## Committing Generated Code

You must generate and check in the SDKs on each pull request containing a code change, e.g. adding a new resource to `resources.go`.

1. Run `make build_sdks` from the root of this repository
1. Open a pull request containing all changes
1. *Note:* If a large number of seemingly-unrelated diffs are produced by `make build_sdks` (for example, lots of changes to comments unrelated to the change you are making), ensure that the latest dependencies for the provider are installed by running `go mod tidy` in the `provider/` directory of this repository.

## Running Integration Tests

The examples and integration tests in this repository will create and destroy real AWS
cloud resources while running. Before running these tests, make sure that you have
[configured Pulumi with AWS](https://pulumi.io/install/aws.html) successfully once before.

The only additional step you need to take to run tests in this repo is to set the
`AWS_REGION` environment variable to the region you'd like to create test resources in.
The integration tests do try to clean up after themselves by deleting everything that was
created, but in the event of bugs or test failures you may need to go into the AWS Console
and delete resources yourself.

Once you have set `AWS_REGION` and configured your AWS credentials, `make test` will run your integration tests.
