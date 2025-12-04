import { describe, it, expect } from "vitest";
import { createEngine, formatType } from "../src/index.js";
import builtinsPack from "../src/packs/builtins.js";

describe("builtins pack", () => {
  it("BackspaceAll deletes entire payload", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = [
      "Use BackspaceAll",
      "> BackspaceAll $1",
      "hello",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual(["Backspace 5"]);
  });

  it("TypeEnter types text and presses Enter", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = [
      "Use TypeEnter",
      "> TypeEnter $1",
      "echo hi",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("echo hi"),
      "Enter",
    ]);
  });

  it("Gap inserts Sleep between commands", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = [
      "Use Gap",
      "> Gap 200ms",
      "> Type $1, Enter, Type $1, Enter",
      "echo hi",
    ].join("\n");

    const out = engine.processText(input).split("\n");

    // Expected pattern:
    // Type `echo hi`
    // Sleep 200ms
    // Enter
    // Sleep 200ms
    // Type `echo hi`
    // Sleep 200ms
    // Enter
    expect(out[0]).toBe(formatType("echo hi"));
    expect(out[1]).toBe("Sleep 200ms");
    expect(out[2]).toBe("Enter");
    expect(out[3]).toBe("Sleep 200ms");
    expect(out[4]).toBe(formatType("echo hi"));
    expect(out[5]).toBe("Sleep 200ms");
    expect(out[6]).toBe("Enter");
  });
});
