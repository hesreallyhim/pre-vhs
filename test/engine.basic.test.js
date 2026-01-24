import { describe, it, expect } from "vitest";
import path from "node:path";
import { createEngine, formatType } from "../src/index.js";

describe("engine: basic behavior", () => {
  it("passes through non-meta lines unchanged", () => {
    const { processText } = createEngine();
    const input = `Output my-demo
Set FontSize 14
Type "echo hi"
Enter`;
    const output = processText(input);
    expect(output).toBe(input);
  });

  it("expands a simple Type directive with $1 and Enter", () => {
    const { processText } = createEngine();
    const input = ["> Type $1, Enter", "echo hi"].join("\n");

    const output = processText(input).split("\n");
    expect(output).toEqual([formatType("echo hi"), "Enter"]);
  });

  it("supports header aliases at top of file", () => {
    const { processText } = createEngine();
    const input = [
      "LocalTypeEnter = Type $1, Enter",
      "",
      "> LocalTypeEnter $1",
      "ls -la",
    ].join("\n");

    const output = processText(input).split("\n");
    expect(output).toEqual([formatType("ls -la"), "Enter"]);
  });

  it("supports multiple positional args $1, $2", () => {
    const { processText } = createEngine();
    const input = [
      '> Type "git commit -m \'$1\'", Enter, Type "# $2", Enter',
      "message",
      "note",
    ].join("\n");

    const lines = processText(input).split("\n");
    expect(lines).toEqual([
      formatType("git commit -m 'message'"),
      "Enter",
      formatType("# note"),
      "Enter",
    ]);
  });

  it("loads local packs from header Pack statements", () => {
    const { processText } = createEngine();
    const fixtureAbs = path.join(
      process.cwd(),
      "test",
      "fixtures",
      "pack.fixture.js",
    );
    const rel = path.relative(process.cwd(), fixtureAbs);
    const packPath = rel.startsWith(".") ? rel : `./${rel}`;

    const input = [
      `Pack ${packPath}`,
      "Use FixtureEcho",
      "",
      "> FixtureEcho $1",
      "hello",
    ].join("\n");

    const out = processText(input);
    expect(out).toBe(formatType("fixture hello"));
  });
});
