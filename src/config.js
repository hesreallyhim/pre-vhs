/**
 * Configuration loading and pack initialization for pre-vhs.
 *
 * Handles loading config files, resolving pack paths, and initializing
 * pack modules with the engine instance.
 */

const fs = require("fs");
const path = require("path");

const { formatType, baseCommandName } = require("./helpers");
const { createEngine } = require("./engine");

const FIRST_PARTY_PACKS = [
  "builtins",
  "typingStyles",
  "emojiShortcuts",
  "probe",
];

// ---------------------------------------------------------------------------
// Config file detection
// ---------------------------------------------------------------------------

const CONFIG_CANDIDATES = [
  "pre-vhs.config.js",
  "pre-vhs.config.cjs",
  "pre-vhs.config.json",
];

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

/**
 * Load config from explicit path or default pre-vhs.config.* in CWD.
 *
 * @param {string} [configPathFromArg] - Explicit config path (optional)
 * @returns {{ config: object, configDir: string }} Config object and its directory
 */
function loadConfig(configPathFromArg) {
  const cwd = process.cwd();
  const configPath = resolveConfigPath(configPathFromArg, cwd);

  if (!configPath) {
    return { config: { packs: [] }, configDir: cwd };
  }

  const config = loadConfigFile(configPath);
  return { config, configDir: path.dirname(configPath) };
}

function resolveConfigPath(explicitPath, cwd) {
  if (explicitPath) {
    const resolved = path.resolve(cwd, explicitPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Config not found: ${resolved}`);
    }
    return resolved;
  }

  for (const name of CONFIG_CANDIDATES) {
    const candidate = path.join(cwd, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function loadConfigFile(configPath) {
  let cfg = require(configPath);

  // Handle ES module default exports
  if (cfg && typeof cfg === "object" && "default" in cfg) {
    cfg = cfg.default;
  }

  if (!cfg || typeof cfg !== "object") cfg = {};
  if (!Array.isArray(cfg.packs)) cfg.packs = [];
  if (!Array.isArray(cfg.excludePacks)) cfg.excludePacks = [];

  return cfg;
}

// ---------------------------------------------------------------------------
// Pack initialization
// ---------------------------------------------------------------------------

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
 *
 * @param {object} config - The config object containing packs array
 * @param {object} engine - The pre-vhs engine instance
 * @param {string} [configDir] - Directory containing config file (for resolving relative paths)
 */
function initPacksFromConfig(config, engine, configDir) {
  const baseDir = configDir || process.cwd();
  const packs = config.packs || [];

  const excluded = new Set(
    (config.excludePacks || []).map(normalizePackName).filter(Boolean),
  );
  const explicitNames = new Set(
    packs.map(packNameFromSpec).filter(Boolean).map(normalizePackName),
  );
  const autoPacks = FIRST_PARTY_PACKS.filter(
    (name) => !excluded.has(name) && !explicitNames.has(name),
  ).map((name) => ({
    module: path.join(__dirname, "packs", `${name}.js`),
    enabled: true,
    options: {},
    autoUse: false,
  }));

  const allPacks = [...autoPacks, ...packs];

  const engineBase = {
    registerMacros: engine.registerMacros,
    registerTransform: engine.registerTransform,
    helpers: { formatType, baseCommandName },
  };

  for (const spec of allPacks) {
    const packConfig = normalizePackSpec(spec);
    if (!packConfig.enabled || !packConfig.moduleId) continue;

    loadAndInitPack(packConfig, engineBase, engine, baseDir);
  }
}

function normalizePackName(name) {
  return String(name || "").trim().toLowerCase();
}

function packNameFromSpec(spec) {
  if (typeof spec === "string") return packNameFromModuleId(spec);
  if (spec && typeof spec === "object") return packNameFromModuleId(spec.module);
  return "";
}

function packNameFromModuleId(moduleId) {
  if (!moduleId || typeof moduleId !== "string") return "";
  const base = path.basename(moduleId);
  const trimmed = base.endsWith(".js") ? base.slice(0, -3) : base;
  return trimmed;
}

function normalizePackSpec(spec) {
  if (typeof spec === "string") {
    return { moduleId: spec, enabled: true, options: {}, autoUse: false };
  }

  if (spec && typeof spec === "object") {
    return {
      moduleId: spec.module,
      enabled: spec.enabled !== false,
      options: spec.options || {},
      autoUse: spec.autoUse || false,
    };
  }

  return { moduleId: null, enabled: false, options: {}, autoUse: false };
}

function loadAndInitPack(packConfig, engineBase, engine, baseDir) {
  const resolved = packConfig.moduleId.startsWith(".")
    ? path.resolve(baseDir, packConfig.moduleId)
    : packConfig.moduleId;

  const packFactory = require(resolved);
  if (typeof packFactory !== "function") return;

  const registerMacros = packConfig.autoUse
    ? createAutoUseRegister(engine)
    : engine.registerMacros;

  packFactory({
    ...engineBase,
    registerMacros,
    options: packConfig.options,
  });
}

function createAutoUseRegister(engine) {
  return (macros, macroOptions = {}) =>
    engine.registerMacros(macros, {
      ...macroOptions,
      requireUse: false,
    });
}

// ---------------------------------------------------------------------------
// Convenience wrapper
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper: create a fresh engine, init packs from config (if any),
 * and process input text in a single call.
 *
 * @param {string} input - The input text to process
 * @param {object} [options] - Processing options
 * @param {object} [options.config] - Config object with packs array
 * @param {string} [options.configDir] - Directory for resolving relative pack paths
 * @param {object} [options.engineOptions] - Options to pass to createEngine
 * @returns {string} Processed output
 */
function processText(input, options = {}) {
  const engine = createEngine(options.engineOptions);
  initPacksFromConfig(options.config || {}, engine, options.configDir);
  return engine.processText(input);
}

module.exports = {
  loadConfig,
  initPacksFromConfig,
  processText,
};
