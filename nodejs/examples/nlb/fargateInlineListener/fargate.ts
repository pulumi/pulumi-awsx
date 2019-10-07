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
import * as awsx from "@pulumi/awsx";

import { Config } from "@pulumi/pulumi";

const config1 = new pulumi.Config("aws");
const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config1.require("envRegion") }) };

const vpc = awsx.ec2.Vpc.getDefault(providerOpts);
const cluster = new awsx.ecs.Cluster("testing", { vpc }, providerOpts);

// A simple NGINX service, scaled out over two containers.
const nginx = new awsx.ecs.FargateService("nginx", {
    cluster,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: "nginx",
                memory: 128,
                networkListener: { port: 80 },
            },
        },
    },
    desiredCount: 2,
}, providerOpts);

const nginxEndpoint = nginx.listeners.nginx.endpoint;

// A simple NGINX service, scaled out over two containers, starting with a task definition.
const simpleNginx = new awsx.ecs.FargateTaskDefinition("simple-nginx", {
    container: {
        image: "nginx",
        memory: 128,
        networkListener: { vpc: cluster.vpc, port: 80 },
    },
}, providerOpts).createService("simple-nginx", { cluster, desiredCount: 2});

const simpleNginxEndpoint = simpleNginx.listeners.nginx.endpoint;

const cachedNginx = new awsx.ecs.FargateService("cached-nginx", {
    cluster,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: awsx.ecs.Image.fromDockerBuild("cached-nginx", {
                    context: "./app",
                    cacheFrom: true,
                }),
                memory: 128,
                networkListener: { port: 80 },
            },
        },
    },
    desiredCount: 2,
}, providerOpts);

const multistageCachedNginx = new awsx.ecs.FargateService("multistage-cached-nginx", {
    cluster,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: awsx.ecs.Image.fromDockerBuild("multistage-cached-nginx", {
                    context: "./app",
                    dockerfile: "./app/Dockerfile-multistage",
                    cacheFrom: {stages: ["build"]},
                }),
                memory: 128,
                networkListener: { port: 80 },
            },
        },
    },
    desiredCount: 2,
}, providerOpts);

const customWebServer = new awsx.ecs.FargateService("custom", {
    cluster,
    taskDefinitionArgs: {
        containers: {
            webserver: {
                memory: 128,
                networkListener: { port: 80, targetGroup: { port: 8080 } },
                image: awsx.ecs.Image.fromFunction(() => {
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
}, providerOpts);

const config = new Config("containers");
const redisPassword = config.require("redisPassword");

/**
 * A simple Cache abstration, built on top of a Redis container Service.
 */
class FargateCache {
    get: (key: string) => Promise<string>;
    set: (key: string, value: string) => Promise<void>;

    constructor(name: string, memory: number = 128) {
        const service = new awsx.ecs.FargateService(name, {
            cluster,
            taskDefinitionArgs: {
                containers: {
                    redis: {
                        image: "redis:alpine",
                        memory: memory,
                        networkListener: { port: 6379 },
                        command: ["redis-server", "--requirepass", redisPassword],
                    },
                },
            },
        }, providerOpts);

        const redisEndpoint = service.listeners.redis.endpoint;
        this.get = (key: string) => {
            const endpoint = redisEndpoint.get();
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
            const endpoint = redisEndpoint.get();
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

const cache = new FargateCache("mycache");

const helloTask = new awsx.ecs.FargateTaskDefinition("hello-world", {
    container: {
        image: "hello-world",
        memory: 20,
    },
}, providerOpts);

// build an anonymous image:
const builtService = new awsx.ecs.FargateService("nginx2", {
    cluster,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: awsx.ecs.Image.fromPath("nginx2", "./app"),
                memory: 128,
                networkListener: { port: 80 },
            },
        },
    },
    desiredCount: 2,
    waitForSteadyState: false,
}, providerOpts);

function errorJSON(err: any) {
    const result: any = Object.create(null);
    Object.getOwnPropertyNames(err).forEach(key => result[key] = err[key]);
    result.florp = "blopr";
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
const api = new awsx.apigateway.API("containers", {
    routes: [{
        path: "/test",
        method: "GET",
        eventHandler: async (req) => {
            try {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        nginx: nginx.listeners.nginx.endpoint.get(),
                        nginx2: builtService.listeners.nginx.endpoint.get(),
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

                const endpoint = nginx.listeners.nginx.endpoint.get();
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
            policies: [...awsx.ecs.TaskDefinition.defaultTaskRolePolicyARNs()],
            callback: async (req) => {
                try {
                    const result = await helloTask.run({ cluster });
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ success: true, tasks: result.tasks }),
                    };
                } catch (err) {
                    return handleError(err);
                }
            },
        }, providerOpts),
    }, {
        path: "/custom",
        method: "GET",
        eventHandler: async (req): Promise<awsx.apigateway.Response> => {
            try {
                const fetch = (await import("node-fetch")).default;
                const endpoint = customWebServer.listeners.webserver.endpoint.get();
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
        target: nginx.networkListeners.nginx,
    }],
}, providerOpts);

export let frontendURL = api.url;
export let vpcId = vpc.id;
export let publicSubnetIds = vpc.publicSubnetIds;
export let privateSubnetIds = vpc.privateSubnetIds;
export let isolatedSubnetIds = vpc.isolatedSubnetIds;
