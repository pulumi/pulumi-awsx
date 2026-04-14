import * as awsx from "@pulumi/awsx";

const repository = new awsx.ecr.Repository("repository", { forceDelete: true });

export const repositoryName = repository.repository.name;
export const image = new awsx.ecr.Image("image", {
  repositoryUrl: repository.repository.repositoryUrl,
  context: "./app",
}).imageUri;
