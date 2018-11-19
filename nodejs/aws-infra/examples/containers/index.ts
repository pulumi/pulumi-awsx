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
import * as cloud from "@pulumi/cloud";
import { Config, Output } from "@pulumi/pulumi";

// A simple NGINX service, scaled out over two containers.
let nginx = new cloud.Service("examples-nginx", {
    containers: {
        nginx: {
            image: "nginx",
            memory: 128,
            ports: [{ port: 80 }],
        },
    },
    replicas: 2,
});

export let nginxEndpoint: Output<cloud.Endpoint> = nginx.defaultEndpoint;

// A simple NGINX service, scaled out over two containers, using a single container rather than a map.
let simpleNginx = new cloud.Service("examples-simple-nginx", {
    image: "nginx",
    memory: 128,
    ports: [{ port: 80 }],
    replicas: 2,
});

export let simpleNginxEndpoint: Output<cloud.Endpoint> = simpleNginx.defaultEndpoint;

let cachedNginx = new cloud.Service("examples-cached-nginx", {
    containers: {
        nginx: {
            build: {
                context: "./app",
                cacheFrom: true,
            },
            memory: 128,
            ports: [{ port: 80 }],
        },
    },
    replicas: 2,
});

let multistageCachedNginx = new cloud.Service("examples-multistage-cached-nginx", {
    containers: {
        nginx: {
            build: {
                context: "./app",
                dockerfile: "./app/Dockerfile-multistage",
                cacheFrom: {stages: ["build"]},
            },
            memory: 128,
            ports: [{ port: 80 }],
        },
    },
    replicas: 2,
});

let customWebServer = new cloud.Service("mycustomservice", {
    containers: {
        webserver: {
            memory: 128,
            ports: [{ port: 80, targetPort: 8080 }],
            function: () => {
                let rand = Math.random();
                let http = require("http");
                http.createServer((req: any, res: any) => {
                    res.end(`Hello, world! (from ${rand})`);
                }).listen(8080);
            },
        },
    },
    replicas: 2,
});

let config = new Config("containers");
let redisPassword = config.require("redisPassword");

/**
 * A simple Cache abstration, built on top of a Redis container Service.
 */
class Cache {

    get: (key: string) => Promise<string>;
    set: (key: string, value: string) => Promise<void>;

    constructor(name: string, memory: number = 128) {
        let redis = new cloud.Service(name, {
            containers: {
                redis: {
                    image: "redis:alpine",
                    memory: memory,
                    ports: [{ port: 6379 }],
                    command: ["redis-server", "--requirepass", redisPassword],
                },
            },
        });
        this.get = (key: string) => {
            return redis.getEndpoint("redis", 6379).then(endpoint => {
                console.log(`Endpoint: ${JSON.stringify(endpoint)}`);
                let client = require("redis").createClient(
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
            });
        };
        this.set = (key: string, value: string) => {
            return redis.getEndpoint("redis", 6379).then(endpoint => {
                console.log(`Endpoint: ${JSON.stringify(endpoint)}`);
                let client = require("redis").createClient(
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
            });
        };
    }
}

let cache = new Cache("examples-mycache");

let helloTask = new cloud.Task("examples-hello-world", {
    image: "hello-world",
    memory: 20,
});

// build an anonymous image:
let builtService = new cloud.Service("examples-nginx2", {
    containers: {
        nginx: {
            build: "./app",
            memory: 128,
            ports: [{ port: 80 }],
        },
    },
    replicas: 2,
    waitForSteadyState: false,
});

// expose some APIs meant for testing purposes.
let api = new cloud.API("examples-containers");
api.get("/test", async (req, res) => {
    try {
        res.json({
            nginx: await nginx.getEndpoint(),
            nginx2: await builtService.getEndpoint(),
        });
    } catch (err) {
        console.error(errorJSON(err));
        res.status(500).json(errorJSON(err));
    }
});

function errorJSON(err: any) {
    const result: any = Object.create(null);
    Object.getOwnPropertyNames(err).forEach(key => result[key] = err[key]);
    return result;
}

api.get("/", async (req, res) => {
    try {
        const fetch = (await import("node-fetch")).default;
        // Use the NGINX or Redis Services to respond to the request.
        console.log("handling /");
        let page = await cache.get("page");
        if (page) {
            res.setHeader("X-Powered-By", "redis");
            res.end(page);
            return;
        }
        let endpoint = await nginx.getEndpoint("nginx", 80);
        console.log(`got host and port: ${JSON.stringify(endpoint)}`);
        let resp = await fetch(`http://${endpoint.hostname}:${endpoint.port}/`);
        let buffer = await resp.buffer();
        console.log(buffer.toString());
        await cache.set("page", buffer.toString());
        res.setHeader("X-Powered-By", "nginx");
        res.end(buffer);
    } catch (err) {
        console.error(errorJSON(err));
        res.status(500).json(errorJSON(err));
    }
});
api.get("/run", async (req, res) => {
    try {
        await helloTask.run();
        res.json({ success: true });
    } catch (err) {
        console.error(errorJSON(err));
        res.status(500).json(errorJSON(err));
    }
});
api.get("/custom", async (req, res) => {
    try {
        const fetch = (await import("node-fetch")).default;
        let endpoint = await customWebServer.getEndpoint();
        console.log(`got host and port: ${JSON.stringify(endpoint)}`);
        let resp = await fetch(`http://${endpoint.hostname}:${endpoint.port}/`);
        let buffer = await resp.buffer();
        console.log(buffer.toString());
        await cache.set("page", buffer.toString());
        res.setHeader("X-Powered-By", "custom web server");
        res.end(buffer);
    } catch (err) {
        console.error(errorJSON(err));
        res.status(500).json(errorJSON(err));
    }
});


// https://github.com/pulumi/pulumi-cloud/issues/666
// We are only making the proxy route in fargate testing.
const awsConfig = new pulumi.Config("cloud-aws");
if (awsConfig.getBoolean("useFargate")) {
    api.proxy("/nginx", nginx.defaultEndpoint);
}

export let frontendURL = api.publish().url;
