import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

// A minimal example using defaults wherever possible:
const current = pulumi.output(aws.getRegion());

current.apply(x => {
    new awsx.vpc.Vpc('my-vpc', {
        availabilityZoneNames: [
            `${x.name}a`,
            `${x.name}b`,
            `${x.name}c`,
        ]
    });
})
