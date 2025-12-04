import { describe, it, expect } from "vitest";
import {
  processText,
  registerMacros,
  registerHeaderTransform,
  formatType,
  baseCommandName,
} from "../src/index.js";

describe("engine: basic behavior", () => {
  it("passes through non-meta lines unchanged", () => {
    const input = `Output my-demo
Set FontSize 14
Type "echo hi"
Enter`;
    const output = processText(input);
    expect(output).toBe(input);
  });

  it("expands a simple Type directive with $1 and Enter", () => {
    const input = [
      "> Type $1, Enter",
      "echo hi",
    ].join("\n");

    const output = processText(input).split("\n");
    expect(output).toEqual([
      'Type "echo hi"',
      "Enter",
    ]);
  });

  it("supports header aliases at top of file", () => {
    const input = [
      "TypeEnter = Type $1, Enter",
      "",
      "> TypeEnter $1",
      "ls -la",
    ].join("\n");

    const output = processText(input).split("\n");
    expect(output).toEqual([
      'Type "ls -la"',
      "Enter",
    ]);
  });

  it("supports multiple positional args $1, $2", () => {
    const input = [
      "> Type \"git commit -m '$1'\", Enter, Type \"# $2\", Enter",
      "message",
      "note",
    ].join("\n");

    const lines = processText(input).split("\n");
    expect(lines).toEqual([
      'Type "git commit -m \'message\'"',
      "Enter",
      'Type "# note"',
      "Enter",
    ]);
  });
});
