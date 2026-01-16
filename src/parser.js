/**
 * File header parser for .tape.pre files.
 *
 * Parses the header section containing Use statements and alias definitions,
 * separating it from the body which contains directives and VHS commands.
 */

const { makeAliasMacro, reportHeaderIssue } = require("./helpers");

/**
 * Parse a file header at the top of the .tape.pre:
 * - Skips blank lines and comments (#..., //...).
 * - `Use ...` lines collect macro names to activate.
 * - Alias lines: Name = Cmd1, Cmd2, ...
 * - Stops at the first line that is not blank/comment/alias/Use.
 *
 * @param {string[]} lines - All lines of the file
 * @param {"off"|"warn"|"error"} headerValidation - Validation mode (default: "warn")
 * @returns {{ macrosFromHeader: object, useNames: string[], bodyLines: string[], bodyStartIndex: number }}
 */
function parseFileHeader(lines, headerValidation = "warn") {
  const macrosFromHeader = {};
  const useNames = [];
  let bodyStart = lines.length;
  let hasHeaderContent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (isBlankLine(line)) continue;
    if (isComment(line)) continue;

    if (isDirective(line)) {
      if (hasHeaderContent) {
        reportHeaderIssue(
          headerValidation,
          lineNo,
          "Directive syntax '>' found in header (should be in body after blank line)",
          line,
        );
      }
      bodyStart = i;
      break;
    }

    const useResult = tryParseUseStatement(line, headerValidation, lineNo);
    if (useResult.matched) {
      if (useResult.names.length > 0) {
        useNames.push(...useResult.names);
        hasHeaderContent = true;
      }
      continue;
    }

    const aliasResult = tryParseAlias(line, headerValidation, lineNo);
    if (aliasResult.matched) {
      if (aliasResult.name && aliasResult.macro) {
        macrosFromHeader[aliasResult.name] = aliasResult.macro;
        hasHeaderContent = true;
      }
      continue;
    }

    if (isMalformedAlias(line)) {
      reportHeaderIssue(
        headerValidation,
        lineNo,
        "Malformed alias definition (expected: Name = Cmd1, Cmd2, ...)",
        line,
      );
      bodyStart = i;
      break;
    }

    // Anything else: header ends here
    bodyStart = i;
    break;
  }

  return {
    macrosFromHeader,
    useNames,
    bodyLines: lines.slice(bodyStart),
    bodyStartIndex: bodyStart,
  };
}

// ---------------------------------------------------------------------------
// Line classification helpers
// ---------------------------------------------------------------------------

function isBlankLine(line) {
  return /^\s*$/.test(line);
}

function isComment(line) {
  return /^\s*#/.test(line) || /^\s*\/\//.test(line);
}

function isDirective(line) {
  return /^\s*>/.test(line);
}

function isMalformedAlias(line) {
  return line.includes("=");
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Try to parse a Use statement from a line.
 *
 * @param {string} line - The line to parse
 * @param {"off"|"warn"|"error"} headerValidation - Validation mode
 * @param {number} lineNo - 1-based line number for error reporting
 * @returns {{ matched: boolean, names: string[] }}
 */
function tryParseUseStatement(line, headerValidation, lineNo) {
  const useMatch = line.match(/^\s*Use\s*(.*)$/);
  if (useMatch === null || !/^\s*Use\b/.test(line)) {
    return { matched: false, names: [] };
  }

  const args = (useMatch[1] || "").trim();
  if (!args) {
    reportHeaderIssue(
      headerValidation,
      lineNo,
      "'Use' requires at least one macro name",
      line,
    );
    return { matched: true, names: [] };
  }

  const names = args
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return { matched: true, names };
}

/**
 * Try to parse an alias definition from a line.
 *
 * @param {string} line - The line to parse
 * @param {"off"|"warn"|"error"} headerValidation - Validation mode
 * @param {number} lineNo - 1-based line number for error reporting
 * @returns {{ matched: boolean, name: string|null, macro: Function|null }}
 */
function tryParseAlias(line, headerValidation, lineNo) {
  const aliasMatch = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.+)$/);
  if (!aliasMatch) {
    return { matched: false, name: null, macro: null };
  }

  const name = aliasMatch[1];
  const rhs = aliasMatch[2];

  const bodyCmds = rhs
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (bodyCmds.length === 0) {
    reportHeaderIssue(
      headerValidation,
      lineNo,
      "Alias has empty body (expected: Name = Cmd1, Cmd2, ...)",
      line,
    );
    return { matched: true, name: null, macro: null };
  }

  return {
    matched: true,
    name,
    macro: makeAliasMacro(name, bodyCmds),
  };
}

module.exports = { parseFileHeader };
