import { describe, it, expect, vi, afterEach } from "vitest";
import { createEngine, formatType, baseCommandName } from "../src/index.js";
import probePack from "../src/packs/probe.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("probe pack", () => {
  it("uses default spawnSync when no options are provided", () => {
    const engine = createEngine();
    probePack({
      registerMacros: (macros) =>
        engine.registerMacros(macros, { requireUse: false }),
      helpers: { formatType, baseCommandName },
    });

    const input = [
      "Use Probe IfProbeMatched",
      "> Probe /ready/ $1",
      "node -e \"process.stdout.write('ready')\"",
      "> IfProbeMatched",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([formatType("")]);
  });

  it("emits Type when pattern matches", () => {
    const spawnSpy = vi.fn().mockReturnValue({
      stdout: "service ready",
      stderr: "",
      status: 0,
    });

    const engine = createEngine();
    probePack({
      registerMacros: (macros) =>
        engine.registerMacros(macros, { requireUse: false }),
      helpers: { formatType, baseCommandName },
      options: { defaultTimeoutMs: 500, spawnSync: spawnSpy },
    });

    const input = [
      "Use Probe IfProbeMatched IfProbeNotMatched",
      "> Probe /ready/ $1",
      "echo status",
      "> IfProbeMatched $1",
      "it is ready",
      "> IfProbeNotMatched $1",
      "not ready",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(spawnSpy).toHaveBeenCalled();
    expect(out).toEqual([formatType("it is ready")]);
  });

  it("treats invalid patterns as no pattern and falls back on exit code", () => {
    const spawnSpy = vi.fn().mockReturnValue({
      stdout: "",
      stderr: "",
      status: "ok",
    });

    const engine = createEngine();
    probePack({
      registerMacros: (macros) =>
        engine.registerMacros(macros, { requireUse: false }),
      helpers: { formatType, baseCommandName },
      options: { defaultTimeoutMs: 500, spawnSync: spawnSpy },
    });

    const input = [
      "Use Probe IfProbeMatched IfProbeNotMatched",
      "> Probe /(/ $1",
      "echo test",
      "> IfProbeMatched $1",
      "should not show",
      "> IfProbeNotMatched $1",
      "fallback",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([formatType("fallback")]);
  });

  it("does not emit match when exit code is non-zero and no pattern provided", () => {
    const spawnSpy = vi.fn().mockReturnValue({
      stdout: "",
      stderr: "",
      status: 1,
    });

    const engine = createEngine();
    probePack({
      registerMacros: (macros) =>
        engine.registerMacros(macros, { requireUse: false }),
      helpers: { formatType, baseCommandName },
      options: { defaultTimeoutMs: 500, spawnSync: spawnSpy },
    });

    const input = [
      "Use Probe IfProbeMatched IfProbeNotMatched",
      "> Probe $1",
      "false",
      "> IfProbeMatched $1",
      "should not show",
      "> IfProbeNotMatched $1",
      "fallback",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(spawnSpy).toHaveBeenCalled();
    expect(out).toEqual([formatType("fallback")]);
  });

  it("records errors from spawnSync results", () => {
    const spawnSpy = vi.fn().mockReturnValue({
      stdout: "",
      stderr: "",
      status: 0,
      error: new Error("boom"),
    });

    const engine = createEngine();
    probePack({
      registerMacros: (macros) =>
        engine.registerMacros(macros, { requireUse: false }),
      helpers: { formatType, baseCommandName },
      options: { defaultTimeoutMs: 500, spawnSync: spawnSpy },
    });

    const input = [
      "Use Probe IfProbeMatched",
      "> Probe /boom/ $1",
      "echo ok",
      "> IfProbeMatched $1",
      "error matched",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([formatType("error matched")]);
  });

  it("handles spawnSync exceptions and empty Probe payloads", () => {
    const spawnSpy = vi.fn(() => {
      throw new Error("probe failed");
    });

    const engine = createEngine();
    probePack({
      registerMacros: (macros) =>
        engine.registerMacros(macros, { requireUse: false }),
      helpers: { formatType, baseCommandName },
      options: { spawnSync: spawnSpy },
    });

    const input = [
      "Use Probe IfProbeMatched IfProbeNotMatched",
      "> Probe /probe/ $1",
      "echo ok",
      "> IfProbeMatched $1",
      "matched error",
      "> Probe",
      "> IfProbeNotMatched",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([formatType("matched error"), formatType("")]);
  });

  it("handles falsy errors thrown by spawnSync", () => {
    const spawnSpy = vi.fn(() => {
      throw null;
    });

    const engine = createEngine();
    probePack({
      registerMacros: (macros) =>
        engine.registerMacros(macros, { requireUse: false }),
      helpers: { formatType, baseCommandName },
      options: { spawnSync: spawnSpy },
    });

    const input = [
      "Use Probe IfProbeNotMatched",
      "> Probe $1",
      "echo ok",
      "> IfProbeNotMatched $1",
      "fallback",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([formatType("fallback")]);
  });
});
