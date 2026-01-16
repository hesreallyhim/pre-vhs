/**
 * Core pre-vhs engine factory.
 *
 * Creates engine instances that process .tape.pre files into valid VHS .tape files.
 * Each engine instance has its own macro registry and transform pipeline.
 */

const { VHS_COMMANDS } = require("./constants");
const { formatType, baseCommandName, maxArgIndex } = require("./helpers");
const { parseFileHeader } = require("./parser");
const { createTransformPipeline } = require("./transforms");

// ---------------------------------------------------------------------------
// Default limits
// ---------------------------------------------------------------------------

const DEFAULT_MAX_EXPANSION_STEPS = 10000;
const DEFAULT_MAX_EXPANSION_DEPTH = 32;

// ---------------------------------------------------------------------------
// Engine factory
// ---------------------------------------------------------------------------

/**
 * Create a new pre-vhs engine instance.
 *
 * @param {object} options - Engine configuration
 * @param {boolean} [options.warnOnMacroCollision=true] - Warn on duplicate macro registration
 * @param {"off"|"warn"|"error"} [options.headerValidation="off"] - Header validation mode
 * @param {number} [options.maxExpansionSteps] - Max expansion steps before error
 * @param {number} [options.maxExpansionDepth] - Max recursion depth before error
 * @returns {object} Engine instance
 */
function createEngine(options = {}) {
  const macroRegistry = new Map();
  const warnOnMacroCollision = options.warnOnMacroCollision !== false;
  const headerValidation = options.headerValidation || "off";
  const MAX_EXPANSION_STEPS =
    options.maxExpansionSteps || DEFAULT_MAX_EXPANSION_STEPS;
  const MAX_EXPANSION_DEPTH =
    options.maxExpansionDepth || DEFAULT_MAX_EXPANSION_DEPTH;

  const pipeline = createTransformPipeline();

  // -------------------------------------------------------------------------
  // Macro registration
  // -------------------------------------------------------------------------

  function registerMacros(macros, macroOptions = {}) {
    if (!macros || typeof macros !== "object") return;
    const requireUse = macroOptions.requireUse !== false;
    const warnVhsCollision = macroOptions.warnVhsCollision === true;

    for (const [name, fn] of Object.entries(macros)) {
      if (typeof fn !== "function") continue;

      if (warnOnMacroCollision && macroRegistry.has(name)) {
        console.warn(
          `[pre-vhs] Duplicate macro registration for '${name}', last definition wins`,
        );
      }
      if (warnVhsCollision && VHS_COMMANDS.has(name)) {
        console.warn(
          `[pre-vhs] WARNING: Collision detected between custom macro '${name}' and VHS command`,
        );
      }
      macroRegistry.set(name, { fn, requireUse });
    }
  }

  // -------------------------------------------------------------------------
  // Built-in Type macro (always-on)
  // -------------------------------------------------------------------------

  registerMacros(
    {
      Type(_payload, rawCmd) {
        const remainder = rawCmd.replace(/^Type\b/, "").trim();

        // If already backtick-wrapped, treat as final VHS
        if (/^`.*`$/.test(remainder)) {
          return [rawCmd.trim()];
        }

        // Strip simple matching quotes to avoid double-quoting
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
  // Argument substitution
  // -------------------------------------------------------------------------

  function substituteArgs(str, args) {
    let result = String(str).replace(/\$\*/g, () => args["*"] ?? "");
    result = result.replace(/\$(\d+)/g, (_m, n) => args[Number(n)] ?? "");
    return result;
  }

  // -------------------------------------------------------------------------
  // Main processing function
  // -------------------------------------------------------------------------

  function processText(input) {
    const allLines = String(input).split(/\r?\n/);
    const { macrosFromHeader, useNames, bodyLines, bodyStartIndex } =
      parseFileHeader(allLines, headerValidation);

    const useSet = new Set(useNames);
    registerMacros(macrosFromHeader, {
      requireUse: false,
      warnVhsCollision: true,
    });

    const output = [];
    const state = { lastEmittedBase: "", expansionSteps: 0 };

    processBodyLines(bodyLines, bodyStartIndex, useSet, output, state);

    return pipeline.applyFinalizeTransforms(output).join("\n");
  }

  // -------------------------------------------------------------------------
  // Body processing
  // -------------------------------------------------------------------------

  function processBodyLines(bodyLines, bodyStartIndex, useSet, output, state) {
    let i = 0;
    while (i < bodyLines.length) {
      const line = bodyLines[i];
      const lineNo = bodyStartIndex + i + 1;

      if (/^\s*>\s*/.test(line)) {
        i = processDirectiveLine(
          line,
          lineNo,
          bodyLines,
          i,
          useSet,
          output,
          state,
        );
      } else {
        emitWithPostTransforms([line], { lineNo }, output, state);
      }
      i += 1;
    }
  }

  function processDirectiveLine(
    line,
    lineNo,
    bodyLines,
    currentIndex,
    useSet,
    output,
    state,
  ) {
    const headerText = line.replace(/^\s*>\s*/, "");
    let tokens = headerText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    tokens = pipeline.applyHeaderTransforms(tokens, { lineNo, headerText });

    const { effectiveMaxIdx, hasStar } = analyzeArguments(tokens);
    const { args, newIndex } = consumeArguments(
      bodyLines,
      currentIndex,
      effectiveMaxIdx,
      hasStar,
    );

    const payload = args[1] || args["*"] || "";
    expandAndEmitTokens(
      tokens,
      payload,
      args,
      useSet,
      lineNo,
      headerText,
      output,
      state,
    );

    return newIndex;
  }

  function analyzeArguments(tokens) {
    const { max: maxIdx, hasStar: hasStaticStar } = maxArgIndex(tokens);

    const hasMacroStar = tokens.some((tok) => {
      const name = tok.trim().split(/\s+/)[0];
      const entry = macroRegistry.get(name);
      return entry?.fn?.hasStar === true;
    });

    const hasStar = hasStaticStar || hasMacroStar;
    const hasBareType =
      maxIdx === 0 && !hasStar && tokens.some((c) => c.trim() === "Type");
    const effectiveMaxIdx = hasBareType ? 1 : maxIdx;

    return { effectiveMaxIdx, hasStar };
  }

  function consumeArguments(bodyLines, currentIndex, effectiveMaxIdx, hasStar) {
    const args = [];
    let i = currentIndex;

    for (let k = 1; k <= effectiveMaxIdx; k++) {
      i += 1;
      args[k] = bodyLines[i] ?? "";
    }

    if (hasStar) {
      const starLines = [];
      while (i + 1 < bodyLines.length) {
        const nextLine = bodyLines[i + 1];
        if (nextLine.trim() === "") {
          i += 1;
          break;
        }
        starLines.push(nextLine);
        i += 1;
      }
      args["*"] = starLines.join("\n");
      if (effectiveMaxIdx < 1 && args[1] === undefined) {
        args[1] = args["*"];
      }
    }

    return { args, newIndex: i };
  }

  function expandAndEmitTokens(
    tokens,
    payload,
    args,
    useSet,
    lineNo,
    headerText,
    output,
    state,
  ) {
    for (let idx = 0; idx < tokens.length; idx++) {
      const ctx = { lineNo, headerText, tokenIndex: idx };
      const expanded = expandTokenRecursive(
        tokens[idx],
        payload,
        args,
        useSet,
        ctx,
        [],
        state,
      );
      emitWithPostTransforms(expanded, ctx, output, state);
    }
  }

  // -------------------------------------------------------------------------
  // Token expansion
  // -------------------------------------------------------------------------

  function expandTokenRecursive(
    token,
    payload,
    args,
    useSet,
    ctx,
    stack,
    state,
  ) {
    checkExpansionLimits(state, stack, ctx);
    state.expansionSteps += 1;

    const hadPlaceholders = /\$(\d+)/.test(token) || /\$\*/.test(token);
    const withArgs = substituteArgs(token, args);
    const preTokens = pipeline.applyPreExpandTransforms(withArgs, ctx);

    const results = [];
    for (const tok of preTokens) {
      const trimmed = tok.trim();
      if (!trimmed) continue;
      results.push(
        ...expandSingleToken(
          trimmed,
          payload,
          args,
          useSet,
          ctx,
          stack,
          state,
          hadPlaceholders,
        ),
      );
    }

    return results;
  }

  function checkExpansionLimits(state, stack, ctx) {
    if (state.expansionSteps >= MAX_EXPANSION_STEPS) {
      const chain = stack.length ? ` (stack: ${stack.join(" -> ")})` : "";
      throw new Error(
        `Macro expansion exceeded ${MAX_EXPANSION_STEPS} steps around line ${ctx.lineNo}${chain}`,
      );
    }
  }

  function expandSingleToken(
    trimmed,
    payload,
    args,
    useSet,
    ctx,
    stack,
    state,
    hadPlaceholders,
  ) {
    const base = baseCommandName(trimmed);
    const entry = macroRegistry.get(base);
    const isActive = entry && (entry.requireUse === false || useSet.has(base));

    if (!entry || !isActive) {
      return [trimmed];
    }

    validateRecursion(base, stack, ctx);

    const { payloadForCall, effectiveArgs } = prepareCallArgs(
      trimmed,
      payload,
      args,
      hadPlaceholders,
    );
    const macroResult = entry.fn(payloadForCall, trimmed, effectiveArgs, ctx);

    return expandMacroResult(
      macroResult,
      base,
      payloadForCall,
      effectiveArgs,
      useSet,
      ctx,
      stack,
      state,
    );
  }

  function validateRecursion(base, stack, ctx) {
    if (stack.includes(base)) {
      throw new Error(
        `Macro recursion detected: ${[...stack, base].join(" -> ")}`,
      );
    }
    if (stack.length >= MAX_EXPANSION_DEPTH) {
      const chain = ` (stack: ${stack.join(" -> ")})`;
      throw new Error(
        `Macro expansion depth exceeded ${MAX_EXPANSION_DEPTH} near line ${ctx.lineNo}${chain}`,
      );
    }
  }

  function prepareCallArgs(trimmed, payload, args, hadPlaceholders) {
    const remainderText = trimmed.replace(/^\S+\s*/, "").trim();
    const payloadForCall = hadPlaceholders
      ? payload
      : remainderText || payload || "";

    const effectiveArgs = Array.isArray(args) ? [...args] : [];
    if (args && args["*"] !== undefined) {
      effectiveArgs["*"] = args["*"];
    }
    if (remainderText && !hadPlaceholders) {
      effectiveArgs[1] = remainderText;
    }

    return { payloadForCall, effectiveArgs };
  }

  function expandMacroResult(
    result,
    base,
    payload,
    args,
    useSet,
    ctx,
    stack,
    state,
  ) {
    const arr = Array.isArray(result) ? result : [];
    const expanded = [];

    for (const child of arr) {
      const childBase = baseCommandName(child);
      if (childBase === base) {
        expanded.push(String(child));
        continue;
      }
      expanded.push(
        ...expandTokenRecursive(
          child,
          payload,
          args,
          useSet,
          ctx,
          [...stack, base],
          state,
        ),
      );
    }

    return expanded;
  }

  // -------------------------------------------------------------------------
  // Output emission
  // -------------------------------------------------------------------------

  function emitWithPostTransforms(lines, ctx, output, state) {
    const list = Array.isArray(lines) ? lines : [lines];
    for (const line of list) {
      const expanded = pipeline.applyPostExpandTransforms(line, {
        ...ctx,
        lastLineBase: state.lastEmittedBase,
      });
      for (const l of expanded) {
        const base = baseCommandName(l);
        if (base) state.lastEmittedBase = base;
        output.push(l);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  return {
    registerMacros,
    registerTransform: pipeline.registerTransform,
    processText,
    helpers: { formatType, baseCommandName },
  };
}

module.exports = { createEngine };
