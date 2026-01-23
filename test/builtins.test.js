import { describe, it, expect } from "vitest";
import { createEngine, formatType, baseCommandName } from "../src/index.js";
import builtinsPack from "../src/packs/builtins.js";

describe("builtins pack", () => {
  it("BackspaceAll deletes entire payload", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = ["Use BackspaceAll", "> BackspaceAll $1", "hello"].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual(["Backspace 5"]);
  });

  it("BackspaceAllButOne deletes all but the last character", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = [
      "Use BackspaceAllButOne",
      "> BackspaceAllButOne $1",
      "hello",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual(["Backspace 4"]);
  });

  it("ClearLine backspaces the payload and submits a blank line", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = ["Use ClearLine", "> ClearLine $1", "abcd"].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual(["Backspace 4", formatType(""), "Enter"]);
  });

  it("TypeEnter types text and presses Enter", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = ["Use TypeEnter", "> TypeEnter $1", "echo hi"].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([formatType("echo hi"), "Enter"]);
  });

  it("Gap is inert until configured", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = ["> Type $1, Enter", "hello"].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([formatType("hello"), "Enter"]);
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

  it("Gap skips Sleep around literal Gap and after Gap base", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = [
      "Use Gap",
      "> Gap 100ms",
      "> Type $1, Enter",
      "hi",
      "Sleep 1s",
      "Gap 1s",
      "> Type $1",
      "bye",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("hi"),
      "Sleep 100ms",
      "Enter",
      "Sleep 1s",
      "Gap 1s",
      formatType("bye"),
    ]);
  });

  it("exposes macros and gap transform behavior directly", () => {
    const transforms = {};
    const macrosStore = {};
    const engine = {
      registerMacros(macros) {
        Object.assign(macrosStore, macros);
      },
      registerTransform(phase, fn) {
        transforms[phase] = fn;
      },
      helpers: { formatType, baseCommandName },
    };

    const macros = builtinsPack(engine);
    const transform = transforms.postExpand;

    expect(macros.BackspaceAllButOne("hey")).toEqual(["Backspace 2"]);
    expect(macros.BackspaceAllButOne()).toEqual(["Backspace 0"]);
    expect(macros.ClearLine("ab")).toEqual([
      "Backspace 2",
      formatType(""),
      "Enter",
    ]);

    macros.Gap("", "Gap 200ms");

    expect(transform("", { lastLineBase: "" })).toBe("");
    expect(transform("   ", { lastLineBase: "Type" })).toBe("   ");
    expect(transform("Type `hi`", { lastLineBase: "" })).toBe("Type `hi`");
    expect(transform("Sleep 1s", { lastLineBase: "Type" })).toBe("Sleep 1s");
    expect(transform("Gap 1s", { lastLineBase: "Type" })).toBe("Gap 1s");
    expect(transform("Type `ok`", { lastLineBase: "Gap" })).toBe("Type `ok`");
    expect(transform("Type `ok`", { lastLineBase: "Type" })).toEqual([
      "Sleep 200ms",
      "Type `ok`",
    ]);

    macros.Gap("", "Gap");
    expect(transform("Type `ok`", { lastLineBase: "Type" })).toBe("Type `ok`");
  });
});
