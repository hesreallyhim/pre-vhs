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
