/**
 * Emoji shortcuts pack for pre-vhs.
 *
 * This pack defines simple macros which expand to "Type" commands
 * containing common emojis. All macros accept an optional payload.
 *
 * If a payload is provided, it is appended after the emoji with a space.
 * Otherwise, only the emoji is typed.
 *
 * Example usage (with this pack enabled in pre-vhs.config.js):
 *
 *   > EmojiSmile $1, Enter
 *   hello
 *
 *   -> Type "🙂 hello"
 *      Enter
 *
 * You can also define aliases in the file header:
 *
 *   Smile = EmojiSmile $1
 *
 *   > Smile $1, Enter
 *   hi
 */

module.exports = function emojiShortcutsPack(engine) {
  const { registerMacros, helpers } = engine;
  const { formatType } = helpers;

  function withOptionalText(emoji, payload) {
    const text = String(payload || "").trim();
    return text ? `${emoji} ${text}` : emoji;
  }

  const macros = {
    /**
     * EmojiSmile
     * 🙂[ <payload>]
     */
    EmojiSmile(payload = "") {
      return [formatType(withOptionalText("🙂", payload))];
    },

    /**
     * EmojiGrin
     * 😄[ <payload>]
     */
    EmojiGrin(payload = "") {
      return [formatType(withOptionalText("😄", payload))];
    },

    /**
     * EmojiThumbsUp
     * 👍[ <payload>]
     */
    EmojiThumbsUp(payload = "") {
      return [formatType(withOptionalText("👍", payload))];
    },

    /**
     * EmojiParty
     * 🎉[ <payload>]
     */
    EmojiParty(payload = "") {
      return [formatType(withOptionalText("🎉", payload))];
    },

    /**
     * EmojiWarning
     * ⚠️[ <payload>]
     */
    EmojiWarning(payload = "") {
      return [formatType(withOptionalText("⚠️", payload))];
    },

    /**
     * EmojiInfo
     * ℹ️[ <payload>]
     */
    EmojiInfo(payload = "") {
      return [formatType(withOptionalText("ℹ️", payload))];
    },

    /**
     * EmojiCheck
     * ✅[ <payload>]
     */
    EmojiCheck(payload = "") {
      return [formatType(withOptionalText("✅", payload))];
    },

    /**
     * EmojiCross
     * ❌[ <payload>]
     */
    EmojiCross(payload = "") {
      return [formatType(withOptionalText("❌", payload))];
    },
  };

  registerMacros(macros);

  return macros;
};
