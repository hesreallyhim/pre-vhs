import { describe, it, expect, vi } from "vitest";
import { createEngine } from "../src/index.js";

describe("VHS command collision", () => {
  it("warns when user macro shadows a VHS command", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { processText } = createEngine();

    // Define a macro that shadows VHS "Sleep" command
    processText("Sleep = Type sleeping\n\n> Sleep\n");

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toMatch(/Collision.*Sleep.*VHS command/);
    warnSpy.mockRestore();
  });

  it("does not warn for non-VHS macro names", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { processText } = createEngine();

    // MyCustomMacro is not a VHS command
    processText("MyCustomMacro = Type hello\n\n> MyCustomMacro\n");

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("header validation", () => {
  it("is off by default (no warnings)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { processText } = createEngine();

    // Alias followed immediately by directive - no blank line
    processText("Foo = Type $1\n> Foo\nhello");

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("warns on directive after header content when enabled", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { processText } = createEngine({ headerValidation: "warn" });

    processText("Foo = Type $1\n> Foo\nhello");

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toMatch(/Directive syntax/);
    warnSpy.mockRestore();
  });

  it("throws on directive after header content in error mode", () => {
    const { processText } = createEngine({ headerValidation: "error" });

    expect(() => processText("Foo = Type $1\n> Foo\nhello")).toThrow(
      /Directive syntax/,
    );
  });

  it("warns on empty Use statement", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { processText } = createEngine({ headerValidation: "warn" });

    processText("Use\n\n> Type $1\nhello");

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toMatch(/requires at least one macro/);
    warnSpy.mockRestore();
  });

  it("warns on malformed alias with = but invalid syntax", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { processText } = createEngine({ headerValidation: "warn" });

    // "123 = Foo" doesn't match alias pattern (name must start with letter/underscore)
    processText("123 = Foo\n\n> Type $1\nhello");

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toMatch(/Malformed alias/);
    warnSpy.mockRestore();
  });

  it("warns on alias with empty body", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { processText } = createEngine({ headerValidation: "warn" });

    // "Foo = " with nothing after the equals sign
    processText("Foo = \n\n> Type $1\nhello");

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toMatch(/empty body/i);
    warnSpy.mockRestore();
  });

  it("throws on alias with empty body in error mode", () => {
    const { processText } = createEngine({ headerValidation: "error" });

    expect(() => processText("Foo = \n\n> Type $1\nhello")).toThrow(/empty body/i);
  });
});
