/**
 * Core helper functions for the pre-vhs engine.
 *
 * These utilities handle text formatting, command parsing, argument detection,
 * alias macro creation, and validation reporting.
 */

/**
 * Escape arbitrary text for a VHS Type command.
 * Always emits: Type `escaped text`
 *
 * @param {string} text - Text to format
 * @returns {string} Formatted VHS Type command
 */
function formatType(text = "") {
  const s = String(text);
  // Only backticks need escaping inside a backtick-quoted literal.
  const escaped = s.replace(/`/g, "\\`");
  return `Type \`${escaped}\``;
}

/**
 * Extract the base command word from a VHS line.
 *
 * @param {string} line - A VHS command line
 * @returns {string} The first word (command name)
 *
 * @example
 * baseCommandName('Type "foo"')  // => "Type"
 * baseCommandName('Sleep 1s')    // => "Sleep"
 * baseCommandName('Backspace 5') // => "Backspace"
 */
function baseCommandName(line) {
  const trimmed = String(line).trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/, 1)[0];
}

/**
 * Compute max positional argument index referenced in a list of header tokens.
 *
 * @param {string[]} cmds - List of command tokens to scan
 * @returns {{ max: number, hasStar: boolean }} max positional index and $* presence
 */
function maxArgIndex(cmds) {
  let max = 0;
  let hasStar = false;
  for (const cmd of cmds) {
    if (/\$\*/.test(cmd)) {
      hasStar = true;
    }
    const matches = String(cmd).match(/\$(\d+)/g);
    if (!matches) continue;
    for (const m of matches) {
      const n = Number(m.slice(1)); // skip '$'
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return { max, hasStar };
}

/**
 * Given an alias name and its body command list, build a macro function
 * that substitutes $1, $2, ..., and $* using the call-site args and returns
 * a list of header tokens (which themselves will be expanded as usual).
 *
 * The returned function has a `hasStar` property indicating whether the
 * alias body contains $* (greedy multi-line argument).
 *
 * @param {string} name - Alias name (for documentation/debugging)
 * @param {string[]} bodyCmds - Command tokens that form the alias body
 * @returns {Function} Macro function with hasStar property
 */
function makeAliasMacro(name, bodyCmds) {
  // Check if any body command uses $*
  const hasStar = bodyCmds.some((cmd) => /\$\*/.test(cmd));

  function aliasMacro(_payload, _rawCmd, args) {
    const out = [];
    for (const bodyCmd of bodyCmds) {
      const base = baseCommandName(bodyCmd);
      const skipLineArgs = base === "EachLine";

      // First substitute $* with the greedy multi-line argument.
      let expanded = bodyCmd.replace(/\$\*/g, () =>
        skipLineArgs ? "$*" : (args["*"] ?? ""),
      );
      // Then substitute $1, $2, etc.
      expanded = expanded.replace(/\$(\d+)/g, (_, n) => {
        const index = Number(n);
        if (skipLineArgs && index === 1) return "$1";
        return args[index] ?? "";
      });
      out.push(expanded);
    }
    return out;
  }

  // Attach metadata for $* detection
  aliasMacro.hasStar = hasStar;

  return aliasMacro;
}

/**
 * Report a header validation issue based on the validation mode.
 *
 * @param {"off"|"warn"|"error"} mode - Validation mode
 * @param {number} lineNo - 1-based line number
 * @param {string} message - Error/warning message
 * @param {string} line - The offending line content
 */
function reportHeaderIssue(mode, lineNo, message, line) {
  if (mode === "off") return;

  const fullMessage = `[pre-vhs] Header line ${lineNo}: ${message}\n  → ${line}`;

  if (mode === "error") {
    throw new Error(fullMessage);
  }
  // mode === "warn"
  console.warn(fullMessage);
}

module.exports = {
  formatType,
  baseCommandName,
  maxArgIndex,
  makeAliasMacro,
  reportHeaderIssue,
};
