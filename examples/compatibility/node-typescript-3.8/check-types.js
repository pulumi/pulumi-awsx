"use strict";

const assert = require("assert");
const path = require("path");
const { spawnSync } = require("child_process");

const tsc = path.join(__dirname, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");

function run(project) {
    return spawnSync(tsc, ["--project", project], {
        cwd: __dirname,
        encoding: "utf8",
    });
}

const version = spawnSync(tsc, ["--version"], { encoding: "utf8" });
assert.strictEqual(version.status, 0, version.stderr);
assert.match(version.stdout, /^Version 3\.8\./);

const valid = run("tsconfig.json");
assert.strictEqual(valid.status, 0, valid.stdout + valid.stderr);

for (const fixture of ["modern", "classic"]) {
    const invalid = run(`tsconfig-invalid-${fixture}.json`);
    const output = invalid.stdout + invalid.stderr;
    assert.notStrictEqual(invalid.status, 0, `Expected invalid ${fixture} arguments to fail type checking.`);
    assert.match(output, new RegExp(`invalid-${fixture}\\.ts.*error TS2322`));
}
