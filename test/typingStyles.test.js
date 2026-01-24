import { describe, it, expect, vi } from "vitest";
import { createEngine, formatType, baseCommandName } from "../src/index.js";
import builtinsPack from "../src/packs/builtins.js";
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
      "> Apply TypingStyle human",
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
      "> Apply TypingStyle human low",
      "> Type $1",
      "hi",
      "> Apply TypingStyle human high",
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
      "> Apply TypingStyle human high fast",
      "> Type $1",
      "hi",
      "> Apply TypingStyle human slow 50ms",
      "> Type $1",
      "hi",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    const delays = out.map((line) => Number(line.match(/^Type@(\d+)ms/)?.[1]));

    expect(delays[0]).toBe(50);
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

    const input = ["> Apply TypingStyle sloppy", "> Type $1", "testing"].join(
      "\n",
    );

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
      "> Apply TypingStyle sloppy low fast",
      "> Type $1",
      "hi",
      "> Apply TypingStyle sloppy high 200ms",
      "> Type $1",
      "hi",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out).toEqual([
      'Type@60ms "h"',
      'Type@60ms "i"',
      'Type@200ms "h"',
      'Type@200ms "i"',
    ]);

    randSpy.mockRestore();
  });

  it("applies typing styles inside EachLine templates", () => {
    const engine = createEngine();
    builtinsPack(engine);
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: { defaultStyle: "default" },
    });

    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const input = [
      "Use EachLine",
      "> Apply TypingStyle human",
      "> EachLine Type $1",
      "hi",
      "ok",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out[0].startsWith("Type@")).toBe(true);
    expect(out[1].startsWith("Type@")).toBe(true);
    expect(out[2].startsWith("Type@")).toBe(true);
    expect(out[3].startsWith("Type@")).toBe(true);

    randSpy.mockRestore();
  });

  it("applies typing style to raw Type lines after Apply TypingStyle", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: { defaultStyle: "default" },
    });

    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const input = [
      "> Apply TypingStyle human",
      'Type "hello"',
      "> Apply TypingStyle None",
      'Type "bye"',
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out[0].startsWith("Type@")).toBe(true);
    expect(out[1].startsWith("Type@")).toBe(true);
    expect(out[out.length - 1]).toBe('Type "bye"');

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
      'Type@130ms " "',
      'Type@130ms " "',
      'Type@130ms " "',
      'Type@130ms "w"',
      'Type@130ms "o"',
      'Type@130ms "r"',
      'Type@130ms "d"',
    ]);

    randSpy.mockRestore();
  });

  it("Apply TypingStyle resets on None/Default and falls back on unknown styles", () => {
    const engine = createEngine();
    typingStylesPack({
      registerMacros: engine.registerMacros,
      registerTransform: engine.registerTransform,
      helpers: { formatType, baseCommandName },
      options: { defaultStyle: "default" },
    });

    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.9);

    const input = [
      "> Apply TypingStyle human",
      "> Type $1",
      "hi",
      "> Apply TypingStyle None",
      "> Type $1",
      "bye",
      "> Apply TypingStyle Default",
      "> Type $1",
      "done",
    ].join("\n");

    const out = engine.processText(input).split("\n");
    expect(out[0].startsWith("Type@")).toBe(true);
    expect(out[1].startsWith("Type@")).toBe(true);
    expect(out[2]).toBe(formatType("bye"));
    expect(out[3]).toBe(formatType("done"));

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
