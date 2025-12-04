import { describe, it, expect } from "vitest";
import { createEngine, formatType, baseCommandName } from "../src/index.js";
import emojiPack from "../src/packs/emojiShortcuts.js";

describe("emojiShortcuts pack", () => {
  it("EmojiSmile types emoji with optional payload", () => {
    const engine = createEngine();
    emojiPack({
      registerMacros: engine.registerMacros,
      helpers: { formatType, baseCommandName },
    });

    const input = [
      "Use EmojiSmile",
      "> EmojiSmile $1, Enter",
      "hello",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("🙂 hello"),
      "Enter",
    ]);
  });
});
