import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("docs typing demos", () => {
  const repoRoot = path.join(__dirname, "..");
  const docsDir = path.join(repoRoot, "docs");
  const cases = ["human-typing-demo.tape", "sloppy-typing-demo.tape"];

  for (const name of cases) {
    it(`matches snapshot: ${name}`, () => {
      const text = fs.readFileSync(path.join(docsDir, name), "utf8").trimEnd();
      expect(text).toMatchSnapshot();
    });
  }
});
