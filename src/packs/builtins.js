/**
 * Built-in convenience macros for pre-vhs.
 *
 * These are NOT activated automatically. A user must import
 * them explicitly in a .tape.pre header using:
 *
 *     Use BackspaceAll BackspaceAllButOne Gap ClearLine TypeEnter
 *
 * Each macro returns plain VHS commands. The engine performs
 * argument substitution ($1), transforms, and gap insertion.
 */

module.exports = function builtinsPack(engine) {
  const { registerMacros, registerTransform, helpers } = engine;
  const { formatType, baseCommandName } = helpers;

  let currentGap = null;

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
  };

  registerMacros(macros);

  // Gap behavior implemented as a post-expand transform so it applies
  // between fully expanded commands (including those produced by macros).
  registerTransform("postExpand", (line, ctx) => {
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
