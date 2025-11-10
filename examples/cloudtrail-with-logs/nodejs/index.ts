import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

const trail = new awsx.cloudtrail.Trail("with-logs", {
  enableLogging: true,
  cloudWatchLogsGroup: {
    enable: true,
    args: {
      retentionInDays: 7,
    },
  },
});

export const logGroupArn = trail.logGroup.apply((lg) => lg?.arn);
export const trailCloudWatchLogGroupArn = trail.trail.cloudWatchLogsGroupArn;
