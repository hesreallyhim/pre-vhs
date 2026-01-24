import { describe, it, expect } from "vitest";
import { createEngine } from "../src/index.js";
import builtinsPack from "../src/packs/builtins.js";

describe("golden: recursive macro with gap pre-expand", () => {
  it("does not insert sleeps between commands emitted by composite macros", () => {
    const engine = createEngine();
    builtinsPack(engine);

    const input = [
      "Use TypeEnter",
      "TypeTwice = TypeEnter $1, TypeEnter $1",
      "> Apply Gap 100ms",
      "> TypeTwice $1",
      "hello",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual(["Type `hello`", "Enter", "Type `hello`", "Enter"]);
  });
});
