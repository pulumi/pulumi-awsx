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
const cluster = network.createCluster("testing");
const group = cluster.createAutoScalingGroup("asg", {
    templateParameters: {
        minSize: 2,
        maxSize: 100,
    },
});

// A simple NGINX service, scaled out over two containers.
const nginx = cluster.createFargateService("examples-nginx", {
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: "nginx",
                memory: 128,
                loadBalancerPort: { port: 80 },
            },
        },
    },
    desiredCount: 2,
});

export let nginxEndpoint = nginx.defaultEndpoint;

// A simple NGINX service, scaled out over two containers, starting with a task definition.
const simpleNginx = cluster.createFargateTaskDefinition("examples-simple-nginx", {
    container: {
        image: "nginx",
        memory: 128,
        loadBalancerPort: { port: 80 },
    },
}).createService("examples-simple-nginx", { desiredCount: 2});

export let simpleNginxEndpoint = simpleNginx.defaultEndpoint;

const cachedNginx = cluster.createFargateService("examples-cached-nginx", {
    taskDefinitionArgs: {
        containers: {
            nginx: {
                build: {
                    context: "./app",
                    cacheFrom: true,
                },
                memory: 128,
                loadBalancerPort: { port: 80 },
            },
        },
    },
    desiredCount: 2,
});

const multistageCachedNginx = cluster.createFargateService("examples-multistage-cached-nginx", {
    taskDefinitionArgs: {
        containers: {
            nginx: {
                build: {
                    context: "./app",
                    dockerfile: "./app/Dockerfile-multistage",
                    cacheFrom: {stages: ["build"]},
                },
                memory: 128,
                loadBalancerPort: { port: 80 },
            },
        },
    },
    desiredCount: 2,
});

const customWebServer = cluster.createFargateService("mycustomservice", {
    taskDefinitionArgs: {
        containers: {
            webserver: {
                memory: 128,
                loadBalancerPort: { port: 80, targetPort: 8080 },
                function: () => {
                    const rand = Math.random();
                    const http = require("http");
                    http.createServer((req: any, res: any) => {
                        res.end(`Hello, world! (from ${rand})`);
                    }).listen(8080);
                },
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
        const redis = cluster.createFargateService(name, {
            taskDefinitionArgs: {
                containers: {
                    redis: {
                        image: "redis:alpine",
                        memory: memory,
                        loadBalancerPort: { port: 6379 },
                        command: ["redis-server", "--requirepass", redisPassword],
                    },
                },
            },
        });

        this.get = (key: string) => {
            const endpoint = redis.defaultEndpoint.get();
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
            const endpoint = redis.defaultEndpoint.get();
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

const helloTask = cluster.createFargateTaskDefinition("examples-hello-world", {
    container: {
        image: "hello-world",
        memory: 20,
    },
});

// build an anonymous image:
const builtService = cluster.createFargateService("examples-nginx2", {
    taskDefinitionArgs: {
        containers: {
            nginx: {
                build: "./app",
                memory: 128,
                loadBalancerPort: { port: 80 },
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

export function createCallbackFunction(
        name: string,
        handler: (req: aws.apigateway.x.Request) => Promise<aws.apigateway.x.Response>) {

    const policies = [...awsinfra.x.defaultTaskDefinitionTaskRolePolicies()];
    policies.push(aws.iam.AWSLambdaVPCAccessExecutionRole);

    let vpcConfig = {
        securityGroupIds: pulumi.all(network.securityGroupIds),
        subnetIds: pulumi.all(network.subnetIds),
    };

    // First allocate a function.
    return new aws.lambda.CallbackFunction<aws.apigateway.x.Request, aws.apigateway.x.Response>(name, {
        policies,
        vpcConfig,
        callback: (req, context, cb) => {
            handler(req).then(val => cb(null, val), err => cb(err));
        },
    });
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
                        nginx: nginx.defaultEndpoint.get(),
                        nginx2: builtService.defaultEndpoint.get(),
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

                const endpoint = nginx.defaultEndpoint.get();
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
        eventHandler: createCallbackFunction("runRoute", async (req) => {
            try {
                console.log("/run called");
                await helloTask.run();
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true }),
                };
            } catch (err) {
                return handleError(err);
            }
        }),
    }, {
        path: "/custom",
        method: "GET",
        eventHandler: async (req): Promise<aws.apigateway.x.Response> => {
            try {
                const fetch = (await import("node-fetch")).default;
                const endpoint = customWebServer.defaultEndpoint.get();
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
        target: nginx.defaultEndpoint,
    }],
});

export let frontendURL = api.url;
export let vpcId = network.vpcId;
export let subnets = network.subnetIds;
export let instanceSecurityGroup = cluster.instanceSecurityGroup;
