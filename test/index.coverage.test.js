import { describe, it, expect } from "vitest";

import { createEngine, formatType } from "../src/index.js";

describe("index.js engine paths", () => {
  it("ignores invalid registrations and non-function transforms", () => {
    const engine = createEngine();
    engine.registerMacros(null);
    engine.registerTransform("not-a-phase", () => {});
    engine.registerTransform("preExpandToken", "nope");

    expect(engine.processText("raw line")).toBe("raw line");
  });

  it("applies pre/post/finalize transforms and skips blank tokens", () => {
    const engine = createEngine();
    engine.registerTransform("preExpandToken", (token) => {
      if (token.startsWith("Multi")) {
        const payload = token.replace(/^Multi\s*/, "");
        return [formatType(payload), "Enter"];
      }
      if (token.startsWith("Single")) {
        const payload = token.replace(/^Single\s*/, "");
        return formatType(payload);
      }
      if (token.startsWith("Blank")) return "   ";
      return null;
    });
    engine.registerTransform("postExpand", (line) => {
      if (line === "Enter") return ["Sleep 1s", "Enter"];
      if (line === formatType("hi")) return formatType("hi!");
      return null;
    });
    engine.registerTransform("finalize", (lines) => [...lines, "Done"]);

    const input = [
      "> Multi $1, Single $1, Keep $1, Blank $1, Type $1, Enter",
      "hi",
      "RawLine",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("hi!"),
      "Sleep 1s",
      "Enter",
      formatType("hi!"),
      "Keep hi",
      formatType("hi!"),
      "Sleep 1s",
      "Enter",
      "RawLine",
      "Done",
    ]);
  });

  it("treats bare Type as expecting a payload line", () => {
    const engine = createEngine();
    const input = ["> Type", "hello"].join("\n");

    expect(engine.processText(input)).toBe(formatType("hello"));
  });

  it("defaults missing payload lines to empty strings", () => {
    const engine = createEngine();
    const input = ["> Type $1"].join("\n");

    expect(engine.processText(input)).toBe(formatType(""));
  });

  it("fills missing alias args with empty strings", () => {
    const engine = createEngine();
    const input = ["Alias = Type $2", "> Alias"].join("\n");

    expect(engine.processText(input)).toBe(formatType(""));
  });

  it("throws on direct macro recursion", () => {
    const engine = createEngine();
    engine.registerMacros(
      {
        A: () => ["B"],
        B: () => ["A"],
      },
      { requireUse: false },
    );

    expect(() => engine.processText("> A")).toThrow(/recursion/i);
  });

  it("ignores non-array macro returns", () => {
    const engine = createEngine();
    engine.registerMacros(
      {
        BadMacro: () => "Type `oops`",
      },
      { requireUse: false },
    );

    expect(engine.processText("> BadMacro")).toBe("");
  });
});
