import { describe, it, expect, vi } from "vitest";
import { createEngine, formatType, baseCommandName } from "../src/index.js";
import typingStylesPack from "../src/packs/typingStyles.js";

describe("typingStyles pack", () => {
  it("defaults to standard Type behavior without options", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
    });

    const input = ["> Type $1", "plain"].join("\n");

    expect(engine.processText(input)).toBe(formatType("plain"));
  });

  it("human style emits per-letter Type@... commands", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: { defaultStyle: "default" },
    });

    // deterministic random
    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const input = [
      "Use SetTypingStyle",
      "> SetTypingStyle human",
      "> Type $1",
      "hello world",
    ].join("\n");

    const out = engine.processText(input).split("\n");

    // One Type per character (including spaces).
    expect(out.length).toBe("hello world".length);
    for (const line of out) {
      expect(line.startsWith("Type@")).toBe(true);
      expect(line.includes('"')).toBe(true);
    }

    randSpy.mockRestore();
  });

  it("human style supports low/medium/high levels", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: {
        defaultStyle: "default",
        human: "high",
      },
    });

    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const input = [
      "Use SetTypingStyle",
      "> SetTypingStyle human low",
      "> Type $1",
      "hi",
      "> SetTypingStyle human high",
      "> Type $1",
      "hi",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    const delays = out.map((line) => Number(line.match(/^Type@(\d+)ms/)?.[1]));
    expect(delays.length).toBe(4);
    expect(delays[0]).toBe(60);
    expect(delays[2]).toBe(60);
    expect(delays[3]).toBeGreaterThan(delays[1]);

    randSpy.mockRestore();
  });

  it("human style supports speed presets and ms baselines", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: {
        defaultStyle: "default",
      },
    });

    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const input = [
      "Use SetTypingStyle",
      "> SetTypingStyle human high fast",
      "> Type $1",
      "hi",
      "> SetTypingStyle human slow 50ms",
      "> Type $1",
      "hi",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    const delays = out.map((line) => Number(line.match(/^Type@(\d+)ms/)?.[1]));

    expect(delays[0]).toBe(35);
    expect(delays[2]).toBe(50);

    randSpy.mockRestore();
  });

  it("HumanType handles empty payloads", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: { defaultStyle: "default" },
    });

    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const out = engine.processText("> HumanType").split("\n");
    expect(out).toEqual(['Type@60ms ""']);

    randSpy.mockRestore();
  });

  it("sloppy style produces at least one Backspace when randomness is fixed", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: { defaultStyle: "default" },
    });

    // Force random < 0.4 to trigger mistakes
    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.1);

    const input = [
      "Use SetTypingStyle",
      "> SetTypingStyle sloppy",
      "> Type $1",
      "testing",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toContain("Backspace 1");

    randSpy.mockRestore();
  });

  it("sloppy style supports level and speed presets", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: { defaultStyle: "default" },
    });

    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const input = [
      "Use SetTypingStyle",
      "> SetTypingStyle sloppy low fast",
      "> Type $1",
      "hi",
      "> SetTypingStyle sloppy high 200ms",
      "> Type $1",
      "hi",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual(['Type@60ms "hi"', 'Type@200ms "hi"']);

    randSpy.mockRestore();
  });

  it("SloppyType emits whitespace and clean chunks without mistakes", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: { defaultStyle: "default" },
    });

    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.9);

    const input = [
      "> SloppyType",
      "> SloppyType $1",
      "   ",
      "> SloppyType $1",
      "word",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      'Type@130ms ""',
      'Type@130ms "   "',
      'Type@130ms "word"',
    ]);

    randSpy.mockRestore();
  });

  it("SetTypingStyle uses payload, trims, and falls back on unknown styles", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: { defaultStyle: "default" },
    });

    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.9);

    const input = [
      "Use SetTypingStyle",
      "> SetTypingStyle, Type $2",
      "  sloppy  ",
      "word",
      "> Type $1",
      "after",
      "> SetTypingStyle $1",
      "unknown",
      "> Type $1",
      "bye",
      "> SetTypingStyle, Type $2",
      "",
      "ok",
      "> Type $1",
      "done",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      formatType("word"),
      'Type@130ms "after"',
      formatType("bye"),
      formatType("ok"),
      formatType("done"),
    ]);

    randSpy.mockRestore();
  });

  it("leaves non-Type header tokens unchanged for unknown default styles", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: { defaultStyle: "weird" },
    });

    const input = ["> Type $1, Sleep 1s", "hi"].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([formatType("hi"), "Sleep 1s"]);
  });
});
