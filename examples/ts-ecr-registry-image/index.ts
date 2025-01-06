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

const preTaggedImage = new awsx.ecr.RegistryImage("pre-tagged-image", {
  repositoryUrl: repository.url,
  // if sourceImage has a tag, it will be used for pushing to the registry
  sourceImage: localImage.imageName,
  keepRemotely: true,
});

const latestImage = new awsx.ecr.RegistryImage("latest-image", {
  repositoryUrl: repository.url,
  // if sourceImage has no tag, it will be pushed with the latest tag
  sourceImage: localImage.repoDigest,
  keepRemotely: true,
});

const taggedImage = new awsx.ecr.RegistryImage("tagged-image", {
  repositoryUrl: repository.url,
  sourceImage: localImage.imageName,
  // if a tag is provided, it will be used for pushing to the registry
  tag: "v1.0.0",
  keepRemotely: true,
});