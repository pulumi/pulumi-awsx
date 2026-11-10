---
title: AWSx Installation & Configuration
meta_desc: How to set up credentials to use the Pulumi AWSx Component library and choose configuration options to tailor the provider to suit your use case.
layout: package
---

<!-- markdownlint-disable url -->
[iam-user-console]: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html#id_users_create_console
[iam-manage-keys]: https://docs.aws.amazon.com/general/latest/gr/managing-aws-access-keys.html
[configure-aws-cli]: https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html
<!-- markdownlint-enable url -->

{{< aws-resource-note >}}

## Installation

The AWSx provider is available as a package in all Pulumi languages:

* JavaScript/TypeScript: [`@pulumi/awsx`](https://www.npmjs.com/package/@pulumi/awsx)
* Python: [`pulumi-awsx`](https://pypi.org/project/pulumi-awsx/)
* Go: [`github.com/pulumi/pulumi-awsx/sdk/v2/go/awsx`](https://pkg.go.dev/github.com/pulumi/pulumi-awsx/sdk/v2)
* .NET: [`Pulumi.Awsx`](https://www.nuget.org/packages/Pulumi.Awsx)
* Java: [`com.pulumi/awsx`](https://central.sonatype.com/artifact/com.pulumi/awsx)

## Setup

To provision resources with the Pulumi AWSx provider, you need to have AWS credentials. You can use the instructions on if you plan to use AWS credentials from a shared credentials file (which the AWS CLI usually manages for you) or from an environment variable. For other credential options, see the [AWS documentation](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html).

Your AWS credentials are never sent to pulumi.com. Pulumi uses the AWS SDK and the credentials in your environment to authenticate requests from your computer to AWS.

### Get your credentials

First, make sure you have an IAM user in the [AWS console][iam-user-console] with **Programmatic access** and ensure it has sufficient permissions to deploy and manage your program's resources. If you know the precise resource types you wish to create and delete, we recommend restricting your IAM user's access to just those types.

You'll also need an [AWS access key][iam-manage-keys] for your user. There are two parts to each key, which you'll see in the IAM console after you create it:

* `<YOUR_ACCESS_KEY_ID>`: your access key's ID
* `<YOUR_SECRET_ACCESS_KEY>`: your access key's secret

{{% notes "info" %}}
If you are using [temporary security credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html), you will also have to supply an `AWS_SESSION_TOKEN` value before you can use Pulumi to create resources on your behalf.
{{% /notes %}}

### Create a shared credentials file

A credentials file is a plaintext file on your machine that contains your access keys. The file must be named `credentials` and is located underneath `.aws/` directory in your home directory.  We recommend this approach because it supports Amazon's recommended approach for securely managing multiple roles.

#### Option 1: Use the CLI

To create this file using the CLI, [install the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/installing.html). If you're using
[Homebrew](https://brew.sh/) on macOS, you can use the community-managed [awscli](http://formulae.brew.sh/formula/awscli) via `brew install awscli`.

After installing the CLI, configure it with your IAM credentials, typically using the `aws configure` command. For other configuration options, see the AWS article [Configuring the AWS CLI][configure-aws-cli].

```bash
$ aws configure
AWS Access Key ID [None]: <YOUR_ACCESS_KEY_ID>
AWS Secret Access Key [None]: <YOUR_SECRET_ACCESS_KEY>
Default region name [None]:
Default output format [None]:
```

Now you've created the `~/.aws/credentials` file and populated it with the expected settings.

#### Option 2: Create by hand

You can also create the shared credentials file by hand.  For example:

```ini
[default]
aws_access_key_id = <YOUR_ACCESS_KEY_ID>
aws_secret_access_key = <YOUR_SECRET_ACCESS_KEY>
```

If you want to specify multiple profiles, those are listed in different sections:

```ini
[default]
aws_access_key_id = <YOUR_DEFAULT_ACCESS_KEY_ID>
aws_secret_access_key = <YOUR_DEFAULT_SECRET_ACCESS_KEY>
[test-account]
aws_access_key_id = <YOUR_TEST_ACCESS_KEY_ID>
aws_secret_access_key = <YOUR_TEST_SECRET_ACCESS_KEY>
[prod-account]
aws_access_key_id = <YOUR_PROD_ACCESS_KEY_ID>
aws_secret_access_key = <YOUR_PROD_SECRET_ACCESS_KEY>
```

In this case, you will need to set the `AWS_PROFILE` environment variable to the name of the profile to use.

### Set environment variables

We recommend using a shared credentials file for most development. However, if you need to temporarily override your credentials file, you can use environment variables. You can do this to quickly switch to a different access key or to configure AWS access from within an environment that might not have an AWS CLI, such as a continuous integration/continuous delivery (CI/CD) system.

To authenticate using environment variable, set them in your terminal:

{{< chooser os "linux,macos,windows" >}}
{{% choosable os linux %}}

```bash
$ export AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
$ export AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
```

{{% /choosable %}}

{{% choosable os macos %}}

```bash
$ export AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
$ export AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
```

{{% /choosable %}}

{{% choosable os windows %}}

```powershell
> $env:AWS_ACCESS_KEY_ID = "<YOUR_ACCESS_KEY_ID>"
> $env:AWS_SECRET_ACCESS_KEY = "<YOUR_SECRET_ACCESS_KEY>"
```

{{% /choosable %}}
{{< /chooser >}}

### Set up multiple profiles

As an optional step, if you have multiple AWS profiles set up, you can specify a different profile to use with Pulumi through one of the following methods:

* Set `AWS_PROFILE` as an environment variable
* After creating your project, run `pulumi config set aws:profile <profilename>`

### Configuration

The configuration options available for this provider  mirror those of the [Pulumi AWS Provider](https://github.com/pulumi/pulumi-aws#configuration)
