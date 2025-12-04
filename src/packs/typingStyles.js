/**
 * Typing styles pack: "human" and "sloppy".
 *
 * Usage in pre-vhs.config.js:
 *
 *   module.exports = {
 *     packs: [
 *       { module: "./packs/typingStyles.js", enabled: true, options: { defaultStyle: "default" } }
 *     ]
 *   };
 *
 * Usage in .tape.pre:
 *
 *   Use BackspaceAll   # optional, from builtins
 *
 *   > SetTypingStyle human
 *   > Type $1, Enter
 *   echo "this is typed with variable speed"
 *
 *   > SetTypingStyle sloppy
 *   > Type $1, Enter
 *   git commit -m "typo-prone"
 */

module.exports = function typingStylesPack(engine) {
  const { registerMacros, registerHeaderTransform, helpers, options } = engine;
  const { formatType, baseCommandName } = helpers;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** @type {"default"|"human"|"sloppy"} */
  let currentStyle = (options && options.defaultStyle) || "default";

  // ---------------------------------------------------------------------------
  // Utility functions
  // ---------------------------------------------------------------------------

  function chunkWords(text) {
    return String(text).match(/\S+|\s+/g) || [String(text)];
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomDelayMs(min, max) {
    return Math.round(rand(min, max));
  }

  function escapeDoubleQuoted(text) {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  }

  function randomCharExcept(except) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    let c = except;
    while (c === except) {
      c = alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return c;
  }

  // ---------------------------------------------------------------------------
  // Style-specific expanders
  // ---------------------------------------------------------------------------

  /**
   * "Human" style: break into chunks (words + spaces), assign each
   * chunk a random per-character delay.
   */
  function expandHuman(payload) {
    const chunks = chunkWords(payload);
    const out = [];

    for (const chunk of chunks) {
      const delayMs = randomDelayMs(40, 140); // per-char speed
      const escaped = escapeDoubleQuoted(chunk);
      out.push(`Type@${delayMs}ms "${escaped}"`);
    }

    return out;
  }

  /**
   * "Sloppy" style: like "human" but occasionally injects a wrong character
   * then corrects it with Backspace.
   */
  function expandSloppy(payload) {
    const chunks = chunkWords(payload);
    const out = [];

    for (const chunk of chunks) {
      // whitespace chunks are emitted as-is (no typos)
      if (/^\s+$/.test(chunk)) {
        const escaped = escapeDoubleQuoted(chunk);
        const delayMs = randomDelayMs(40, 140);
        out.push(`Type@${delayMs}ms "${escaped}"`);
        continue;
      }

      // with some probability, inject a single-character mistake
      if (Math.random() < 0.4 && chunk.length >= 3) {
        const idx = Math.floor(rand(1, chunk.length - 1)); // avoid first char
        const correctChar = chunk[idx];
        const wrongChar = randomCharExcept(correctChar);

        const before = chunk.slice(0, idx);
        const after = chunk.slice(idx);

        const beforeEsc = escapeDoubleQuoted(before);
        const wrongEsc = escapeDoubleQuoted(wrongChar);
        const afterEsc = escapeDoubleQuoted(after);

        const delayBefore = randomDelayMs(40, 140);
        const delayWrong = randomDelayMs(40, 140);
        const delayAfter = randomDelayMs(40, 140);

        if (before) out.push(`Type@${delayBefore}ms "${beforeEsc}"`);
        out.push(`Type@${delayWrong}ms "${wrongEsc}"`);
        out.push("Backspace 1");
        if (after) out.push(`Type@${delayAfter}ms "${afterEsc}"`);
      } else {
        // no mistake for this chunk
        const delay = randomDelayMs(40, 140);
        const escaped = escapeDoubleQuoted(chunk);
        out.push(`Type@${delay}ms "${escaped}"`);
      }
    }

    return out;
  }

  // ---------------------------------------------------------------------------
  // Macros
  // ---------------------------------------------------------------------------

  const macros = {
    /**
     * SetTypingStyle <style>
     *
     * Supported styles:
     *   - default
     *   - human
     *   - sloppy
     *
     * Example:
     *   > SetTypingStyle human
     */
    SetTypingStyle(payload, rawCmd) {
      // Prefer explicit argument in header; fallback to payload.
      const m = rawCmd.match(/SetTypingStyle\s+(\w+)/);
      const style = (m && m[1]) || String(payload || "").trim() || "default";

      if (style === "human" || style === "sloppy" || style === "default") {
        currentStyle = style;
      } else {
        // Unknown style → fall back to default
        currentStyle = "default";
      }
      return [];
    },

    /**
     * HumanType
     *
     * Normally used via the header transform that rewrites
     * plain "Type" when style is "human".
     */
    HumanType(payload) {
      return expandHuman(payload || "");
    },

    /**
     * SloppyType
     *
     * Normally used via the header transform that rewrites
     * plain "Type" when style is "sloppy".
     */
    SloppyType(payload) {
      return expandSloppy(payload || "");
    },
  };

  registerMacros(macros);

  // ---------------------------------------------------------------------------
  // Header transform: rewrite Type -> HumanType / SloppyType
  // ---------------------------------------------------------------------------

  registerHeaderTransform((cmds) => {
    if (currentStyle === "default") return cmds;

    return cmds.map((c) => {
      const base = baseCommandName(c);
      if (base !== "Type") return c;

      if (currentStyle === "human") {
        return c.replace(/^Type\b/, "HumanType");
      }
      if (currentStyle === "sloppy") {
        return c.replace(/^Type\b/, "SloppyType");
      }
      return c;
    });
  });

  return macros;
};
