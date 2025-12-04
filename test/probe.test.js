import { describe, it, expect, vi, afterEach } from "vitest";
import { createEngine, formatType, baseCommandName } from "../src/index.js";
import probePack from "../src/packs/probe.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("probe pack", () => {
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
});
