import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

let config = new pulumi.Config();
const myVpc = new awsx.ec2.Vpc("awsx-nodejs-export-eip-tags", { tags: { additionalTag: config.get("vpcAdditionalTag")! } });

export const eipTags = myVpc.eips[0].tags;