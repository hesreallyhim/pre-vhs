#!/usr/bin/env node

/**
 * Core VHS preprocessor engine + CLI.
 *
 * Features:
 *   - Meta lines: `> CmdA, CmdB arg, CmdC`
 *   - Positional args: $1, $2, ... read from subsequent lines
 *   - Registerable macros (META)
 *   - Registerable header transforms (for things like typing styles, doublers, etc.)
 *   - Small built-in meta-vocabulary: Type, BackspaceAll, BackspaceAllButOne, Gap
 *   - File header aliases at the top of .tape.pre:
 *       AliasName = Cmd1, Cmd2, Cmd3
 *     until the first non-alias / non-comment / non-blank line.
 *
 * Packs are configured via pre-vhs.config.js/json and can register
 * additional macros and header transforms.
 */

const fs = require("fs");
const path = require("path");

/**
 * @typedef {Object} PreVhsPackConfig
 * @property {string} module   - Module specifier (path or package name)
 * @property {boolean} [enabled] - Default true
 * @property {any} [options]   - Arbitrary options passed to the pack
 */

/**
 * @typedef {Object} PreVhsConfig
 * @property {Array<string | PreVhsPackConfig>} [packs]
 */

/**
 * Escape arbitrary text for a VHS Type command.
 * Always emits: Type "escaped text"
 */
function formatType(text = "") {
  const s = String(text);

  // Only backticks need escaping inside a backtick-quoted literal.
  const escaped = s.replace(/`/g, "\\`");

  return `Type \`${escaped}\``;

//   const escaped = s
//     .replace(/\\/g, "\\\\") // backslashes
//     .replace(/"/g, '\\"');  // double quotes
//   return `Type "${escaped}"`;
}

/**
 * Extract the base command word from a VHS line.
 *   "Type \"foo\""   -> "Type"
 *   "Sleep 1s"       -> "Sleep"
 *   "Backspace 5"    -> "Backspace"
 */
function baseCommandName(line) {
  const trimmed = String(line).trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/, 1)[0];
}

// ---------------------------------------------------------------------------
// Macro registry and header transforms
// ---------------------------------------------------------------------------

/**
 * META is the macro registry.
 *   key: macro name (base word), e.g. "Type", "GitCommit"
 *   val: (payload: string, rawCmd: string, args: string[]) => string[]
 */
const META = Object.create(null);

/** @type {Array<(cmds:string[], ctx:{lineNo:number, headerText:string}) => string[]|void>} */
const headerTransforms = [];

/**
 * Register additional macros from packs.
 *
 * @param {Record<string,(payload:string, rawCmd:string, args:string[])=>string[]>} macros
 */
function registerMacros(macros) {
  if (!macros || typeof macros !== "object") return;
  for (const [name, fn] of Object.entries(macros)) {
    if (typeof fn === "function") {
      META[name] = fn;
    }
  }
}

/**
 * Register a header transform.
 *
 * A header transform is a pure function operating on the list of
 * commands for a single meta line:
 *
 *   fn(["Type", "Enter"], { lineNo, headerText }) => ["HumanType", "Enter"]
 */
function registerHeaderTransform(fn) {
  if (typeof fn === "function") {
    headerTransforms.push(fn);
  }
}

function applyHeaderTransforms(cmds, ctx) {
  let current = cmds;
  for (const fn of headerTransforms) {
    const next = fn(current, ctx);
    if (Array.isArray(next) && next.length) current = next;
  }
  return current;
}

// ---------------------------------------------------------------------------
// Built-in core macros (meta-vocabulary)
// ---------------------------------------------------------------------------

let CURRENT_GAP = null;

/**
 * Type: takes payload (typically $1) and emits a single VHS Type line.
 */
META.Type = function Type(payload /* string */) {
  return [formatType(payload || "")];
};

/**
 * BackspaceAll: delete as many characters as in the payload.
 */
META.BackspaceAll = function BackspaceAll(payload = "") {
  const n = String(payload).length;
  return [`Backspace ${n}`];
};

/**
 * BackspaceAllButOne: delete all but the last character of the payload.
 */
META.BackspaceAllButOne = function BackspaceAllButOne(payload = "") {
  const len = String(payload).length;
  const n = Math.max(len - 1, 0);
  return [`Backspace ${n}`];
};

/**
 * Gap: configure an inter-command Sleep that is automatically inserted
 * between subsequent commands (except Sleep/Gap itself).
 *
 * Example:
 *   > Gap 500ms
 *
 *   > Type $1, Enter
 *   hello
 *
 *   -> Type "hello"
 *      Sleep 500ms
 *      Enter
 *
 * Gap itself emits no VHS lines; it only updates CURRENT_GAP.
 */
META.Gap = function Gap(_payload, rawCmd) {
  const m = rawCmd.match(/Gap\s+(.+)/);
  CURRENT_GAP = m ? m[1].trim() : null;
  return [];
};

function shouldInsertGap(nextBase, lastBase) {
  if (!CURRENT_GAP) return false;
  if (!nextBase) return false;
  if (!lastBase) return false;
  if (nextBase === "Sleep" || nextBase === "Gap") return false;
  if (lastBase === "Gap") return false;
  return true;
}

// ---------------------------------------------------------------------------
// File-header alias support
// ---------------------------------------------------------------------------

/**
 * Given an alias name and its body command list, build a macro function
 * that:
 *   - substitutes $1, $2, ... using the call-site args
 *   - returns a list of header tokens (which will themselves be expanded
 *     by META / packs as usual).
 *
 * @param {string} name
 * @param {string[]} bodyCmds
 */
function makeAliasMacro(name, bodyCmds) {
  return function aliasMacro(_payload, _rawCmd, args) {
    const out = [];
    for (const bodyCmd of bodyCmds) {
      const expanded = bodyCmd.replace(/\$(\d+)/g, (_, n) => args[Number(n)] ?? "");
      out.push(expanded);
    }
    return out;
  };
}

/**
 * Parse a file header at the top of the .tape.pre:
 *
 * - Skips blank lines and comments (#..., //...).
 * - Treats lines of the form:
 *       Name = Cmd1, Cmd2, Cmd3
 *   as alias definitions.
 * - Stops at the first line that is not blank/comment/alias.
 *
 * Returns:
 *   - macrosFromHeader: { Name: macroFn, ... }
 *   - bodyLines: remaining lines (the actual tape body)
 *
 * @param {string[]} lines
 */
function parseFileHeader(lines) {
  const macrosFromHeader = {};
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Blank lines
    if (/^\s*$/.test(line)) continue;

    // Comments
    if (/^\s*#/.test(line) || /^\s*\/\//.test(line)) continue;

    // NEW: Use statements: Use BackspaceAll BackspaceAllButOne Gap
    const useMatch = line.match(/^\s*Use\s+(.+)$/);
    if (useMatch) {
      const names = useMatch[1]
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const name of names) {
        const macroFn = BUILTIN_MACROS[name];
        if (typeof macroFn === "function") {
          macrosFromHeader[name] = macroFn;
        } else {
          // Optional: warn or ignore silently
          // console.warn(`[pre-vhs] Unknown builtin macro '${name}' on header line ${i+1}`);
        }
      }
      continue;
    }

    // Alias lines: Name = Cmd1, Cmd2, ...
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (m) {
      const name = m[1];
      const rhs = m[2];

      const bodyCmds = rhs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      macrosFromHeader[name] = makeAliasMacro(name, bodyCmds);
      continue;
    }

    // Anything else: header ends here
    bodyStart = i;
    break;
  }

  return {
    macrosFromHeader,
    bodyLines: lines.slice(bodyStart),
  };
}

// ---------------------------------------------------------------------------
// Core processing logic
// ---------------------------------------------------------------------------

/**
 * Expand a single command into one or more VHS lines.
 *
 * @param {string} cmd   Raw header token, e.g. "Type $1" or "Sleep 1s"
 * @param {string} payload  Usually args[1] (for Type-like macros)
 * @param {string[]} args   Positional args: args[1] = first payload line, etc.
 * @returns {string[]} VHS lines
 */
function expandSingleCommand(cmd, payload, args) {
  const trimmed = cmd.trim();
  if (!trimmed) return [];

  const base = baseCommandName(trimmed);
  const macro = META[base];

  if (macro) {
    const res = macro(payload, trimmed, args);
    return Array.isArray(res) ? res : [];
  }

  // No macro registered: treat as raw VHS line
  return [trimmed];
}

/**
 * Compute max positional argument index referenced in a header.
 *
 * @param {string[]} cmds
 * @returns {number}
 */
function maxArgIndex(cmds) {
  let max = 0;
  for (const cmd of cmds) {
    const matches = String(cmd).match(/\$(\d+)/g);
    if (!matches) continue;
    for (const m of matches) {
      const n = Number(m.slice(1)); // skip '$'
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max;
}

/**
 * Process a full pre-VHS script string into VHS.
 *
 * @param {string} input
 * @returns {string} output VHS
 */
function processText(input) {
  const allLines = String(input).split(/\r?\n/);

  // First pass: file header aliases
  const { macrosFromHeader, bodyLines } = parseFileHeader(allLines);
  if (Object.keys(macrosFromHeader).length > 0) {
    registerMacros(macrosFromHeader);
  }

  const lines = bodyLines;
  const out = [];

  let i = 0;
  let lastBase = "";

  while (i < lines.length) {
    const line = lines[i];

    // Meta line: starts with '>'
    if (/^\s*>\s*/.test(line)) {
      const headerText = line.replace(/^\s*>\s*/, "");
      let cmds = headerText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

      cmds = applyHeaderTransforms(cmds, { lineNo: i + 1, headerText });
          
      // 1) normal positional-arg detection
      let maxIdx = maxArgIndex(cmds);
          
      // 2) detect a *bare* Type (no arguments) if no $1..$n used
      const hasBareType =
        maxIdx === 0 &&
        cmds.some((c) => {
          const trimmed = c.trim();
          return trimmed === "Type"; // exactly "Type", no extra tokens
        });
      
      // 3) if we have a bare Type and no $n, treat the next line as $1
      if (hasBareType) {
        maxIdx = 1;
      }
      
      const args = [];
      for (let k = 1; k <= maxIdx; k++) {
        i += 1;
        args[k] = lines[i] ?? "";
      }
      const payload = args[1] || "";

      // Expand each command
      for (const cmd of cmds) {
        const expanded = expandSingleCommand(cmd, payload, args);
        for (const vhsLine of expanded) {
          const base = baseCommandName(vhsLine);
          if (shouldInsertGap(base, lastBase)) {
            out.push(`Sleep ${CURRENT_GAP}`);
          }
          out.push(vhsLine);
          if (base) lastBase = base;
        }
      }
    } else {
      // Non-meta line: passthrough as-is
      out.push(line);
      const base = baseCommandName(line);
      if (base) lastBase = base;
    }

    i += 1;
  }

  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Config loading and pack initialization
// ---------------------------------------------------------------------------

/**
 * Load config from explicit path or default pre-vhs.config.* in CWD.
 *
 * @param {string|undefined} configPathFromArg
 * @returns {PreVhsConfig}
 */
function loadConfig(configPathFromArg) {
  const cwd = process.cwd();
  let finalPath = null;

  if (configPathFromArg) {
    finalPath = path.resolve(cwd, configPathFromArg);
    if (!fs.existsSync(finalPath)) {
      throw new Error(`Config not found: ${finalPath}`);
    }
  } else {
    const candidates = [
      "pre-vhs.config.js",
      "pre-vhs.config.cjs",
      "pre-vhs.config.json",
    ];
    for (const name of candidates) {
      const p = path.join(cwd, name);
      if (fs.existsSync(p)) {
        finalPath = p;
        break;
      }
    }
  }

  if (!finalPath) {
    /** @type {PreVhsConfig} */
    const empty = { packs: [] };
    return empty;
  }

  // eslint-disable-next-line global-require, import/no-dynamic-require
  let cfg = require(finalPath);
  if (cfg && typeof cfg === "object" && "default" in cfg) {
    cfg = cfg.default;
  }

  if (!cfg || typeof cfg !== "object") cfg = {};
  if (!Array.isArray(cfg.packs)) cfg.packs = [];

  return /** @type {PreVhsConfig} */ (cfg);
}

/**
 * Initialize packs from config.
 *
 * Each pack module should export a function:
 *   module.exports = function setup(engine) { ... }
 *
 * where `engine` has:
 *   - registerMacros
 *   - registerHeaderTransform
 *   - helpers: { formatType, baseCommandName }
 *   - options: whatever is in packConfig.options
 *
 * @param {PreVhsConfig} config
 */
function initPacksFromConfig(config) {
  const cwd = process.cwd();
  const packs = config.packs || [];

  const engineBase = {
    registerMacros,
    registerHeaderTransform,
    helpers: { formatType, baseCommandName },
  };

  for (const spec of packs) {
    let moduleId;
    let enabled = true;
    let options = {};

    if (typeof spec === "string") {
      moduleId = spec;
    } else if (spec && typeof spec === "object") {
      moduleId = spec.module;
      if (spec.enabled === false) enabled = false;
      if (spec.options) options = spec.options;
    }

    if (!enabled || !moduleId) continue;

    const resolved = moduleId.startsWith(".")
      ? path.resolve(cwd, moduleId)
      : moduleId;

    // eslint-disable-next-line global-require, import/no-dynamic-require
    const packFactory = require(resolved);
    if (typeof packFactory === "function") {
      packFactory({
        ...engineBase,
        options,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { configPath: undefined, baseName: undefined };

  const raw = argv.slice(2);
  let i = 0;
  while (i < raw.length) {
    const tok = raw[i];
    if (tok === "--config" || tok === "-c") {
      args.configPath = raw[i + 1];
      i += 2;
    } else if (!args.baseName) {
      args.baseName = tok;
      i += 1;
    } else {
      i += 1;
    }
  }

  return args;
}

if (require.main === module) {
  try {
    const { configPath, baseName } = parseArgs(process.argv);
    const config = loadConfig(configPath);
    initPacksFromConfig(config);

    if (baseName) {
      const cwd = process.cwd();
      const inputPath = path.join(cwd, `${baseName}.tape.pre`);
      const outputPath = path.join(cwd, `${baseName}.tape`);

      if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        process.exit(1);
      }

      const input = fs.readFileSync(inputPath, "utf8");
      const output = processText(input);
      fs.writeFileSync(outputPath, output, "utf8");
    } else {
      // stdin -> stdout mode
      const input = fs.readFileSync(0, "utf8");
      const output = processText(input);
      process.stdout.write(output);
    }
  } catch (err) {
    console.error(`[pre-vhs] Error: ${err && err.message ? err.message : err}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Library exports
// ---------------------------------------------------------------------------

module.exports = {
  processText,
  registerMacros,
  registerHeaderTransform,
  formatType,
  baseCommandName,
};
