import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const provider = new aws.Provider("eu-west-1", { region: "us-east-1" });

export const defaultVpc = new awsx.ec2.DefaultVpc("default-vpc", {}, { provider });

export const vpc1 = new awsx.ec2.Vpc("vpc-1", {}, { provider });
