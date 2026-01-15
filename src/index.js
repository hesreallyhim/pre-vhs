#!/usr/bin/env node

/**
 * Core VHS preprocessor engine + CLI (single-file layout).
 *
 * Design goals in this pass:
 *   - Only `Type` is always-on. Everything else is opt-in via packs + `Use ...`.
 *   - Phase-based transforms: header, preExpandToken, postExpand, finalize.
 *   - Recursive macro expansion with guards against cycles/blowups.
 *   - No module-level mutable state leaking across runs; each engine instance
 *     carries its own registries.
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape arbitrary text for a VHS Type command.
 * Always emits: Type `escaped text`
 */
function formatType(text = "") {
  const s = String(text);
  // Only backticks need escaping inside a backtick-quoted literal.
  const escaped = s.replace(/`/g, "\\`");
  return `Type \`${escaped}\``;
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

/**
 * Compute max positional argument index referenced in a list of header tokens.
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
 * Given an alias name and its body command list, build a macro function
 * that substitutes $1, $2, ... using the call-site args and returns
 * a list of header tokens (which themselves will be expanded as usual).
 */
function makeAliasMacro(name, bodyCmds) {
  return function aliasMacro(_payload, _rawCmd, args) {
    const out = [];
    for (const bodyCmd of bodyCmds) {
      const expanded = bodyCmd.replace(
        /\$(\d+)/g,
        (_, n) => args[Number(n)] ?? "",
      );
      out.push(expanded);
    }
    return out;
  };
}

/**
 * Parse a file header at the top of the .tape.pre:
 * - Skips blank lines and comments (#..., //...).
 * - `Use ...` lines collect macro names to activate.
 * - Alias lines: Name = Cmd1, Cmd2, ...
 * - Stops at the first line that is not blank/comment/alias/Use.
 */
function parseFileHeader(lines) {
  const macrosFromHeader = {};
  const useNames = [];
  let bodyStart = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Blank lines
    if (/^\s*$/.test(line)) continue;

    // Comments
    if (/^\s*#/.test(line) || /^\s*\/\//.test(line)) continue;

    // Use statements: Use Foo Bar Baz
    const useMatch = line.match(/^\s*Use\s+(.+)$/);
    if (useMatch) {
      const names = useMatch[1]
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      useNames.push(...names);
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
    useNames,
    bodyLines: lines.slice(bodyStart),
    bodyStartIndex: bodyStart,
  };
}

// ---------------------------------------------------------------------------
// Engine factory
// ---------------------------------------------------------------------------

function createEngine(options = {}) {
  // registry: name -> { fn, requireUse }
  const macroRegistry = new Map();
  const warnOnMacroCollision =
    options.warnOnMacroCollision === false ? false : true;

  // transforms per phase
  const transforms = {
    header: [],
    preExpandToken: [],
    postExpand: [],
    finalize: [],
  };

  // Guards
  const MAX_EXPANSION_STEPS = options.maxExpansionSteps || 10000;
  const MAX_EXPANSION_DEPTH = options.maxExpansionDepth || 32;

  // Helpers to register macros/transforms
  function registerMacros(macros, macroOptions = {}) {
    if (!macros || typeof macros !== "object") return;
    const requireUse = macroOptions.requireUse !== false; // default true
    for (const [name, fn] of Object.entries(macros)) {
      if (typeof fn === "function") {
        if (warnOnMacroCollision && macroRegistry.has(name)) {
          console.warn(
            `[pre-vhs] Duplicate macro registration for '${name}', last definition wins`,
          );
        }
        macroRegistry.set(name, { fn, requireUse });
      }
    }
  }

  function registerTransform(phase, fn) {
    if (!transforms[phase]) return;
    if (typeof fn === "function") {
      transforms[phase].push(fn);
    }
  }

  // Always-on core macro: Type
  registerMacros(
    {
      Type(_payload, rawCmd) {
        const remainder = rawCmd.replace(/^Type\b/, "").trim();

        // If already backtick-wrapped, treat as final VHS.
        if (/^`.*`$/.test(remainder)) {
          return [rawCmd.trim()];
        }

        // Strip simple matching quotes to avoid double-quoting.
        const stripped =
          /^".*"$/.test(remainder) || /^'.*'$/.test(remainder)
            ? remainder.slice(1, -1)
            : remainder;

        const text = stripped || _payload || "";
        return [formatType(text)];
      },
    },
    { requireUse: false },
  );

  // -------------------------------------------------------------------------
  // Transform application helpers
  // -------------------------------------------------------------------------

  function applyHeaderTransforms(cmds, ctx) {
    let current = cmds;
    for (const fn of transforms.header) {
      const next = fn(current, ctx);
      if (Array.isArray(next)) current = next;
    }
    return current;
  }

  function applyPreExpandTransforms(cmd, ctx) {
    let bucket = [cmd];
    for (const fn of transforms.preExpandToken) {
      const nextBucket = [];
      for (const token of bucket) {
        const res = fn(token, ctx);
        if (Array.isArray(res) && res.length) {
          nextBucket.push(...res);
        } else if (typeof res === "string") {
          nextBucket.push(res);
        } else {
          nextBucket.push(token);
        }
      }
      bucket = nextBucket;
    }
    return bucket;
  }

  function applyPostExpandTransforms(lines, ctx) {
    let bucket = Array.isArray(lines) ? [...lines] : [lines];
    for (const fn of transforms.postExpand) {
      const nextBucket = [];
      for (const line of bucket) {
        const res = fn(line, ctx);
        if (Array.isArray(res) && res.length) {
          nextBucket.push(...res);
        } else if (typeof res === "string") {
          nextBucket.push(res);
        } else {
          nextBucket.push(line);
        }
      }
      bucket = nextBucket;
    }
    return bucket;
  }

  function applyFinalizeTransforms(lines) {
    let current = lines;
    for (const fn of transforms.finalize) {
      const next = fn(current);
      if (Array.isArray(next)) current = next;
    }
    return current;
  }

  // -------------------------------------------------------------------------
  // Expansion logic
  // -------------------------------------------------------------------------

  function substituteArgs(str, args) {
    return String(str).replace(/\$(\d+)/g, (_m, n) => {
      const idx = Number(n);
      return args[idx] != null ? args[idx] : "";
    });
  }

  function processText(input) {
    const allLines = String(input).split(/\r?\n/);
    const { macrosFromHeader, useNames, bodyLines, bodyStartIndex } =
      parseFileHeader(allLines);

    const useSet = new Set(useNames);
    registerMacros(macrosFromHeader, { requireUse: false });

    const out = [];
    const state = {
      lastEmittedBase: "",
      expansionSteps: 0,
    };

    let i = 0;
    while (i < bodyLines.length) {
      const line = bodyLines[i];
      const logicalLineNo = bodyStartIndex + i + 1;

      // Meta line: starts with '>'
      if (/^\s*>\s*/.test(line)) {
        const headerText = line.replace(/^\s*>\s*/, "");
        let tokens = headerText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        tokens = applyHeaderTransforms(tokens, {
          lineNo: logicalLineNo,
          headerText,
        });

        // Argument detection
        let maxIdx = maxArgIndex(tokens);
        const hasBareType =
          maxIdx === 0 &&
          tokens.some((c) => {
            const t = c.trim();
            return t === "Type";
          });
        if (hasBareType) maxIdx = 1;

        const args = [];
        for (let k = 1; k <= maxIdx; k++) {
          i += 1;
          args[k] = bodyLines[i] ?? "";
        }
        const payload = args[1] || "";

        // Expand each token
        for (let idxTok = 0; idxTok < tokens.length; idxTok++) {
          const token = tokens[idxTok];

          const expanded = expandTokenRecursive(token, payload, args, useSet, {
            lineNo: logicalLineNo,
            headerText,
            tokenIndex: idxTok,
          });

          emitLinesWithPostTransforms(expanded, {
            lineNo: logicalLineNo,
            headerText,
          });
        }
      } else {
        // Non-meta line: passthrough as-is
        emitLinesWithPostTransforms([line], { lineNo: logicalLineNo });
      }

      i += 1;
    }

    const finalized = applyFinalizeTransforms(out);
    return finalized.join("\n");

    // -------------------------------------------------------
    // Local helpers (closure over state/out/useSet)
    // -------------------------------------------------------

    function expandTokenRecursive(
      token,
      payload,
      args,
      useSetLocal,
      ctx,
      stack = [],
    ) {
      if (state.expansionSteps >= MAX_EXPANSION_STEPS) {
        const chain = stack.length ? ` (stack: ${stack.join(" -> ")})` : "";
        throw new Error(
          `Macro expansion exceeded ${MAX_EXPANSION_STEPS} steps around line ${ctx.lineNo}${chain}`,
        );
      }
      state.expansionSteps += 1;

      const results = [];
      const hadPlaceholders = /\$(\d+)/.test(token);
      const withArgs = substituteArgs(token, args);
      const preTokens = applyPreExpandTransforms(withArgs, ctx);

      for (const tok of preTokens) {
        const trimmed = tok.trim();
        if (!trimmed) continue;

        const base = baseCommandName(trimmed);
        const entry = macroRegistry.get(base);
        const active =
          entry && (entry.requireUse === false || useSetLocal.has(base));

        if (!entry || !active) {
          results.push(trimmed);
          continue;
        }

        if (stack.includes(base)) {
          throw new Error(
            `Macro recursion detected: ${[...stack, base].join(" -> ")}`,
          );
        }
        if (stack.length >= MAX_EXPANSION_DEPTH) {
          const chain = stack.length ? ` (stack: ${stack.join(" -> ")})` : "";
          throw new Error(
            `Macro expansion depth exceeded ${MAX_EXPANSION_DEPTH} near line ${ctx.lineNo}${chain}`,
          );
        }

        const remainderText = trimmed.replace(/^\S+\s*/, "").trim();
        const payloadForCall = hadPlaceholders
          ? payload
          : remainderText || payload || "";
        const effectiveArgs = Array.isArray(args) ? [...args] : [];
        if (remainderText && !hadPlaceholders) {
          effectiveArgs[1] = remainderText;
        }

        const res = entry.fn(payloadForCall, trimmed, effectiveArgs, ctx);
        const arr = Array.isArray(res) ? res : [];

        for (const child of arr) {
          const childBase = baseCommandName(child);
          // Avoid immediately re-expanding the same macro output (e.g., Type -> Type)
          if (childBase === base) {
            results.push(String(child));
            continue;
          }

          results.push(
            ...expandTokenRecursive(
              child,
              payloadForCall,
              effectiveArgs,
              useSetLocal,
              ctx,
              [...stack, base],
            ),
          );
        }
      }

      return results;
    }

    function emitLinesWithPostTransforms(lines, ctx) {
      const list = Array.isArray(lines) ? lines : [lines];
      for (const line of list) {
        const expanded = applyPostExpandTransforms(line, {
          ...ctx,
          lastLineBase: state.lastEmittedBase,
        });
        for (const l of expanded) {
          const base = baseCommandName(l);
          if (base) state.lastEmittedBase = base;
          out.push(l);
        }
      }
    }
  }

  return {
    registerMacros,
    registerTransform,
    processText,
    helpers: { formatType, baseCommandName },
  };
}

// ---------------------------------------------------------------------------
// Config loading and pack initialization
// ---------------------------------------------------------------------------

/**
 * Load config from explicit path or default pre-vhs.config.* in CWD.
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
    return { packs: [] };
  }

  let cfg = require(finalPath);
  if (cfg && typeof cfg === "object" && "default" in cfg) {
    cfg = cfg.default;
  }

  if (!cfg || typeof cfg !== "object") cfg = {};
  if (!Array.isArray(cfg.packs)) cfg.packs = [];

  return cfg;
}

/**
 * Initialize packs from config.
 *
 * Each pack module should export a function:
 *   module.exports = function setup(engine) { ... }
 *
 * where `engine` has:
 *   - registerMacros
 *   - registerTransform (phase-based)
 *   - helpers: { formatType, baseCommandName }
 *   - options: whatever is in packConfig.options
 */
function initPacksFromConfig(config, engine) {
  const cwd = process.cwd();
  const packs = config.packs || [];

  const engineBase = {
    registerMacros: engine.registerMacros,
    registerTransform: engine.registerTransform,
    helpers: { formatType, baseCommandName },
  };

  for (const spec of packs) {
    let moduleId;
    let enabled = true;
    let options = {};
    let autoUse = false;

    if (typeof spec === "string") {
      moduleId = spec;
    } else if (spec && typeof spec === "object") {
      moduleId = spec.module;
      if (spec.enabled === false) enabled = false;
      if (spec.options) options = spec.options;
      if (spec.autoUse) autoUse = true;
    }

    if (!enabled || !moduleId) continue;

    const resolved = moduleId.startsWith(".")
      ? path.resolve(cwd, moduleId)
      : moduleId;

    const packFactory = require(resolved);
    if (typeof packFactory === "function") {
      const registerMacros = autoUse
        ? (macros, macroOptions = {}) =>
            engine.registerMacros(macros, {
              ...macroOptions,
              requireUse: false,
            })
        : engine.registerMacros;

      packFactory({
        ...engineBase,
        registerMacros,
        options,
      });
    }
  }
}

/**
 * Convenience wrapper: create a fresh engine, init packs from config (if any),
 * and process input text in a single call.
 */
function processText(input, options = {}) {
  const engine = createEngine(options.engineOptions);
  if (options.config) {
    initPacksFromConfig(options.config, engine);
  }
  return engine.processText(input);
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
    const engine = createEngine();
    initPacksFromConfig(config, engine);

    if (baseName) {
      const cwd = process.cwd();
      const inputPath = path.join(cwd, `${baseName}.tape.pre`);
      const outputPath = path.join(cwd, `${baseName}.tape`);

      if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        process.exit(1);
      }

      const input = fs.readFileSync(inputPath, "utf8");
      const output = engine.processText(input);
      fs.writeFileSync(outputPath, output, "utf8");
    } else {
      // stdin -> stdout mode
      const input = fs.readFileSync(0, "utf8");
      const output = engine.processText(input);
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
  createEngine,
  processText,
  loadConfig,
  initPacksFromConfig,
  formatType,
  baseCommandName,
};
