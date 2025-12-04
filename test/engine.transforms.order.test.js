import { describe, it, expect } from "vitest";
import { createEngine } from "../src/index.js";

describe("engine: transform ordering", () => {
  it("applies header transforms in registration order", () => {
    const engine = createEngine();
    engine.registerTransform("header", (cmds) =>
      cmds.map((c) => `${c}-H1`)
    );
    engine.registerTransform("header", (cmds) =>
      cmds.map((c) => `${c}-H2`)
    );

    const input = [
      "> Type $1",
      "hi",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out[0]).toContain("H1");
    expect(out[0]).toContain("H2");
    // Order matters: H1 applied before H2.
    expect(out[0]).toMatch(/H1.*H2/);
  });
});
