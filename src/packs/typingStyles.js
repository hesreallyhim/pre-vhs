/**
 * Typing styles pack: "human" and "sloppy".
 *
 * Optional configuration (apply per tape):
 *
 *   > Apply TypingStyle human medium fast
 *
 *   human levels: "low" | "medium" | "high" (difficulty multiplier)
 *   human speeds: "fast" | "normal" | "medium" | "slow" | "<ms>"
 *   sloppy levels: "low" | "medium" | "high" (mistake chance)
 *   sloppy speeds: "fast" | "medium" | "slow" | "<ms>"
 *   > Apply TypingStyle human low
 *   > Apply TypingStyle human high fast
 *   > Apply TypingStyle human slow 50ms
 *   > Apply TypingStyle sloppy medium slow
 *
 * Usage in .tape.pre:
 *
 *   Use BackspaceAll   # optional, from builtins
 *
 *   > Apply TypingStyle human
 *   > Type $1, Enter
 *   echo "this is typed with variable speed"
 *
 *   > Apply TypingStyle sloppy
 *   > Type $1, Enter
 *   git commit -m "typo-prone"
 */

module.exports = function typingStylesPack(engine) {
  const { registerMacros, registerTransform, helpers, options } = engine;
  const { baseCommandName } = helpers;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const defaultStyle = (options && options.defaultStyle) || "default";

  /** @type {"default"|"human"|"sloppy"|string} */
  let currentStyle = defaultStyle;

  const HUMAN_LEVELS = {
    low: 0.7,
    medium: 1,
    high: 2.5,
  };
  const HUMAN_SPEEDS = {
    fast: 50,
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
  let currentHumanMultiplier = humanMultiplier;
  let currentHumanBaselineMs = resolveHumanBaselineMs(options);

  const sloppyLevel =
    options && typeof options.sloppy === "string"
      ? options.sloppy.trim().toLowerCase()
      : "medium";
  const sloppyMistakeChance =
    SLOPPY_LEVELS[sloppyLevel] || SLOPPY_LEVELS.medium;
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

  function sloppyCorrectionDelayMs() {
    return Math.round(sloppyDelayMs() * 2);
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
   * "Sloppy" style: per-character typing with occasional mistakes and corrections.
   */
  function expandSloppy(payload) {
    const chunks = chunkWords(payload);
    const out = [];

    function emitSloppyChars(text) {
      const value = String(text || "");
      if (!value.length) {
        const delayMs = sloppyDelayMs();
        return [`Type@${delayMs}ms ""`];
      }
      const lines = [];
      for (const ch of value) {
        const delayMs = sloppyDelayMs();
        const escaped = escapeDoubleQuoted(ch);
        lines.push(`Type@${delayMs}ms "${escaped}"`);
      }
      return lines;
    }

    for (const chunk of chunks) {
      // whitespace chunks are emitted as-is (no typos)
      if (/^\s+$/.test(chunk)) {
        out.push(...emitSloppyChars(chunk));
        continue;
      }

      // with some probability, inject a single-character mistake
      if (Math.random() < currentSloppyMistakeChance && chunk.length >= 3) {
        const idx = Math.floor(rand(1, chunk.length - 1)); // avoid first char
        const correctChar = chunk[idx];
        const wrongChar = randomCharExcept(correctChar);

        const before = chunk.slice(0, idx);
        const after = chunk.slice(idx);

        if (before) out.push(...emitSloppyChars(before));
        out.push(...emitSloppyChars(wrongChar));
        out.push(`Sleep ${sloppyCorrectionDelayMs()}ms`);
        out.push("Backspace 1");
        out.push(`Sleep ${sloppyCorrectionDelayMs()}ms`);
        if (after) out.push(...emitSloppyChars(after));
      } else {
        // no mistake for this chunk
        out.push(...emitSloppyChars(chunk));
      }
    }

    return out;
  }

  function unescapeBackticks(text) {
    return String(text || "").replace(/\\`/g, "`");
  }

  function unescapeDoubleQuotes(text) {
    return String(text || "")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  function unescapeSingleQuotes(text) {
    return String(text || "")
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\");
  }

  function extractTypePayload(line) {
    const remainder = String(line || "")
      .replace(/^Type\b/, "")
      .trim();
    if (!remainder) return "";
    if (remainder.startsWith("`") && remainder.endsWith("`")) {
      return unescapeBackticks(remainder.slice(1, -1));
    }
    if (remainder.startsWith('"') && remainder.endsWith('"')) {
      return unescapeDoubleQuotes(remainder.slice(1, -1));
    }
    if (remainder.startsWith("'") && remainder.endsWith("'")) {
      return unescapeSingleQuotes(remainder.slice(1, -1));
    }
    return remainder;
  }

  const styleMacros = {
    HumanType(payload) {
      return expandHuman(payload || "");
    },
    SloppyType(payload) {
      return expandSloppy(payload || "");
    },
  };

  // Style expanders are always available once the pack is loaded.
  registerMacros(styleMacros, { requireUse: false });

  // ---------------------------------------------------------------------------
  // Header transform: handle Apply TypingStyle and rewrite Type -> HumanType / SloppyType
  // ---------------------------------------------------------------------------

  registerTransform("preExpandToken", (cmd, ctx) => {
    if (!ctx || ctx.eachLine !== true) return cmd;
    const trimmed = String(cmd || "").trim();
    if (!trimmed) return cmd;
    const base = baseCommandName(trimmed);
    if (currentStyle === "human" && base === "Type") {
      return trimmed.replace(/^Type\b/, "HumanType");
    }
    if (currentStyle === "sloppy" && base === "Type") {
      return trimmed.replace(/^Type\b/, "SloppyType");
    }
    return cmd;
  });

  registerTransform("postExpand", (line) => {
    if (currentStyle === "default") return line;
    const trimmed = String(line || "").trim();
    if (!trimmed) return line;
    if (baseCommandName(trimmed) !== "Type") return line;

    const payload = extractTypePayload(trimmed);
    if (currentStyle === "human") return expandHuman(payload);
    if (currentStyle === "sloppy") return expandSloppy(payload);
    return line;
  });

  registerTransform("header", (cmds) => {
    const out = [];

    for (const cmd of cmds) {
      const trimmed = String(cmd || "").trim();
      if (!trimmed) continue;

      const base = baseCommandName(trimmed);
      if (base === "Apply") {
        const parts = trimmed.split(/\s+/);
        const modifier = parts[1] || "";
        if (modifier.toLowerCase() === "typingstyle") {
          const styleToken = parts[2];

          if (styleToken === "None") {
            currentStyle = "default";
          } else if (styleToken === "Default") {
            currentStyle = defaultStyle;
          } else {
            const style = String(styleToken || "default").toLowerCase();
            if (
              style === "human" ||
              style === "sloppy" ||
              style === "default"
            ) {
              currentStyle = style;
              const rest = parts.slice(3);
              if (style === "human") {
                const humanOpts = parseLevelAndSpeed(
                  rest,
                  HUMAN_LEVELS,
                  HUMAN_SPEEDS,
                );
                if (humanOpts.level) {
                  const resolved = resolveHumanLevel(humanOpts.level);
                  if (resolved) {
                    currentHumanMultiplier = resolved.multiplier;
                  }
                }
                if (Number.isFinite(humanOpts.baselineMs)) {
                  currentHumanBaselineMs = Math.max(0, humanOpts.baselineMs);
                }
              }
              if (style === "sloppy") {
                const sloppyOpts = parseLevelAndSpeed(
                  rest,
                  SLOPPY_LEVELS,
                  SLOPPY_SPEEDS,
                );
                if (sloppyOpts.level) {
                  const resolved = resolveSloppyLevel(sloppyOpts.level);
                  if (resolved) {
                    currentSloppyMistakeChance = resolved.mistakeChance;
                  }
                }
                if (Number.isFinite(sloppyOpts.baselineMs)) {
                  currentSloppyBaselineMs = Math.max(0, sloppyOpts.baselineMs);
                }
              }
            } else {
              currentStyle = "default";
            }
          }
          continue;
        }
      }

      if (currentStyle === "human" && base === "Type") {
        out.push(trimmed.replace(/^Type\b/, "HumanType"));
      } else if (currentStyle === "sloppy" && base === "Type") {
        out.push(trimmed.replace(/^Type\b/, "SloppyType"));
      } else {
        out.push(trimmed);
      }
    }

    return out;
  });

  return styleMacros;
};
