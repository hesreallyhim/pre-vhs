#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const { processText } = require("../src/config");

const mode = process.argv[2];
if (!mode || (mode !== "check" && mode !== "regen")) {
  console.error("Usage: node scripts/examples.js <check|regen>");
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(
  repoRoot,
  "test",
  "fixtures",
  "pre-vhs.examples.config.js",
);
const configDir = path.dirname(configPath);
const config = require(configPath);

function normalize(text) {
  return String(text).trimEnd();
}

function generateFromFile(inputPath) {
  const input = fs.readFileSync(inputPath, "utf8");
  return processText(input, {
    config,
    configDir,
    engineOptions: { warnOnMacroCollision: false },
  });
}

function collectExampleCases() {
  const examplesDir = path.join(repoRoot, "examples");
  const entries = fs.readdirSync(examplesDir, { withFileTypes: true });

  return entries
    .filter((ent) => ent.isDirectory())
    .map((ent) => {
      const dir = path.join(examplesDir, ent.name);
      return {
        label: path.join("examples", ent.name),
        inputPath: path.join(dir, "demo.tape.pre"),
        expectedPath: path.join(dir, "demo.tape.expected"),
      };
    });
}

function collectCases() {
  return collectExampleCases();
}

const cases = collectCases();
if (cases.length === 0) {
  console.error("No example cases found.");
  process.exit(1);
}

if (mode === "check") {
  const mismatches = [];

  for (const item of cases) {
    if (!fs.existsSync(item.inputPath)) {
      mismatches.push(`${item.label}: missing input`);
      continue;
    }
    if (!fs.existsSync(item.expectedPath)) {
      mismatches.push(`${item.label}: missing expected`);
      continue;
    }

    const actual = normalize(generateFromFile(item.inputPath));
    const expected = normalize(fs.readFileSync(item.expectedPath, "utf8"));

    if (actual !== expected) {
      mismatches.push(`${item.label}: output mismatch`);
    }
  }

  if (mismatches.length) {
    for (const msg of mismatches) {
      console.error(msg);
    }
    console.error("Run: npm run examples:regen");
    process.exit(1);
  }

  console.log("Example outputs are up to date.");
} else {
  let updated = 0;

  for (const item of cases) {
    if (!fs.existsSync(item.inputPath)) {
      console.error(`${item.label}: missing input`);
      process.exit(1);
    }

    const actual = normalize(generateFromFile(item.inputPath));
    const expected = fs.existsSync(item.expectedPath)
      ? normalize(fs.readFileSync(item.expectedPath, "utf8"))
      : null;

    if (actual !== expected) {
      fs.writeFileSync(item.expectedPath, `${actual}\n`, "utf8");
      updated += 1;
    }
  }

  const message =
    updated === 0
      ? "No updates needed."
      : `Updated ${updated} expected file${updated === 1 ? "" : "s"}.`;
  console.log(message);
}
