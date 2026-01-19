/**
 * Typing styles pack: "human" and "sloppy".
 *
 * Usage in pre-vhs.config.js:
 *
 *   module.exports = {
 *     packs: [
 *       {
 *         module: "./packs/typingStyles.js",
 *         enabled: true,
 *         options: { defaultStyle: "default", human: "medium" }
 *       }
 *     ]
 *   };
 *
 *   options.human: "low" | "medium" | "high" (difficulty multiplier)
 *   options.humanSpeed: "fast" | "normal" | "medium" | "slow" | "<ms>"
 *   options.sloppy: "low" | "medium" | "high" (mistake chance)
 *   options.sloppySpeed: "fast" | "medium" | "slow" | "<ms>"
 *   > SetTypingStyle human low
 *   > SetTypingStyle human high fast
 *   > SetTypingStyle human slow 50ms
 *   > SetTypingStyle sloppy medium slow
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
  const { registerMacros, registerTransform, helpers, options } = engine;
  const { baseCommandName } = helpers;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** @type {"default"|"human"|"sloppy"} */
  let currentStyle = (options && options.defaultStyle) || "default";

  const HUMAN_LEVELS = {
    low: 0.7,
    medium: 1,
    high: 2.5,
  };
  const HUMAN_SPEEDS = {
    fast: 35,
    normal: 60,
    medium: 60,
    slow: 120,
  };
  const SLOPPY_LEVELS = {
    low: 0.2,
    medium: 0.4,
    high: 0.7,
  };
  const SLOPPY_SPEEDS = {
    fast: 60,
    medium: 90,
    normal: 90,
    slow: 140,
  };

  const humanLevel =
    options && typeof options.human === "string"
      ? options.human.trim().toLowerCase()
      : "medium";
  const humanMultiplier = HUMAN_LEVELS[humanLevel] || HUMAN_LEVELS.medium;
  let currentHumanLevel = humanLevel;
  let currentHumanMultiplier = humanMultiplier;
  let currentHumanBaselineMs = resolveHumanBaselineMs(options);

  const sloppyLevel =
    options && typeof options.sloppy === "string"
      ? options.sloppy.trim().toLowerCase()
      : "medium";
  const sloppyMistakeChance =
    SLOPPY_LEVELS[sloppyLevel] || SLOPPY_LEVELS.medium;
  let currentSloppyLevel = sloppyLevel;
  let currentSloppyMistakeChance = sloppyMistakeChance;
  let currentSloppyBaselineMs = resolveSloppyBaselineMs(options);

  const HUMAN_DISTANCE_SCALE_MS = 60;
  const HUMAN_JITTER_MS = 20;
  const SLOPPY_JITTER_MS = 50;

  const KEYBOARD_POS = buildKeyboardMap();

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
    return String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function randomCharExcept(except) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    let c = except;
    while (c === except) {
      c = alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return c;
  }

  function parseMsToken(token) {
    const match = token.match(/^(\d+(?:\.\d+)?)(ms)?$/);
    if (!match) return null;
    return Number(match[1]);
  }

  function resolveHumanBaselineMs(opts) {
    if (!opts) return HUMAN_SPEEDS.normal;

    if (typeof opts.humanSpeed === "number") {
      return Math.max(0, opts.humanSpeed);
    }

    if (typeof opts.humanSpeed === "string") {
      const key = opts.humanSpeed.trim().toLowerCase();
      if (HUMAN_SPEEDS[key]) return HUMAN_SPEEDS[key];
      const ms = parseMsToken(key);
      if (Number.isFinite(ms)) return Math.max(0, ms);
    }

    return HUMAN_SPEEDS.normal;
  }

  function resolveSloppyBaselineMs(opts) {
    if (!opts) return SLOPPY_SPEEDS.medium;

    if (typeof opts.sloppySpeed === "number") {
      return Math.max(0, opts.sloppySpeed);
    }

    if (typeof opts.sloppySpeed === "string") {
      const key = opts.sloppySpeed.trim().toLowerCase();
      if (SLOPPY_SPEEDS[key]) return SLOPPY_SPEEDS[key];
      const ms = parseMsToken(key);
      if (Number.isFinite(ms)) return Math.max(0, ms);
    }

    return SLOPPY_SPEEDS.medium;
  }

  function buildKeyboardMap() {
    const map = {};
    const rows = [
      { keys: "qwertyuiop", y: 0, offset: 0 },
      { keys: "asdfghjkl", y: 1, offset: 0.5 },
      { keys: "zxcvbnm", y: 2, offset: 1 },
    ];

    for (const row of rows) {
      for (let i = 0; i < row.keys.length; i += 1) {
        const key = row.keys[i];
        map[key] = { x: i + row.offset, y: row.y };
      }
    }

    return map;
  }

  function keyPos(ch) {
    if (!ch) return null;
    return KEYBOARD_POS[String(ch).toLowerCase()] || null;
  }

  function difficultyForPair(prevChar, currChar) {
    const prev = keyPos(prevChar);
    const curr = keyPos(currChar);

    if (!prev || !curr) {
      return prevChar ? 1 : 0;
    }

    const dx = prev.x - curr.x;
    const dy = prev.y - curr.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function delayForPair(prevChar, currChar) {
    const difficulty = difficultyForPair(prevChar, currChar);
    const base =
      currentHumanBaselineMs +
      difficulty * HUMAN_DISTANCE_SCALE_MS * currentHumanMultiplier;
    const jitter =
      rand(-HUMAN_JITTER_MS, HUMAN_JITTER_MS) * currentHumanMultiplier;
    return Math.max(0, Math.round(base + jitter));
  }

  function parseStyleTokens(rawCmd, payload) {
    const headerMatch = rawCmd.match(/SetTypingStyle\s+([^,]+)/);
    const headerPart = headerMatch ? headerMatch[1].trim() : "";
    const source = headerPart || String(payload || "").trim();
    if (!source) {
      return { style: "default", tokens: [] };
    }
    const tokens = source.split(/\s+/);
    const style = tokens.shift();
    return { style, tokens };
  }

  function parseLevelAndSpeed(tokens, levelMap, speedMap) {
    let level = null;
    let baselineMs = null;

    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (!level && levelMap[lower]) {
        level = lower;
        continue;
      }
      if (baselineMs === null && speedMap[lower]) {
        baselineMs = speedMap[lower];
        continue;
      }
      const ms = parseMsToken(lower);
      if (Number.isFinite(ms)) {
        baselineMs = ms;
      }
    }

    return { level, baselineMs };
  }

  function resolveHumanLevel(level) {
    const key = String(level || "")
      .trim()
      .toLowerCase();
    if (!HUMAN_LEVELS[key]) return null;
    return { level: key, multiplier: HUMAN_LEVELS[key] };
  }

  function resolveSloppyLevel(level) {
    const key = String(level || "")
      .trim()
      .toLowerCase();
    if (!SLOPPY_LEVELS[key]) return null;
    return { level: key, mistakeChance: SLOPPY_LEVELS[key] };
  }

  function sloppyDelayMs() {
    const min = Math.max(
      0,
      Math.round(currentSloppyBaselineMs - SLOPPY_JITTER_MS),
    );
    const max = Math.max(
      min,
      Math.round(currentSloppyBaselineMs + SLOPPY_JITTER_MS),
    );
    return randomDelayMs(min, max);
  }

  // ---------------------------------------------------------------------------
  // Style-specific expanders
  // ---------------------------------------------------------------------------

  /**
   * "Human" style: emit one Type per character with a baseline
   * speed, keyboard-distance difficulty, and jitter.
   */
  function expandHuman(payload) {
    const out = [];
    const text = String(payload || "");

    if (!text.length) {
      const delayMs = delayForPair(null, "");
      out.push(`Type@${delayMs}ms ""`);
      return out;
    }

    let prevChar = null;
    for (const ch of text) {
      const delayMs = delayForPair(prevChar, ch);
      const escaped = escapeDoubleQuoted(ch);
      out.push(`Type@${delayMs}ms "${escaped}"`);
      prevChar = ch;
    }

    return out;
  }

  /**
   * "Sloppy" style: chunked typing with occasional mistakes and corrections.
   */
  function expandSloppy(payload) {
    const chunks = chunkWords(payload);
    const out = [];

    for (const chunk of chunks) {
      // whitespace chunks are emitted as-is (no typos)
      if (/^\s+$/.test(chunk)) {
        const escaped = escapeDoubleQuoted(chunk);
        const delayMs = sloppyDelayMs();
        out.push(`Type@${delayMs}ms "${escaped}"`);
        continue;
      }

      // with some probability, inject a single-character mistake
      if (Math.random() < currentSloppyMistakeChance && chunk.length >= 3) {
        const idx = Math.floor(rand(1, chunk.length - 1)); // avoid first char
        const correctChar = chunk[idx];
        const wrongChar = randomCharExcept(correctChar);

        const before = chunk.slice(0, idx);
        const after = chunk.slice(idx);

        const beforeEsc = escapeDoubleQuoted(before);
        const wrongEsc = escapeDoubleQuoted(wrongChar);
        const afterEsc = escapeDoubleQuoted(after);

        const delayBefore = sloppyDelayMs();
        const delayWrong = sloppyDelayMs();
        const delayAfter = sloppyDelayMs();

        if (before) out.push(`Type@${delayBefore}ms "${beforeEsc}"`);
        out.push(`Type@${delayWrong}ms "${wrongEsc}"`);
        out.push("Backspace 1");
        if (after) out.push(`Type@${delayAfter}ms "${afterEsc}"`);
      } else {
        // no mistake for this chunk
        const delay = sloppyDelayMs();
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
      const parsed = parseStyleTokens(rawCmd, payload);
      const style = String(parsed.style || "default").toLowerCase();

      if (style === "human" || style === "sloppy" || style === "default") {
        currentStyle = style;
        if (style === "human") {
          const humanOpts = parseLevelAndSpeed(
            parsed.tokens,
            HUMAN_LEVELS,
            HUMAN_SPEEDS,
          );
          if (humanOpts.level) {
            const resolved = resolveHumanLevel(humanOpts.level);
            if (resolved) {
              currentHumanLevel = resolved.level;
              currentHumanMultiplier = resolved.multiplier;
            }
          }
          if (Number.isFinite(humanOpts.baselineMs)) {
            currentHumanBaselineMs = Math.max(0, humanOpts.baselineMs);
          }
        }
        if (style === "sloppy") {
          const sloppyOpts = parseLevelAndSpeed(
            parsed.tokens,
            SLOPPY_LEVELS,
            SLOPPY_SPEEDS,
          );
          if (sloppyOpts.level) {
            const resolved = resolveSloppyLevel(sloppyOpts.level);
            if (resolved) {
              currentSloppyLevel = resolved.level;
              currentSloppyMistakeChance = resolved.mistakeChance;
            }
          }
          if (Number.isFinite(sloppyOpts.baselineMs)) {
            currentSloppyBaselineMs = Math.max(0, sloppyOpts.baselineMs);
          }
        }
      } else {
        // Unknown style → fall back to default
        currentStyle = "default";
      }
      return [];
    },
  };

  const styleMacros = {
    HumanType(payload) {
      return expandHuman(payload || "");
    },
    SloppyType(payload) {
      return expandSloppy(payload || "");
    },
  };

  // SetTypingStyle respects Use; style expanders are always available once the pack is loaded.
  registerMacros(macros); // requireUse defaults to true
  registerMacros(styleMacros, { requireUse: false });

  // ---------------------------------------------------------------------------
  // Header transform: rewrite Type -> HumanType / SloppyType
  // ---------------------------------------------------------------------------

  registerTransform("header", (cmds) => {
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
