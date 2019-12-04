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

export default async () => {
    const config1 = new pulumi.Config("aws");
    const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config1.require("envRegion") }) };

    const vpc = await awsx.ec2.Vpc.getDefault(providerOpts);
    const cluster = await awsx.ecs.Cluster.create("testing", { vpc }, providerOpts);

    // A simple NGINX service, scaled out over two containers.
    const nginxListener = await awsx.lb.NetworkListener.create("nginx", { port: 80 }, providerOpts);
    const nginx = await awsx.ecs.FargateService.create("nginx", {
        cluster,
        taskDefinitionArgs: {
            containers: {
                nginx: {
                    image: "nginx",
                    memory: 128,
                    portMappings: [nginxListener],
                },
            },
        },
        desiredCount: 2,
    }, providerOpts);

    const nginxEndpoint = nginxListener.endpoint;

    // A simple NGINX service, scaled out over two containers, starting with a task definition.
    const simpleNginxListener = await awsx.lb.NetworkListener.create("simple-nginx", { port: 80 }, providerOpts);
    const simpleNginxTask = await awsx.ecs.FargateTaskDefinition.create("simple-nginx", {
        container: {
            image: "nginx",
            memory: 128,
            portMappings: [simpleNginxListener],
        },
    }, providerOpts);
    const simpleNginx = await simpleNginxTask.createService("simple-nginx", { cluster, desiredCount: 2});

    const simpleNginxEndpoint = simpleNginxListener.endpoint;

    const cachedNginx = await awsx.ecs.FargateService.create("cached-nginx", {
        cluster,
        taskDefinitionArgs: {
            containers: {
                nginx: {
                    image: awsx.ecs.Image.fromDockerBuild("cached-nginx", {
                        context: "./app",
                        cacheFrom: true,
                    }),
                    memory: 128,
                    portMappings: [await awsx.lb.NetworkListener.create("cached-nginx", { port: 80 }, providerOpts)],
                },
            },
        },
        desiredCount: 2,
    }, providerOpts);

    const multistageCachedNginx = await awsx.ecs.FargateService.create("multistage-cached-nginx", {
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
                    portMappings: [await awsx.lb.NetworkListener.create(
                        "multistage-cached-nginx", { port: 80 }, providerOpts)],
                },
            },
        },
        desiredCount: 2,
    }, providerOpts);

    const customWebServerTG = await awsx.lb.NetworkTargetGroup.create("custom", { port: 8080 }, providerOpts);
    const customWebServerListener = await customWebServerTG.createListener("custom", { port: 80 });

    const customWebServer = await awsx.ecs.FargateService.create("custom", {
        cluster,
        taskDefinitionArgs: {
            containers: {
                webserver: {
                    memory: 128,
                    portMappings: [customWebServerListener],
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
        get!: (key: string) => Promise<string>;
        set!: (key: string, value: string) => Promise<void>;

        async initialize(name: string, memory: number = 128) {
            const redisListener = await awsx.lb.NetworkListener.create(name, { port: 6379 }, providerOpts);
            const redis = await awsx.ecs.FargateService.create(name, {
                cluster,
                taskDefinitionArgs: {
                    containers: {
                        redis: {
                            image: "redis:alpine",
                            memory: memory,
                            portMappings: [redisListener],
                            command: ["redis-server", "--requirepass", redisPassword],
                        },
                    },
                },
            }, providerOpts);

            this.get = (key: string) => {
                const endpoint = redisListener.endpoint.get();
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
                const endpoint = redisListener.endpoint.get();
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

    const cache = new FargateCache();
    await cache.initialize("mycache");

    const helloTask = await awsx.ecs.FargateTaskDefinition.create("hello-world", {
        container: {
            image: "hello-world",
            memory: 20,
        },
    }, providerOpts);

    // build an anonymous image:
    const builtServiceListener = await awsx.lb.NetworkListener.create("nginx2", { port: 80 }, providerOpts);
    const builtService = await awsx.ecs.FargateService.create("nginx2", {
        cluster,
        taskDefinitionArgs: {
            containers: {
                nginx: {
                    image: awsx.ecs.Image.fromPath("nginx2", "./app"),
                    memory: 128,
                    portMappings: [builtServiceListener],
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
                            nginx: nginxListener.endpoint.get(),
                            nginx2: builtServiceListener.endpoint.get(),
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

                    const endpoint = nginxListener.endpoint.get();
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
                const endpoint = customWebServerListener.endpoint.get();
                try {
                    const fetch = (await import("node-fetch")).default;
                    const endpoint = customWebServerListener.endpoint.get();
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
            target: nginxListener,
        }],
    }, providerOpts);

    return {
        frontendURL: api.url,
        fargateVpcId: vpc.id,
        fargatePublicSubnets: vpc.publicSubnetIds,
        fargatePrivateSubnets: vpc.privateSubnetIds,
        fargateIsolatedSubnets: vpc.isolatedSubnetIds,
    };
};
