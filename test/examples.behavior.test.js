import { describe, it, expect } from "vitest";
import { createEngine, formatType } from "../src/index.js";
import builtinsPack from "../src/packs/builtins.js";

describe("examples-style behaviors", () => {
  it("expands a simple alias macro", () => {
    const { processText } = createEngine();
    const input = ["TypeEnter = Type $1, Enter", "> TypeEnter $1", "hi"].join(
      "\n",
    );

    const out = processText(input).split("\n");
    expect(out).toEqual([formatType("hi"), "Enter"]);
  });

  it("supports composite recursive macros", () => {
    const { processText } = createEngine();
    const input = [
      "TypeSleep = Type $1, Sleep 1s",
      "RunAndEcho = TypeSleep $1, Enter, Type $2",
      "> RunAndEcho $1 $2",
      "echo hi",
      "done",
    ].join("\n");

    const out = processText(input).split("\n");
    expect(out).toEqual([
      formatType("echo hi"),
      "Sleep 1s",
      "Enter",
      formatType("done"),
    ]);
  });

  it("applies a post-expand transform (adds Screenshot after each command)", () => {
    const engine = createEngine();
    builtinsPack(engine); // not strictly needed; included to mirror pack usage

    engine.registerTransform("postExpand", (line) => {
      // For the test, just append a Screenshot after every command.
      return [line, "Screenshot screenshot.png"];
    });

    const input = ["> Type $1, Enter", "echo hi"].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("echo hi"),
      "Screenshot screenshot.png",
      "Enter",
      "Screenshot screenshot.png",
    ]);
  });
});
