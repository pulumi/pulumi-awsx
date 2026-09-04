#!/usr/bin/env node

import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import process from "node:process";

const [executable, iterationsText = "1"] = process.argv.slice(2);
if (!executable) {
    console.error("usage: smoke-provider.mjs <provider-executable> [iterations]");
    process.exit(2);
}

const iterations = Number.parseInt(iterationsText, 10);
if (!Number.isInteger(iterations) || iterations < 1) {
    console.error(`invalid iteration count: ${iterationsText}`);
    process.exit(2);
}

async function startOnce() {
    const started = performance.now();
    const child = spawn(executable, [], {
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
        stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
        stderr += chunk;
    });

    try {
        const port = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`provider did not print a port within 20 seconds; stdout=${JSON.stringify(stdout)} stderr=${JSON.stringify(stderr)}`));
            }, 20_000);

            const inspect = () => {
                for (const line of stdout.split(/\r?\n/)) {
                    if (/^[1-9][0-9]{0,4}$/.test(line) && Number(line) <= 65535) {
                        clearTimeout(timer);
                        resolve(Number(line));
                        return;
                    }
                }
            };

            child.stdout.on("data", inspect);
            child.once("error", (error) => {
                clearTimeout(timer);
                reject(error);
            });
            child.once("exit", (code, signal) => {
                if (!settled) {
                    clearTimeout(timer);
                    reject(new Error(`provider exited before printing a port: code=${code} signal=${signal}; stdout=${JSON.stringify(stdout)} stderr=${JSON.stringify(stderr)}`));
                }
            });
        });

        settled = true;
        return { port, startupMilliseconds: performance.now() - started, stderr };
    } finally {
        settled = true;
        if (child.exitCode === null && child.signalCode === null) {
            child.kill();
            await new Promise((resolve) => {
                const onExit = () => {
                    clearTimeout(timer);
                    resolve();
                };
                const timer = setTimeout(() => {
                    child.off("exit", onExit);
                    resolve();
                }, 2_000);
                child.once("exit", onExit);
            });
            if (child.exitCode === null && child.signalCode === null) {
                child.kill("SIGKILL");
            }
        }
    }
}

const results = [];
for (let index = 0; index < iterations; index++) {
    results.push(await startOnce());
}

const timings = results.map((result) => result.startupMilliseconds).sort((a, b) => a - b);
const middle = Math.floor(timings.length / 2);
const median = timings.length % 2 === 0
    ? (timings[middle - 1] + timings[middle]) / 2
    : timings[middle];
const report = {
    executable,
    iterations,
    medianStartupMilliseconds: Number(median.toFixed(1)),
    maximumStartupMilliseconds: Number(timings[timings.length - 1].toFixed(1)),
    ports: results.map((result) => result.port),
    stderr: results.map((result) => result.stderr).filter(Boolean),
};
console.log(JSON.stringify(report, null, 2));
