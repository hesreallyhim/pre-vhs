/**
 * Built-in convenience macros for pre-vhs.
 *
 * These are NOT activated automatically. A user must import
 * them explicitly in a .tape.pre header using:
 *
 *     Use BackspaceAll BackspaceAllButOne Gap ClearLine TypeEnter WordGap SentenceGap
 *
 * Each macro returns plain VHS commands. The engine performs
 * argument substitution ($1), transforms, and gap insertion.
 */

module.exports = function builtinsPack(engine) {
  const { registerMacros, registerTransform, helpers } = engine;
  const { formatType, baseCommandName } = helpers;

  let currentGap = null;
  const SENTENCE_ABBREVIATIONS = [
    "mr.",
    "mrs.",
    "ms.",
    "dr.",
    "prof.",
    "sr.",
    "jr.",
    "st.",
    "mt.",
  ];

  function extractGapArg(rawCmd) {
    const parts = String(rawCmd || "").trim().split(/\s+/);
    return parts.length > 1 ? parts[1] : "";
  }

  function wordChunks(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return [];
    const chunks = [];
    const re = /(\S+)(\s*)/g;
    let match = null;
    while ((match = re.exec(trimmed))) {
      chunks.push(match[1] + match[2]);
    }
    return chunks;
  }

  function isSentencePunct(ch) {
    return ch === "." || ch === "?" || ch === "!" || ch === ";";
  }

  function isSentenceAbbrev(text, dotIndex) {
    const lower = String(text || "").toLowerCase();
    for (const abbr of SENTENCE_ABBREVIATIONS) {
      const start = dotIndex - abbr.length + 1;
      if (start < 0) continue;
      if (lower.slice(start, dotIndex + 1) !== abbr) continue;
      if (start === 0) return true;
      if (/\s/.test(lower[start - 1])) return true;
    }
    return false;
  }

  function sentenceChunks(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return [];
    const chunks = [];
    let start = 0;
    for (let i = 0; i < trimmed.length; i += 1) {
      const ch = trimmed[i];
      if (!isSentencePunct(ch)) continue;
      const next = trimmed[i + 1];
      if (!next || !/\s/.test(next)) continue;
      if (ch === "." && isSentenceAbbrev(trimmed, i)) continue;

      let end = i + 1;
      while (end < trimmed.length && /\s/.test(trimmed[end])) {
        end += 1;
      }
      chunks.push(trimmed.slice(start, end));
      start = end;
      i = end - 1;
    }
    if (start < trimmed.length) {
      chunks.push(trimmed.slice(start));
    }
    return chunks;
  }

  function typeWithGap(chunks, gap) {
    const lines = [];
    for (let i = 0; i < chunks.length; i += 1) {
      lines.push(formatType(chunks[i]));
      if (gap && i < chunks.length - 1) {
        lines.push(`Sleep ${gap}`);
      }
    }
    return lines;
  }

  /**
   * All built-in macros are defined here. They are inert until
   * the user activates them via a `Use` header directive.
   */
  const macros = {
    BackspaceAll(payload = "") {
      const n = String(payload).length;
      return [`Backspace ${n}`];
    },

    BackspaceAllButOne(payload = "") {
      const n = Math.max(String(payload).length - 1, 0);
      return [`Backspace ${n}`];
    },

    ClearLine(payload = "") {
      const n = String(payload).length;
      return [`Backspace ${n}`, formatType(""), "Enter"];
    },

    TypeEnter(payload = "") {
      return [formatType(payload), "Enter"];
    },

    Gap(_payload, rawCmd) {
      const m = rawCmd.match(/Gap\s+(.+)/);
      currentGap = m ? m[1].trim() : null;
      return [];
    },

    WordGap(payload = "", rawCmd) {
      const gap = extractGapArg(rawCmd);
      return typeWithGap(wordChunks(payload), gap);
    },

    SentenceGap(payload = "", rawCmd) {
      const gap = extractGapArg(rawCmd);
      return typeWithGap(sentenceChunks(payload), gap);
    },
  };

  registerMacros(macros);

  // Gap behavior implemented as a post-expand transform so it applies
  // between fully expanded commands (including those produced by macros).
  registerTransform("postExpand", (line, ctx) => {
    if (!line || !String(line).trim()) return line;
    if (!currentGap) return line;

    const base = baseCommandName(line);
    const lastBase = ctx.lastLineBase;

    if (!lastBase) return line;
    if (base === "Sleep" || base === "Gap") return line;
    if (lastBase === "Gap") return line;

    return [`Sleep ${currentGap}`, line];
  });

  return macros;
};
