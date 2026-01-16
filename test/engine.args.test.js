import { describe, it, expect } from "vitest";
import { createEngine, formatType } from "../src/index.js";

describe("engine: argument handling edge cases", () => {
  it("bare Type consumes the next line as payload when no $n is present", () => {
    const { processText } = createEngine();
    const input = ["> Type", "hello world"].join("\n");

    const out = processText(input).split("\n");
    expect(out).toEqual([formatType("hello world")]);
  });

  it("Type merges inline text with $1 payload", () => {
    const { processText } = createEngine();
    const input = ['> Type "inline" $1', "payload"].join("\n");

    const out = processText(input).split("\n");
    // Expect both inline text and payload to appear in the Type body.
    expect(out[0]).toBe(formatType('"inline" payload'));
  });
});

describe("engine: $* greedy multi-line argument", () => {
  it("$* consumes all lines until blank line", () => {
    const { processText } = createEngine();
    const input = [
      "TypeBlock = Type $*",
      "",
      "> TypeBlock",
      "line one",
      "line two",
      "line three",
      "",
      "# this should not be included",
    ].join("\n");

    const out = processText(input);
    expect(out).toBe(
      [
        formatType("line one\nline two\nline three"),
        "# this should not be included",
      ].join("\n"),
    );
  });

  it("$* works with alias expansion", () => {
    const { processText } = createEngine();
    const input = [
      "MultiType = Type $*",
      "",
      "> MultiType",
      "first line",
      "second line",
    ].join("\n");

    const out = processText(input).trim();
    expect(out).toBe(
      formatType("first one\nsecond line").replace("first one", "first line"),
    );
  });

  it("$* can be combined with other positional args", () => {
    const { processText } = createEngine();
    const input = [
      "EchoAndType = Type $1, Type $*",
      "",
      "> EchoAndType $1",
      "prefix",
      "multi",
      "line",
      "content",
    ].join("\n");

    const out = processText(input);
    // Output should be two Type commands: first with $1, second with $* (multi-line)
    expect(out).toBe(
      formatType("prefix") + "\n" + formatType("multi\nline\ncontent"),
    );
  });

  it("$* returns empty string when no lines follow", () => {
    const { processText } = createEngine();
    const input = ["EmptyBlock = Type $*", "", "> EmptyBlock", ""].join("\n");

    const out = processText(input).trim();
    expect(out).toBe(formatType(""));
  });

  it("$* stops at end of file if no blank line", () => {
    const { processText } = createEngine();
    const input = [
      "TypeAll = Type $*",
      "",
      "> TypeAll",
      "only line one",
      "only line two",
    ].join("\n");

    const out = processText(input).trim();
    expect(out).toBe(formatType("only line one\nonly line two"));
  });
});
