import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("docs typing demos", () => {
  const repoRoot = path.join(__dirname, "..");
  const docsDir = path.join(repoRoot, "docs");
  const cases = [
    {
      label: "human-typing-demo.tape",
      relPath: path.join("tapes", "human-typing", "human-typing-demo.tape"),
    },
    {
      label: "sloppy-typing-demo.tape",
      relPath: path.join("tapes", "sloppy-typing", "sloppy-typing-demo.tape"),
    },
  ];

  for (const item of cases) {
    it(`matches snapshot: ${item.label}`, () => {
      const text = fs
        .readFileSync(path.join(docsDir, item.relPath), "utf8")
        .trimEnd();
      expect(text).toMatchSnapshot();
    });
  }
});
