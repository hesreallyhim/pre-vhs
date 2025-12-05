import { describe, it, expect, vi } from "vitest";
import { createEngine } from "../src/index.js";

describe("engine: macro collision warnings", () => {
  it("warns on duplicate macro registration by default", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const engine = createEngine();

    engine.registerMacros({ Foo: () => ["A"] }, { requireUse: false });
    engine.registerMacros({ Foo: () => ["B"] }, { requireUse: false });

    expect(warnSpy).toHaveBeenCalled();
    const message = warnSpy.mock.calls[0][0];
    expect(message).toContain("Duplicate macro registration");
    expect(message).toContain("Foo");
    warnSpy.mockRestore();
  });

  it("can silence collision warnings", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const engine = createEngine({ warnOnMacroCollision: false });

    engine.registerMacros({ Foo: () => ["A"] }, { requireUse: false });
    engine.registerMacros({ Foo: () => ["B"] }, { requireUse: false });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
