import { describe, it, expect, vi } from "vitest";
import {
  processText,
  registerMacros,
  registerHeaderTransform,
  formatType,
  baseCommandName,
} from "../src/index.js";
import typingStylesPack from "../src/packs/typingStyles.js";

typingStylesPack({
  registerMacros,
  registerHeaderTransform,
  helpers: { formatType, baseCommandName },
  options: { defaultStyle: "default" },
});

describe("typingStyles pack", () => {
  it("human style splits into Type@... chunks", () => {
    // deterministic random
    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const input = [
      "> SetTypingStyle human",
      "> Type $1",
      "hello world",
    ].join("\n");

    const out = processText(input).split("\n");

    // each chunk is either "hello", " ", "world"
    // We only assert pattern, not exact delays.
    expect(out.length).toBeGreaterThan(1);
    for (const line of out) {
      expect(line.startsWith("Type@")).toBe(true);
      expect(line.includes('"')).toBe(true);
    }

    randSpy.mockRestore();
  });

  it("sloppy style produces at least one Backspace when randomness is fixed", () => {
    // Force random < 0.4 to trigger mistakes
    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.1);

    const input = [
      "> SetTypingStyle sloppy",
      "> Type $1",
      "testing",
    ].join("\n");

    const out = processText(input).split("\n");
    expect(out).toContain("Backspace 1");

    randSpy.mockRestore();
  });
});
