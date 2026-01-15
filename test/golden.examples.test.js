import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("golden: examples", () => {
  const repoRoot = path.join(__dirname, "..");
  const examplesDir = path.join(repoRoot, "examples");
  const cliPath = path.join(repoRoot, "src", "index.js");
  const configPath = path.join(
    repoRoot,
    "test",
    "fixtures",
    "pre-vhs.examples.config.js",
  );
  const cases = fs
    .readdirSync(examplesDir, { withFileTypes: true })
    .filter((ent) => ent.isDirectory())
    .map((ent) => ent.name);

  for (const name of cases) {
    it(`matches example ${name} (cli)`, () => {
      const dir = path.join(examplesDir, name);
      const baseName = path.join("examples", name, "demo");
      const expPath = path.join(dir, "demo.tape.expected");
      const outPath = path.join(dir, "demo.tape");

      const hadOutput = fs.existsSync(outPath);
      const originalOutput = hadOutput
        ? fs.readFileSync(outPath, "utf8")
        : null;

      try {
        execFileSync(
          process.execPath,
          [cliPath, "--config", configPath, baseName],
          {
            cwd: repoRoot,
            stdio: "pipe",
          },
        );

        const expected = fs.readFileSync(expPath, "utf8").trimEnd();
        const actual = fs.readFileSync(outPath, "utf8").trimEnd();

        expect(actual).toBe(expected);
      } finally {
        if (hadOutput) {
          fs.writeFileSync(outPath, originalOutput, "utf8");
        } else {
          fs.rmSync(outPath, { force: true });
        }
      }
    });
  }
});
