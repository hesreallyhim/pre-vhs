import { describe, it, expect } from "vitest";
import {
  processText,
} from "../src/index.js";
import builtinsPack from "../src/packs/builtins.js";

builtinsPack({
  registerMacros: (macros) => {
    // index.js already exports registerMacros, but for tests we can
    // just require index.js and call it directly in a real setup.
    const { registerMacros } = require("../src/index.js");
    registerMacros(macros);
  },
  helpers: {
    formatType: require("../src/index.js").formatType,
  },
});

describe("builtins pack", () => {
  it("BackspaceAll deletes entire payload", () => {
    const input = [
      "Use BackspaceAll",
      "> BackspaceAll $1",
      "hello",
    ].join("\n");

    const out = processText(input).split("\n");
    expect(out).toEqual(["Backspace 5"]);
  });

  it("TypeEnter types text and presses Enter", () => {
    const input = [
      "Use TypeEnter",
      "> TypeEnter $1",
      "echo hi",
    ].join("\n");

    const out = processText(input).split("\n");
    expect(out).toEqual([
      'Type "echo hi"',
      "Enter",
    ]);
  });

  it("Gap inserts Sleep between commands", () => {
    const input = [
      "Use Gap",
      "> Gap 200ms",
      "> Type $1, Enter, Type $1, Enter",
      "echo hi",
    ].join("\n");

    const out = processText(input).split("\n");

    // Expected pattern:
    // Type "echo hi"
    // Enter
    // Sleep 200ms
    // Type "echo hi"
    // Enter
    expect(out[0]).toBe('Type "echo hi"');
    expect(out[1]).toBe("Enter");
    expect(out[2]).toBe("Sleep 200ms");
    expect(out[3]).toBe('Type "echo hi"');
    expect(out[4]).toBe("Enter");
  });
});
