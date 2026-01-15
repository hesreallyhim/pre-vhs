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

    const input = ["Use EmojiSmile", "> EmojiSmile $1, Enter", "hello"].join(
      "\n",
    );

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([formatType("🙂 hello"), "Enter"]);
  });

  it("expands all emoji shortcuts and trims payloads", () => {
    const engine = createEngine();
    emojiPack({
      registerMacros: engine.registerMacros,
      helpers: { formatType, baseCommandName },
    });

    const input = [
      "Use EmojiSmile EmojiGrin EmojiThumbsUp EmojiParty EmojiWarning EmojiInfo EmojiCheck EmojiCross",
      "> EmojiSmile $1, Enter",
      "hello",
      "> EmojiGrin",
      "> EmojiThumbsUp $1",
      "  ok  ",
      "> EmojiParty $1, Enter",
      "yay",
      "> EmojiWarning $1",
      "  caution  ",
      "> EmojiInfo",
      "> EmojiCheck $1",
      "",
      "> EmojiCross",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("🙂 hello"),
      "Enter",
      formatType("😄"),
      formatType("👍 ok"),
      formatType("🎉 yay"),
      "Enter",
      formatType("⚠️ caution"),
      formatType("ℹ️"),
      formatType("✅"),
      formatType("❌"),
    ]);
  });
});
