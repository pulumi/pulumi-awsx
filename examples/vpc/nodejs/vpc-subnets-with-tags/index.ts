import * as awsx from "@pulumi/awsx";

const myVpc = new awsx.ec2.Vpc("awsx-nodejs-subnets-with-tags", {
    tags: {
        isoverridden: "false"
    },
    subnetSpecs: [
        {
            type: awsx.ec2.SubnetType.Public,
            cidrMask: 22,
            tags: {
                isoverridden: "true",
                custom_tag_subnet_type: "subnet_public",
                custom_tag_one: "1"
            }
        },
        {
            type: awsx.ec2.SubnetType.Private,
            cidrMask: 21,
            tags: {
                custom_tag_subnet_type: "subnet_private",
                custom_tag_two: "2",
                custom_tag_three: "3"
            }
        },
    ],
});

export const vpcId = myVpc.vpcId;
export const publicSubnetIds = myVpc.publicSubnetIds;
export const privateSubnetIds = myVpc.privateSubnetIds;
