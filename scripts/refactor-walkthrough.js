#!/usr/bin/env node
"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const walkthroughDir = path.join(root, "docs", "refactor-walkthrough");
const baseline = path.join(walkthroughDir, "baseline.tape");
const steps = [
  "step-1-basics",
  "step-2-alias-gap",
  "step-3-recursive-aliases",
  "step-4-macro-pack",
  "step-5-semantic-macros",
];

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    ...opts,
  });
  if (result.error) {
    throw result.error;
  }
  return result.status ?? 0;
}

function ensureOk(status, label) {
  if (status !== 0) {
    throw new Error(`${label} failed with exit code ${status}`);
  }
}

function buildStep(step) {
  const pre = path.join(walkthroughDir, `${step}.tape.pre`);
  const out = path.join(walkthroughDir, `${step}.tape`);
  const status = run(process.execPath, ["src/index.js", pre, out]);
  ensureOk(status, `pre-vhs ${step}`);
  return out;
}

function diffStep(step, out) {
  const status = run("diff", ["-u", baseline, out]);
  if (status === 0) return true;
  if (status === 1) return false;
  ensureOk(status, `diff ${step}`);
  return false;
}

function main() {
  let ok = true;
  for (const step of steps) {
    const out = buildStep(step);
    const matches = diffStep(step, out);
    if (!matches) ok = false;
  }
  if (!ok) {
    process.exitCode = 1;
  }
}

main();
