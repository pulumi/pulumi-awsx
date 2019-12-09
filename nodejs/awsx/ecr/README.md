## Pulumi Elastic Contain Registry (ECR) Components

Pulumi's API for simplifying working with [ECR](https://aws.amazon.com/ecr/). The API currently provides ways to define and configure [`Repositories`](https://docs.aws.amazon.com/AmazonECR/latest/userguide/Repositories.html) and [`LifecyclePolicies`](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html).  It also makes it simple to build and push [Docker Images](https://docs.docker.com/engine/reference/commandline/image/) to a Repository providing stored cloud images that can then be used by other AWS services like ECS.

### Repositories

To start with, here's a simple example of how one can create a simple ECR Repository:

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const repository = new awsx.ecr.Repository("app");
```

With a repository available, it's easy to build an push a Docker Image that will be stored in the cloud:


```ts
const repository = new awsx.ecr.Repository("app");

// "./app" is a relative folder to this application containing a Dockerfile.  For more
// examples of what can be built and pushed, see the @pulumi/docker package.
const image = repository.buildAndPushImage("./app");
```

Now that we have an image, it can be easily referenced from an ECS Service like so:

```ts
const repository = new awsx.ecr.Repository("app");
const image = repository.buildAndPushImage("./app");

const listener = new awsx.lb.NetworkListener("app", { port: 80 });
const nginx = new awsx.ecs.FargateService("app", {
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: image,
                memory: 128,
                portMappings: [listener],
            },
        },
    },
    desiredCount: 2,
});
```

In the case where you don't really need to use the repository (except as a place to store the built image), the above can be simplified as:


```ts
const nginx = new awsx.ecs.FargateService("app", {
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: awsx.ecr.buildAndPushImage("app", "./app"),
                // ...
            },
        },
    },
    // ...
});
```

### Lifecycle Policies

Amazon ECR lifecycle policies enable you to specify the lifecycle management of images in a repository. A lifecycle policy is a set of one or more rules, where each rule defines an action for Amazon ECR. The actions apply to images that contain tags prefixed with the given strings. This allows the automation of cleaning up unused images, for example expiring images based on age or count. You should expect that after creating a lifecycle policy the affected images are expired within 24 hours.  See https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html for more details.

The ECR module makes it easy to configure the Lifecycle Policy for a given Repository.  There are two main ways that control how an image is purged from the repository:

1. Once a maximum number of images has been reached (`maximumNumberOfImages`).
2. Once an image reaches a maximum allowed age (`maximumAgeLimit`).

Policies can apply to all images, 'untagged' images, or tagged images that match a specific tag-prefix.

By default an awsx.ecr.Repository is created with a policy that will only keep at most one untagged image around.  In other words, the following are equivalent:

```ts
const repository1 = new awsx.ecr.Repository("app1");
const repository2 = new awsx.ecr.Repository("app2", {
    lifeCyclePolicyArgs: {
        rules: [{
            selection: "untagged",
            maximumNumberOfImages: 1,
        }],
    },
});
```

### Policy Rules

A Lifecycle Policy is built from a collection of `rules`.  These rules are ordered from lower priority to higher priority. How the collection of `rules` is interpreted is as follows:

1. An image is expired by exactly one or zero rules.
2. An image that matches the tagging requirements of a higher priority rule cannot be expired by a
   rule with a lower priority.
3. Rules can never mark images that are marked by higher priority rules, but can still identify them
   as if they haven't been expired.
4. The set of rules must contain a unique set of tag prefixes.
5. Only one rule is allowed to select `untagged` images.
6. Expiration is always ordered by the "pushed at time" for an image, and always expires older
   images before newer ones.
7. When using the `tagPrefixList`, an image is successfully matched if all of the tags in the
   `tagPrefixList` value are matched against any of the image's tags.
8. With `maximumNumberOfImages`, images are sorted from youngest to oldest based on their "pushed at
   time" and then all images greater than the specified count are expired.
9. `maximumAgeLimit`, all images whose "pushed at time" is older than the specified number of days
   based on `countNumber` are expired.


### Examples

#### Example A:

The following example shows the lifecycle policy syntax for a policy that expires untagged images older than 14 days:

```ts
const repository = new awsx.ecr.Repository("app", {
    lifeCyclePolicyArgs: {
        rules: [{
            selection: "untagged",
            maximumAgeLimit: 14,
        }],
    },
});
```

#### Example B: Filtering on Multiple Rules

The following examples use multiple rules in a lifecycle policy. An example repository and lifecycle policy are given along with an explanation of the outcome.

```ts
const repository = new awsx.ecr.Repository("app", {
    lifeCyclePolicyArgs: {
        rules: [{
            selection: { tagPrefixList: ["prod"] },
            maximumNumberOfImages: 1,
        }, {
            selection: { tagPrefixList: ["beta"] },
            maximumNumberOfImages: 1,
        }],
    },
});
```

Repository contents:
* Image A, Taglist: ["beta-1", "prod-1"], Pushed: 10 days ago
* Image B, Taglist: ["beta-2", "prod-2"], Pushed: 9 days ago
* Image C, Taglist: ["beta-3"], Pushed: 8 days ago

The logic of this lifecycle policy would be:

1. Rule 1 identifies images tagged with prefix `prod`. It should mark images, starting with the
   oldest, until there is one or fewer images remaining that match. It marks Image A for expiration.

2. Rule 2 identifies images tagged with prefix beta. It should mark images, starting with the
   oldest, until there is one or fewer images remaining that match. It marks both Image A and Image
   B for expiration. However, Image A has already been seen by Rule 1 and if Image B were expired it
   would violate Rule 1 and thus is skipped.

Result: Image A is expired.

#### Example C: Filtering on Multiple Rules

This is the same repository as the previous example but the rule priority order is changed to illustrate the outcome.

```ts
const repository = new awsx.ecr.Repository("app", {
    lifeCyclePolicyArgs: {
        rules: [{
            selection: { tagPrefixList: ["beta"] },
            maximumNumberOfImages: 1,
        }, {
            selection: { tagPrefixList: ["prod"] },
            maximumNumberOfImages: 1,
        }],
    },
});
```

Repository contents:
* Image A, Taglist: ["beta-1", "prod-1"], Pushed: 10 days ago
* Image B, Taglist: ["beta-2", "prod-2"], Pushed: 9 days ago
* Image C, Taglist: ["beta-3"], Pushed: 8 days ago

The logic of this lifecycle policy would be:

1. Rule 1 identifies images tagged with beta. It should mark images, starting with the oldest, until
   there is one or fewer images remaining that match. It sees all three images and would mark Image
   A and Image B for expiration.

2. Rule 2 identifies images tagged with prod. It should mark images, starting with the oldest, until
   there is one or fewer images remaining that match. It would see no images because all available
   images were already seen by Rule 1 and thus would mark no additional images.

Result: Images A and B are expired.

#### Example D: Filtering on Multiple Tags in a Single Rule

The following examples specify the lifecycle policy syntax for multiple tag prefixes in a single rule. An example repository and lifecycle policy are given along with an explanation of the outcome.

When multiple tag prefixes are specified on a single rule, images must match all listed tag prefixes.

```ts
const repository = new awsx.ecr.Repository("app", {
    lifeCyclePolicyArgs: {
        rules: [{
            selection: { tagPrefixList: ["alpha", "beta"] },
            maximumAgeLimit: 5,
        },
    },
});
```

Repository contents:
* Image A, Taglist: ["alpha-1"], Pushed: 12 days ago
* Image B, Taglist: ["beta-1"], Pushed: 11 days ago
* Image C, Taglist: ["alpha-2", "beta-2"], Pushed: 10 days ago
* Image D, Taglist: ["alpha-3"], Pushed: 4 days ago
* Image E, Taglist: ["beta-3"], Pushed: 3 days ago
* Image F, Taglist: ["alpha-4", "beta-4"], Pushed: 2 days ago

The logic of this lifecycle policy would be:

1. Rule 1 identifies images tagged with alpha and beta. It sees images C and F. It should mark
   images that are older than five days, which would be Image C.

2. Result: Image C is expired.

#### Example E: Filtering on All Images

The following lifecycle policy examples specify all images with different filters. An example repository and lifecycle policy are given along with an explanation of the outcome.


```ts
const repository = new awsx.ecr.Repository("app", {
    lifeCyclePolicyArgs: {
        rules: [{
            selection: "any",
            maximumNumberOfImages: 5,
        },
    },
});
```

Repository contents:
* Image A, Taglist: ["alpha-1"], Pushed: 4 days ago
* Image B, Taglist: ["beta-1"], Pushed: 3 days ago
* Image C, Taglist: [], Pushed: 2 days ago
* Image D, Taglist: ["alpha-2"], Pushed: 1 day ago

The logic of this lifecycle policy would be:

1. Rule 1 identifies all images. It sees images A, B, C, and D. It should expire all images other
   than the newest one. It marks images A, B, and C for expiration.

2. Result: Images A, B, and C are expired.
