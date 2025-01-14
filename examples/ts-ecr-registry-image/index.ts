import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as docker from "@pulumi/docker";

const repository = new awsx.ecr.Repository("repository", { forceDelete: true });
export const repositoryName = repository.repository.name;

const config = new pulumi.Config();
const message = config.require("message");

// build an image and keep it locally. You can replace this with any other local image you've already built or pulled.
const localImage = new docker.Image("local-image", {
  build: {
    context: "app",
    args: {
      message,
    },
  },
  imageName: "my-awesome-image:test",
  skipPush: true,
});

export const imageId = localImage.repoDigest;

const latestImage = new awsx.ecr.RegistryImage("image-name", {
  repositoryUrl: repository.url,
  // if no tag is provided, the image will be pushed with the `latest` tag
  sourceImage: localImage.imageName,
  keepRemotely: true,
});

export const latestImageDigest = latestImage.image.sha256Digest;

const taggedImage = new awsx.ecr.RegistryImage("tagged-image", {
  repositoryUrl: repository.url,
  sourceImage: localImage.imageName,
  // if a tag is provided, it will be used for pushing to the registry
  tag: "v1.0.0",
  keepRemotely: true,
});

const digestImage = new awsx.ecr.RegistryImage("digest", {
  repositoryUrl: repository.url,
  // you can also specify a digest instead of an image name
  sourceImage: localImage.repoDigest,
  tag: "test",
  keepRemotely: true,
});
