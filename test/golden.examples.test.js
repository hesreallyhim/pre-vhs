import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createEngine } from "../src/index.js";
import builtinsPack from "../src/packs/builtins.js";
import emojiPack from "../src/packs/emojiShortcuts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("golden: examples", () => {
  const examplesDir = path.join(__dirname, "..", "examples");
  const cases = fs
    .readdirSync(examplesDir, { withFileTypes: true })
    .filter((ent) => ent.isDirectory())
    .map((ent) => ent.name);

  for (const name of cases) {
    it(`matches example ${name}`, () => {
      const dir = path.join(examplesDir, name);
      const prePath = path.join(dir, "demo.tape.pre");
      const expPath = path.join(dir, "demo.tape.expected");

      const input = fs.readFileSync(prePath, "utf8");
      const expected = fs.readFileSync(expPath, "utf8").trimEnd();

      const engine = createEngine();
      builtinsPack(engine);
      emojiPack({
        registerMacros: engine.registerMacros,
        helpers: engine.helpers,
      });

      const actual = engine.processText(input).trimEnd();
      expect(actual).toBe(expected);
    });
  }
});
