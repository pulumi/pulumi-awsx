import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// // Create a load balancer on port 80 and spin up two instances of Nginx.
const lb = new awsx.lb.ApplicationLoadBalancer("lb", {
    defaultTargetGroup: { targetType: "lambda" },
});

const lambda = new aws.lambda.CallbackFunction("func", {
    callback: async (ev: any) => {
        return {
            statusCode: 200,
            statusDescription: "200 OK",
            isBase64Encoded: false,
            headers: {
                "Content-Type": "text/html",
            },
            body: "<h1>Hello from Lambda!</h1>",
        };
    },
});

const attachment = new awsx.lb.TargetGroupAttachment("attachment", {
    targetGroup: lb.defaultTargetGroup,
    lambda,
});

// Export the load balancer's address so that it's easy to access.
export const url = lb.loadBalancer.dnsName;
