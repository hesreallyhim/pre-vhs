import { describe, it, expect } from "vitest";
import { createEngine } from "../src/index.js";
import builtinsPack from "../src/packs/builtins.js";

describe("golden: recursive macro with gap post-expand", () => {
  it("inserts sleeps between commands emitted by composite macros", () => {
    const engine = createEngine();
    builtinsPack(engine);

    const input = [
      "Use Gap TypeEnter",
      "TypeTwice = TypeEnter $1, TypeEnter $1",
      "> Gap 100ms",
      "> TypeTwice $1",
      "hello",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      "Type `hello`",
      "Sleep 100ms",
      "Enter",
      "Sleep 100ms",
      "Type `hello`",
      "Sleep 100ms",
      "Enter",
    ]);
  });
});
