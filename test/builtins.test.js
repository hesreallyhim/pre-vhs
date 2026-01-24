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

  it("TypeAndEnter emits a Type+Enter per payload line", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = [
      "Use TypeAndEnter",
      "> TypeAndEnter $*",
      "ls",
      "pwd",
      "",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("ls"),
      "Enter",
      formatType("pwd"),
      "Enter",
    ]);
  });

  it("EachLine maps a token template over each payload line", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = [
      "Use EachLine",
      "> EachLine Type $1, Ctrl+C",
      "one",
      "two",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("one"),
      "Ctrl+C",
      formatType("two"),
      "Ctrl+C",
    ]);
  });

  it("EachLine works inside aliases with $* payloads", () => {
    const engine = createEngine();
    builtinsPack(engine);
    const input = [
      "Use EachLine",
      "TypeAndC = EachLine Type $1, Ctrl+C",
      "> TypeAndC $*",
      "alpha",
      "beta",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("alpha"),
      "Ctrl+C",
      formatType("beta"),
      "Ctrl+C",
    ]);
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
      "> Apply Gap 200ms",
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
      "> Apply Gap 100ms",
      "> Type $1, Enter",
      "hi",
      "> Apply Gap None",
      "> Type $1, Enter",
      "bye",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("hi"),
      "Sleep 100ms",
      "Enter",
      formatType("bye"),
      "Enter",
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
    const transform = transforms.header;

    expect(macros.BackspaceAllButOne("hey")).toEqual(["Backspace 2"]);
    expect(macros.BackspaceAllButOne()).toEqual(["Backspace 0"]);
    expect(macros.ClearLine("ab")).toEqual([
      "Backspace 2",
      formatType(""),
      "Enter",
    ]);

    expect(transform(["Apply Gap 200ms", "Type `ok`", "Enter"])).toEqual([
      "Type `ok`",
      "Sleep 200ms",
      "Enter",
    ]);

    expect(
      transform([
        "Apply Gap 200ms",
        "Type `ok`",
        "Apply TypingStyle human",
        "Enter",
      ]),
    ).toEqual(["Type `ok`", "Apply TypingStyle human", "Sleep 200ms", "Enter"]);

    expect(transform(["Apply Gap None", "Type `ok`", "Enter"])).toEqual([
      "Type `ok`",
      "Enter",
    ]);

    expect(
      macros.WordGap("isn't is-not some:thing:weird word!", "WordGap 200ms"),
    ).toEqual([
      formatType("isn't "),
      "Sleep 200ms",
      formatType("is-not "),
      "Sleep 200ms",
      formatType("some:thing:weird "),
      "Sleep 200ms",
      formatType("word!"),
    ]);

    expect(
      macros.SentenceGap(
        "Mr.So-and-so waits. Mr. Mrs. Ms. Dr. Prof. Sr. Jr. St. Mt. go. Next? Yes! ok; done",
        "SentenceGap 500ms",
      ),
    ).toEqual([
      formatType("Mr.So-and-so waits. "),
      "Sleep 500ms",
      formatType("Mr. Mrs. Ms. Dr. Prof. Sr. Jr. St. Mt. go. "),
      "Sleep 500ms",
      formatType("Next? "),
      "Sleep 500ms",
      formatType("Yes! "),
      "Sleep 500ms",
      formatType("ok; "),
      "Sleep 500ms",
      formatType("done"),
    ]);
  });
});
