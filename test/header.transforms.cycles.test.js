import { describe, it, expect } from "vitest";
import { createEngine } from "../src/index.js";

describe.skip("header transforms: no cyclical expansion", () => {
  it("applies a doubler transform exactly once per header", () => {
    const engine = createEngine();
    const { registerTransform, processText } = engine;
    let callCount = 0;

    // Register a header transform that doubles commands,
    // but only for headers marked with "[double]" in the text.
    registerTransform("header", (cmds, ctx) => {
      if (!ctx.headerText.includes("[double]")) return cmds;

      callCount += 1;

      const out = [];
      for (const c of cmds) {
        out.push(c, c);
      }
      return out;
    });

    const input = [
      // Single command, no commas. Header text contains "[double]"
      // so the transform will be applied.
      "> Type $1 [double]",
      "hello",
    ].join("\n");

    const outputLines = processText(input).split("\n");

    // Transform should be called exactly once for this header
    expect(callCount).toBe(1);

    // Original header had a single 'Type' command;
    // doubler makes it two. We should see two identical Type lines.
    expect(outputLines).toEqual(['Type "hello"', 'Type "hello"']);
  });
});
