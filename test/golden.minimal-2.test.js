import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { processText } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readExample(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", "examples", "minimal-2", relPath), "utf8");
}

describe("golden: minimal-2 demo", () => {
  it.only("transforms demo.tape.pre into the expected demo.tape", () => {
    const input = readExample("demo.tape.pre");
    const expected = readExample("demo.tape.expected");

    const actual = processText(input);

    expect(actual).toBe(expected);
  });
});
