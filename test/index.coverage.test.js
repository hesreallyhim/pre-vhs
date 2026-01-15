import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  createEngine,
  formatType,
  initPacksFromConfig,
  loadConfig,
  processText,
} from "../src/index.js";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "..");
const fixtureRel = "./test/fixtures/pack.fixture.js";
const fixtureAbs = path.join(repoRoot, "test", "fixtures", "pack.fixture.js");

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pre-vhs-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function clearRequireCache(targetPath) {
  try {
    delete require.cache[require.resolve(targetPath)];
  } catch {
    // Ignore missing cache entries for test helpers.
  }
}

describe("index.js engine paths", () => {
  it("ignores invalid registrations and non-function transforms", () => {
    const engine = createEngine();
    engine.registerMacros(null);
    engine.registerTransform("not-a-phase", () => {});
    engine.registerTransform("preExpandToken", "nope");

    expect(engine.processText("raw line")).toBe("raw line");
  });

  it("applies pre/post/finalize transforms and skips blank tokens", () => {
    const engine = createEngine();
    engine.registerTransform("preExpandToken", (token) => {
      if (token.startsWith("Multi")) {
        const payload = token.replace(/^Multi\s*/, "");
        return [formatType(payload), "Enter"];
      }
      if (token.startsWith("Single")) {
        const payload = token.replace(/^Single\s*/, "");
        return formatType(payload);
      }
      if (token.startsWith("Blank")) return "   ";
      return null;
    });
    engine.registerTransform("postExpand", (line) => {
      if (line === "Enter") return ["Sleep 1s", "Enter"];
      if (line === formatType("hi")) return formatType("hi!");
      return null;
    });
    engine.registerTransform("finalize", (lines) => [...lines, "Done"]);

    const input = [
      "> Multi $1, Single $1, Keep $1, Blank $1, Type $1, Enter",
      "hi",
      "RawLine",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("hi!"),
      "Sleep 1s",
      "Enter",
      formatType("hi!"),
      "Keep hi",
      formatType("hi!"),
      "Sleep 1s",
      "Enter",
      "RawLine",
      "Done",
    ]);
  });

  it("treats bare Type as expecting a payload line", () => {
    const engine = createEngine();
    const input = ["> Type", "hello"].join("\n");

    expect(engine.processText(input)).toBe(formatType("hello"));
  });

  it("defaults missing payload lines to empty strings", () => {
    const engine = createEngine();
    const input = ["> Type $1"].join("\n");

    expect(engine.processText(input)).toBe(formatType(""));
  });

  it("fills missing alias args with empty strings", () => {
    const engine = createEngine();
    const input = ["Alias = Type $2", "> Alias"].join("\n");

    expect(engine.processText(input)).toBe(formatType(""));
  });

  it("throws on direct macro recursion", () => {
    const engine = createEngine();
    engine.registerMacros(
      {
        A: () => ["B"],
        B: () => ["A"],
      },
      { requireUse: false },
    );

    expect(() => engine.processText("> A")).toThrow(/recursion/i);
  });

  it("ignores non-array macro returns", () => {
    const engine = createEngine();
    engine.registerMacros(
      {
        BadMacro: () => "Type `oops`",
      },
      { requireUse: false },
    );

    expect(engine.processText("> BadMacro")).toBe("");
  });
});

describe("index.js config helpers", () => {
  it("returns empty packs when no config exists in cwd", () => {
    withTempDir((dir) => {
      const prev = process.cwd();
      process.chdir(dir);
      try {
        const cfg = loadConfig();
        expect(cfg.packs).toEqual([]);
      } finally {
        process.chdir(prev);
      }
    });
  });

  it("loads explicit config paths and handles defaults", () => {
    withTempDir((dir) => {
      const configPath = path.join(dir, "explicit.config.js");
      fs.writeFileSync(
        configPath,
        "module.exports = { packs: ['alpha'] };",
        "utf8",
      );

      const cfg = loadConfig(configPath);
      expect(cfg.packs).toEqual(["alpha"]);
      clearRequireCache(configPath);
    });
  });

  it("reads default configs from cwd", () => {
    const cfg = loadConfig();
    expect(Array.isArray(cfg.packs)).toBe(true);
  });

  it("supports default exports and non-object configs", () => {
    withTempDir((dir) => {
      const defaultPath = path.join(dir, "default.config.js");
      fs.writeFileSync(
        defaultPath,
        "module.exports = { default: { packs: ['beta'] } };",
        "utf8",
      );
      const cfgDefault = loadConfig(defaultPath);
      expect(cfgDefault.packs).toEqual(["beta"]);
      clearRequireCache(defaultPath);

      const badPath = path.join(dir, "bad.config.js");
      fs.writeFileSync(badPath, "module.exports = 'nope';", "utf8");
      const cfgBad = loadConfig(badPath);
      expect(cfgBad.packs).toEqual([]);
      clearRequireCache(badPath);
    });
  });

  it("throws when an explicit config path is missing", () => {
    withTempDir((dir) => {
      const missingPath = path.join(dir, "missing.config.js");
      expect(() => loadConfig(missingPath)).toThrow(/Config not found/);
    });
  });
});

describe("index.js pack initialization", () => {
  it("initializes packs from string specs and honors Use", () => {
    const engine = createEngine({ warnOnMacroCollision: false });
    initPacksFromConfig({ packs: [fixtureRel] }, engine);

    const inputNoUse = ["> FixtureEcho $1", "hello"].join("\n");
    expect(engine.processText(inputNoUse)).toBe("FixtureEcho hello");

    const inputUse = ["Use FixtureEcho", "> FixtureEcho $1", "hello"].join(
      "\n",
    );
    expect(engine.processText(inputUse)).toBe(formatType("fixture hello"));
  });

  it("supports autoUse + options and absolute module paths", () => {
    const engine = createEngine({ warnOnMacroCollision: false });
    initPacksFromConfig(
      {
        packs: [
          {
            module: fixtureAbs,
            options: { suffix: "!" },
            autoUse: true,
          },
        ],
      },
      engine,
    );

    const input = ["> FixtureEcho $1", "hello"].join("\n");
    expect(engine.processText(input)).toBe(formatType("fixture! hello"));
  });

  it("skips disabled or invalid pack entries", () => {
    const engine = createEngine({ warnOnMacroCollision: false });
    initPacksFromConfig(
      {
        packs: [{ module: fixtureAbs, enabled: false }, {}],
      },
      engine,
    );

    const input = ["Use FixtureEcho", "> FixtureEcho $1", "hello"].join("\n");
    expect(engine.processText(input)).toBe("FixtureEcho hello");
  });

  it("processText wrapper loads packs when config is provided", () => {
    const input = ["> FixtureEcho $1", "hello"].join("\n");
    const output = processText(input, {
      config: {
        packs: [{ module: fixtureAbs, autoUse: true }],
      },
    });

    expect(output).toBe(formatType("fixture hello"));
  });

  it("handles missing packs arrays safely", () => {
    const engine = createEngine();
    initPacksFromConfig({}, engine);
    expect(engine.processText("raw line")).toBe("raw line");
  });
});
