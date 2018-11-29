// Copyright 2016-2018, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as pulumi from "@pulumi/pulumi";

import * as aws from "@pulumi/aws";
import * as awsinfra from "@pulumi/aws-infra";

import { Config, Output } from "@pulumi/pulumi";

const network = awsinfra.Network.getDefault();
const cluster = new awsinfra.x.Cluster("testing", { network });
const autoScalingGroup = new awsinfra.x.autoscaling.ClusterAutoScalingGroup("testing", {
    cluster,
    templateParameters: {
        minSize: 20,
    },
    launchConfigurationArgs: {
        cluster,
        instanceType: "t2.medium",
    },
});

// A simple NGINX service, scaled out over two containers.
const nginxLoadBalancer = awsinfra.x.LoadBalancerProvider.fromPortInfo({ cluster, port: 80 });
const nginx = new awsinfra.x.EC2Service("examples-nginx", {
    cluster,
    autoScalingGroup,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: "nginx",
                memory: 128,
                loadBalancerProvider: nginxLoadBalancer,
            },
        },
    },
    desiredCount: 2,
});

export let nginxEndpoint = nginxLoadBalancer.defaultEndpoint();

// A simple NGINX service, scaled out over two containers, starting with a task definition.
const simpleNginxLoadBalancer = awsinfra.x.LoadBalancerProvider.fromPortInfo({ cluster, port: 80 });
const simpleNginx = new awsinfra.x.EC2TaskDefinition("examples-simple-nginx", {
    container: {
        image: "nginx",
        memory: 128,
        loadBalancerProvider: simpleNginxLoadBalancer,
    },
}).createService("examples-simple-nginx", { cluster, autoScalingGroup, desiredCount: 2});

export let simpleNginxEndpoint = simpleNginxLoadBalancer.defaultEndpoint();

const cachedNginx = new awsinfra.x.EC2Service("examples-cached-nginx", {
    cluster,
    autoScalingGroup,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                imageProvider: awsinfra.x.ImageProvider.fromDockerBuild({
                    context: "./app",
                    cacheFrom: true,
                }),
                memory: 128,
                loadBalancerProvider: awsinfra.x.LoadBalancerProvider.fromPortInfo({ cluster, port: 80 }),
            },
        },
    },
    desiredCount: 2,
});

const multistageCachedNginx = new awsinfra.x.EC2Service("examples-multistage-cached-nginx", {
    cluster,
    autoScalingGroup,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                imageProvider: awsinfra.x.ImageProvider.fromDockerBuild({
                    context: "./app",
                    dockerfile: "./app/Dockerfile-multistage",
                    cacheFrom: {stages: ["build"]},
                }),
                memory: 128,
                loadBalancerProvider: awsinfra.x.LoadBalancerProvider.fromPortInfo({ cluster, port: 80 }),
            },
        },
    },
    desiredCount: 2,
});

const customWebServerLoadBalancer = awsinfra.x.LoadBalancerProvider.fromPortInfo(
    { cluster, port: 80, targetPort: 8080 });
const customWebServer = new awsinfra.x.EC2Service("mycustomservice", {
    cluster,
    autoScalingGroup,
    taskDefinitionArgs: {
        containers: {
            webserver: {
                memory: 128,
                loadBalancerProvider: customWebServerLoadBalancer,
                imageProvider: awsinfra.x.ImageProvider.fromFunction(() => {
                    const rand = Math.random();
                    const http = require("http");
                    http.createServer((req: any, res: any) => {
                        res.end(`Hello, world! (from ${rand})`);
                    }).listen(8080);
                }),
            },
        },
    },
    desiredCount: 2,
});

const config = new Config("containers");
const redisPassword = config.require("redisPassword");

/**
 * A simple Cache abstration, built on top of a Redis container Service.
 */
class Cache {
    get: (key: string) => Promise<string>;
    set: (key: string, value: string) => Promise<void>;

    constructor(name: string, memory: number = 128) {
        const redisLoadBalancer = awsinfra.x.LoadBalancerProvider.fromPortInfo({ cluster, port: 6379 });
        const redis = new awsinfra.x.EC2Service(name, {
            cluster,
            autoScalingGroup,
            taskDefinitionArgs: {
                containers: {
                    redis: {
                        image: "redis:alpine",
                        memory: memory,
                        loadBalancerProvider: redisLoadBalancer,
                        command: ["redis-server", "--requirepass", redisPassword],
                    },
                },
            },
        });

        this.get = (key: string) => {
            const endpoint = redisLoadBalancer.defaultEndpoint().get();
            console.log(`Endpoint: ${JSON.stringify(endpoint)}`);
            const client = require("redis").createClient(
                endpoint.port,
                endpoint.hostname,
                { password: redisPassword },
            );
            console.log(client);
            return new Promise<string>((resolve, reject) => {
                client.get(key, (err: any, v: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(v);
                    }
                });
            });
        };
        this.set = (key: string, value: string) => {
            const endpoint = redisLoadBalancer.defaultEndpoint().get();
            console.log(`Endpoint: ${JSON.stringify(endpoint)}`);
            const client = require("redis").createClient(
                endpoint.port,
                endpoint.hostname,
                { password: redisPassword },
            );
            console.log(client);
            return new Promise<void>((resolve, reject) => {
                client.set(key, value, (err: any, v: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        };
    }
}

const cache = new Cache("examples-mycache");

const helloTask = new awsinfra.x.EC2TaskDefinition("examples-hello-world", {
    container: {
        image: "hello-world",
        memory: 20,
    },
});

// build an anonymous image:
const builtServiceLoadBalancer = awsinfra.x.LoadBalancerProvider.fromPortInfo({ cluster, port: 80 });
const builtService = new awsinfra.x.EC2Service("examples-nginx2", {
    cluster,
    autoScalingGroup,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                imageProvider: awsinfra.x.ImageProvider.fromPath("./app"),
                memory: 128,
                loadBalancerProvider: builtServiceLoadBalancer,
            },
        },
    },
    desiredCount: 2,
    waitForSteadyState: false,
});

function errorJSON(err: any) {
    const result: any = Object.create(null);
    Object.getOwnPropertyNames(err).forEach(key => result[key] = err[key]);
    return result;
}

function handleError(err: Error) {
    console.error(errorJSON(err));
    return {
        statusCode: 500,
        body: JSON.stringify(errorJSON(err)),
    };
}

// expose some APIs meant for testing purposes.
const api = new aws.apigateway.x.API("examples-containers", {
    routes: [{
        path: "/test",
        method: "GET",
        eventHandler: async (req) => {
            try {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        nginx: nginxLoadBalancer.defaultEndpoint().get(),
                        nginx2: builtServiceLoadBalancer.defaultEndpoint().get(),
                    }),
                };
            } catch (err) {
                return handleError(err);
            }
        },
    }, {
        path: "/",
        method: "GET",
        eventHandler: async (req) => {
            try {
                const fetch = (await import("node-fetch")).default;
                // Use the NGINX or Redis Services to respond to the request.
                console.log("handling /");
                const page = await cache.get("page");
                if (page) {
                    return {
                        statusCode: 200,
                        headers: { "X-Powered-By": "redis" },
                        body: page,
                    };
                }

                const endpoint = nginxLoadBalancer.defaultEndpoint().get();
                console.log(`got host and port: ${JSON.stringify(endpoint)}`);
                const resp = await fetch(`http://${endpoint.hostname}:${endpoint.port}/`);
                const buffer = await resp.buffer();
                console.log(buffer.toString());
                await cache.set("page", buffer.toString());

                return {
                    statusCode: 200,
                    headers: { "X-Powered-By": "nginx" },
                    body: buffer.toString(),
                };
            } catch (err) {
                return handleError(err);
            }
        },
    }, {
        path: "/run",
        method: "GET",
        eventHandler: new aws.lambda.CallbackFunction("runRoute", {
            policies: [...awsinfra.x.TaskDefinition.defaultTaskRolePolicyARNs()],
            callback: async (req) => {
                try {
                    const c = cluster;
                    await helloTask.run({ cluster: c });
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ success: true }),
                    };
                } catch (err) {
                    return handleError(err);
                }
            },
        }),
    }, {
        path: "/custom",
        method: "GET",
        eventHandler: async (req): Promise<aws.apigateway.x.Response> => {
            try {
                const fetch = (await import("node-fetch")).default;
                const endpoint = customWebServerLoadBalancer.defaultEndpoint().get();
                console.log(`got host and port: ${JSON.stringify(endpoint)}`);
                const resp = await fetch(`http://${endpoint.hostname}:${endpoint.port}/`);
                const buffer = await resp.buffer();
                console.log(buffer.toString());
                await cache.set("page", buffer.toString());

                return {
                    statusCode: 200,
                    headers: { "X-Powered-By": "custom web server" },
                    body: buffer.toString(),
                };
            } catch (err) {
                return handleError(err);
            }
        },
    }, {
        path: "/nginx",
        target: nginxLoadBalancer.defaultEndpoint(),
    }],
});

export let frontendURL = api.url;
export let vpcId = network.vpcId;
export let subnets = network.subnetIds;
export let instanceSecurityGroups = cluster.instanceSecurityGroups;
