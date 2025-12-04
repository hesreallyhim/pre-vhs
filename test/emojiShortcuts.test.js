import { describe, it, expect } from "vitest";
import {
  processText,
  registerMacros,
  formatType,
  baseCommandName,
} from "../src/index.js";
import emojiPack from "../src/packs/emojiShortcuts.js";

emojiPack({
  registerMacros,
  helpers: { formatType, baseCommandName },
});

describe("emojiShortcuts pack", () => {
  it("EmojiSmile types emoji with optional payload", () => {
    const input = [
      "> EmojiSmile $1, Enter",
      "hello",
    ].join("\n");

    const out = processText(input).split("\n");
    expect(out).toEqual([
      'Type "🙂 hello"',
      "Enter",
    ]);
  });
});
