/**
 * Pack loading helpers for pre-vhs.
 *
 * Handles normalized pack specs, path resolution, and deduplication.
 */

const path = require("path");
const { formatType, baseCommandName } = require("./helpers");

const FIRST_PARTY_PACKS = {
  builtins: path.join(__dirname, "packs", "builtins.js"),
  typingstyles: path.join(__dirname, "packs", "typingStyles.js"),
  emojishortcuts: path.join(__dirname, "packs", "emojiShortcuts.js"),
  emoji: path.join(__dirname, "packs", "emojiShortcuts.js"),
  probe: path.join(__dirname, "packs", "probe.js"),
};

function ensureLoadedPacks(engine) {
  if (!engine._loadedPacks) {
    engine._loadedPacks = new Set();
  }
  return engine._loadedPacks;
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

function isPathLike(moduleId) {
  if (!moduleId) return false;
  if (path.isAbsolute(moduleId)) return true;
  if (moduleId.startsWith(".")) return true;
  if (moduleId.includes("/") || moduleId.includes("\\")) return true;
  if (moduleId.endsWith(".js")) return true;
  return false;
}

function normalizePackKey(moduleId) {
  return String(moduleId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function resolveFirstPartyPack(moduleId) {
  const key = normalizePackKey(moduleId);
  return FIRST_PARTY_PACKS[key] || "";
}

function resolveModuleId(moduleId, baseDir) {
  if (!moduleId || typeof moduleId !== "string") return "";
  const trimmed = moduleId.trim();
  if (!trimmed) return "";

  const firstParty = resolveFirstPartyPack(trimmed);
  if (firstParty) return firstParty;

  if (isPathLike(trimmed)) {
    return path.resolve(baseDir || process.cwd(), trimmed);
  }

  return trimmed;
}

function loadAndInitPack(packConfig, engine, baseDir) {
  const resolved = resolveModuleId(packConfig.moduleId, baseDir);
  if (!resolved) return;

  const loaded = ensureLoadedPacks(engine);
  if (loaded.has(resolved)) return;
  loaded.add(resolved);

  const packFactory = require(resolved);
  if (typeof packFactory !== "function") return;

  const registerMacros = packConfig.autoUse
    ? createAutoUseRegister(engine)
    : engine.registerMacros;

  packFactory({
    registerMacros,
    registerTransform: engine.registerTransform,
    helpers: { formatType, baseCommandName },
    options: packConfig.options,
  });
}

function initPacksFromSpecs(specs, engine, baseDir) {
  const list = Array.isArray(specs) ? specs : [];
  for (const spec of list) {
    const packConfig = normalizePackSpec(spec);
    if (!packConfig.enabled || !packConfig.moduleId) continue;
    loadAndInitPack(packConfig, engine, baseDir);
  }
}

function createAutoUseRegister(engine) {
  return (macros, macroOptions = {}) =>
    engine.registerMacros(macros, {
      ...macroOptions,
      requireUse: false,
    });
}

module.exports = {
  ensureLoadedPacks,
  normalizePackSpec,
  initPacksFromSpecs,
  loadAndInitPack,
  resolveModuleId,
};
