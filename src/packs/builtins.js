/**
 * Built-in convenience macros for pre-vhs.
 *
 * These are NOT activated automatically. A user must import
 * them explicitly in a .tape.pre header using:
 *
 *     Use BackspaceAll BackspaceAllButOne Gap ClearLine TypeEnter
 *
 * Each macro returns plain VHS commands. The engine performs
 * argument substitution ($1), header transforms, and gap insertion.
 */

module.exports = function builtinsPack(engine) {
  const { registerMacros, helpers } = engine;
  const { formatType } = helpers;

  /**
   * All built-in macros are defined here. They are inert until
   * the user activates them via a `Use` header directive.
   */
  const macros = {
    /**
     * BackspaceAll
     *
     * Deletes every character in the payload.
     *
     * Usage:
     *   Use BackspaceAll
     *   > BackspaceAll $1
     *   hello
     *
     * Output:
     *   Backspace 5
     */
    BackspaceAll(payload = "") {
      const n = String(payload).length;
      return [`Backspace ${n}`];
    },

    /**
     * BackspaceAllButOne
     *
     * Deletes all characters except the last.
     *
     * Useful for simulating typing corrections.
     */
    BackspaceAllButOne(payload = "") {
      const n = Math.max(String(payload).length - 1, 0);
      return [`Backspace ${n}`];
    },

    /**
     * ClearLine
     *
     * Convenience wrapper that erases the payload text fully
     * then emits a newline.
     *
     * Equivalent to: BackspaceAll $1, Type "", Enter
     */
    ClearLine(payload = "") {
      const n = String(payload).length;
      return [
        `Backspace ${n}`,
        formatType(""),
        "Enter"
      ];
    },

    /**
     * TypeEnter
     *
     * Types the payload then immediately presses Enter.
     *
     * Equivalent to: Type $1, Enter
     */
    TypeEnter(payload = "") {
      return [
        formatType(payload),
        "Enter"
      ];
    },

    /**
     * Gap
     *
     * Users may explicitly import this if they want time-based
     * inter-command spacing. The engine maintains CURRENT_GAP and
     * inserts Sleep CURRENT_GAP between commands.
     *
     * Example:
     *   Use Gap
     *   > Gap 200ms
     *   > Type $1, Enter
     *   ls
     */
    Gap(_payload, rawCmd) {
      // The engine holds CURRENT_GAP globally.
      const m = rawCmd.match(/Gap\s+(.+)/);
      engine.CURRENT_GAP = m ? m[1].trim() : null;
      return [];
    }
  };

  /**
   * Register the built-ins with the engine.
   * They do nothing until the user imports them in the header.
   */
  registerMacros(macros);

  return macros;
};
