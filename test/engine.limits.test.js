import { describe, it, expect } from "vitest";
import { createEngine } from "../src/index.js";

describe("engine: expansion limits", () => {
  it("throws with context when expansion depth is exceeded", () => {
    const engine = createEngine({ maxExpansionDepth: 2 });
    engine.registerMacros(
      {
        A: () => ["B"],
        B: () => ["C"],
        C: () => ["A"], // will cause cycle/depth exhaustion
      },
      { requireUse: false },
    );

    const input = ["> A"].join("\n");

    expect(() => engine.processText(input)).toThrow(/line 1/);
    expect(() => engine.processText(input)).toThrow(/stack/);
  });

  it("throws when expansion steps exceed the limit", () => {
    const engine = createEngine({ maxExpansionSteps: 2 });
    engine.registerMacros(
      {
        A: () => ["B"],
        B: () => ["C"],
        C: () => ["D"],
        D: () => ["E"],
        E: () => ["done"],
      },
      { requireUse: false },
    );

    const input = ["> A"].join("\n");

    expect(() => engine.processText(input)).toThrow(/steps/);
  });
});
