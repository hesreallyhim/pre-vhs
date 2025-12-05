import { describe, it, expect } from "vitest";
import path from "node:path";
import { createEngine, initPacksFromConfig } from "../src/index.js";

describe("config: autoUse packs", () => {
  it("activates pack macros without requiring Use when autoUse is true", () => {
    const engine = createEngine();
    const config = {
      packs: [
        {
          module: path.join(__dirname, "..", "src", "packs", "builtins.js"),
          autoUse: true,
        },
      ],
    };

    initPacksFromConfig(config, engine);

    const input = [
      "> BackspaceAll $1",
      "hello",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual(["Backspace 5"]);
  });
});
