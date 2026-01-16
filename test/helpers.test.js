/**
 * Unit tests for helpers.js utility functions.
 */

import { describe, it, expect, vi } from "vitest";

// Import helpers directly to test them in isolation
const { maxArgIndex, reportHeaderIssue } = require("../src/helpers.js");

describe("maxArgIndex", () => {
  it("returns max 0 and hasStar false for empty array", () => {
    const result = maxArgIndex([]);
    expect(result).toEqual({ max: 0, hasStar: false });
  });

  it("returns max 0 for commands without $n placeholders", () => {
    const result = maxArgIndex(["Type hello", "Enter"]);
    expect(result).toEqual({ max: 0, hasStar: false });
  });

  it("finds the highest $n placeholder", () => {
    const result = maxArgIndex(["Type $1", "Cmd $2 $3"]);
    expect(result).toEqual({ max: 3, hasStar: false });
  });

  it("detects $* in commands", () => {
    const result = maxArgIndex(["Type $*"]);
    expect(result).toEqual({ max: 0, hasStar: true });
  });

  it("detects $* combined with $n placeholders", () => {
    const result = maxArgIndex(["Type $1", "Multi $*", "End $2"]);
    expect(result).toEqual({ max: 2, hasStar: true });
  });

  it("handles $* in the middle of command text", () => {
    const result = maxArgIndex(["prefix $* suffix"]);
    expect(result).toEqual({ max: 0, hasStar: true });
  });
});

describe("reportHeaderIssue", () => {
  it("does nothing when mode is off", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Should not throw and not warn
    expect(() =>
      reportHeaderIssue("off", 1, "test message", "test line"),
    ).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("throws when mode is error", () => {
    expect(() =>
      reportHeaderIssue("error", 5, "Bad syntax", "line content"),
    ).toThrow(/\[pre-vhs\] Header line 5: Bad syntax/);
  });

  it("warns when mode is warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    reportHeaderIssue("warn", 10, "Warning message", "some line");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[pre-vhs] Header line 10: Warning message"),
    );

    warnSpy.mockRestore();
  });
});
