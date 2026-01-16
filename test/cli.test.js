/**
 * Tests for the CLI module (src/cli.js).
 *
 * Tests argument parsing, help flag, config path handling, and file modes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";

import { USAGE, parseArgs, run } from "../src/cli.js";

// ---------------------------------------------------------------------------
// parseArgs tests
// ---------------------------------------------------------------------------

describe("parseArgs", () => {
  describe("help flag", () => {
    it("parses --help flag", () => {
      const result = parseArgs(["node", "pre-vhs", "--help"]);
      expect(result.help).toBe(true);
    });

    it("parses -h flag", () => {
      const result = parseArgs(["node", "pre-vhs", "-h"]);
      expect(result.help).toBe(true);
    });

    it("parses help with other args", () => {
      const result = parseArgs(["node", "pre-vhs", "-h", "input.tape.pre"]);
      expect(result.help).toBe(true);
      // input.tape.pre is treated as basename, so gets .tape.pre appended
      expect(result.inputPath).toBe("input.tape.pre.tape.pre");
    });
  });

  describe("config flag", () => {
    it("parses --config flag", () => {
      const result = parseArgs([
        "node",
        "pre-vhs",
        "--config",
        "custom.config.js",
      ]);
      expect(result.configPath).toBe("custom.config.js");
    });

    it("parses -c flag", () => {
      const result = parseArgs(["node", "pre-vhs", "-c", "my-config.js"]);
      expect(result.configPath).toBe("my-config.js");
    });

    it("parses config with input/output", () => {
      const result = parseArgs([
        "node",
        "pre-vhs",
        "-c",
        "cfg.js",
        "in.tape.pre",
        "out.tape",
      ]);
      expect(result.configPath).toBe("cfg.js");
      expect(result.inputPath).toBe("in.tape.pre");
      expect(result.outputPath).toBe("out.tape");
    });
  });

  describe("positional arguments", () => {
    it("parses explicit input/output mode (2 args)", () => {
      const result = parseArgs([
        "node",
        "pre-vhs",
        "input.tape.pre",
        "output.tape",
      ]);
      expect(result.inputPath).toBe("input.tape.pre");
      expect(result.outputPath).toBe("output.tape");
    });

    it("parses basename mode (1 arg)", () => {
      const result = parseArgs(["node", "pre-vhs", "demo"]);
      expect(result.inputPath).toBe("demo.tape.pre");
      expect(result.outputPath).toBe("demo.tape");
    });

    it("returns undefined paths for stdin/stdout mode (0 args)", () => {
      const result = parseArgs(["node", "pre-vhs"]);
      expect(result.inputPath).toBeUndefined();
      expect(result.outputPath).toBeUndefined();
    });

    it("handles paths with directories", () => {
      const result = parseArgs([
        "node",
        "pre-vhs",
        "examples/demo.tape.pre",
        "output/demo.tape",
      ]);
      expect(result.inputPath).toBe("examples/demo.tape.pre");
      expect(result.outputPath).toBe("output/demo.tape");
    });
  });

  describe("combined flags", () => {
    it("parses all flags together", () => {
      const result = parseArgs([
        "node",
        "pre-vhs",
        "-c",
        "config.js",
        "-h",
        "input.tape.pre",
        "output.tape",
      ]);
      expect(result.configPath).toBe("config.js");
      expect(result.help).toBe(true);
      expect(result.inputPath).toBe("input.tape.pre");
      expect(result.outputPath).toBe("output.tape");
    });

    it("handles flags in different order", () => {
      const result = parseArgs([
        "node",
        "pre-vhs",
        "input.tape.pre",
        "-c",
        "cfg.js",
        "output.tape",
      ]);
      expect(result.configPath).toBe("cfg.js");
      expect(result.inputPath).toBe("input.tape.pre");
      expect(result.outputPath).toBe("output.tape");
    });
  });

  describe("edge cases", () => {
    it("handles empty argv beyond node and script", () => {
      const result = parseArgs(["node", "pre-vhs"]);
      expect(result.help).toBe(false);
      expect(result.configPath).toBeUndefined();
      expect(result.inputPath).toBeUndefined();
      expect(result.outputPath).toBeUndefined();
    });

    it("handles config flag without value", () => {
      const result = parseArgs(["node", "pre-vhs", "-c"]);
      expect(result.configPath).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// USAGE constant tests
// ---------------------------------------------------------------------------

describe("USAGE", () => {
  it("contains usage information", () => {
    expect(USAGE).toContain("Usage:");
    expect(USAGE).toContain("pre-vhs");
  });

  it("documents the config flag", () => {
    expect(USAGE).toContain("-c, --config");
  });

  it("documents the help flag", () => {
    expect(USAGE).toContain("-h, --help");
  });

  it("shows examples", () => {
    expect(USAGE).toContain("Examples:");
    expect(USAGE).toContain(".tape.pre");
  });
});

// ---------------------------------------------------------------------------
// CLI execution tests (integration)
// ---------------------------------------------------------------------------

describe("CLI execution", () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pre-vhs-cli-test-"));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("processes file in explicit mode via CLI", () => {
    const inputContent = `> Type $1
echo hello`;
    const inputPath = path.join(tmpDir, "test.tape.pre");
    const outputPath = path.join(tmpDir, "test.tape");

    fs.writeFileSync(inputPath, inputContent);

    // Mock process.exit to prevent test from exiting
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    process.chdir(tmpDir);

    run({
      configPath: undefined,
      inputPath: "test.tape.pre",
      outputPath: "test.tape",
      help: false,
    });

    expect(fs.existsSync(outputPath)).toBe(true);
    const output = fs.readFileSync(outputPath, "utf8");
    expect(output).toContain("Type `echo hello`");

    mockExit.mockRestore();
  });

  it("processes file in basename mode via CLI", () => {
    const inputContent = `> Type $1
ls -la`;
    const inputPath = path.join(tmpDir, "demo.tape.pre");
    const outputPath = path.join(tmpDir, "demo.tape");

    fs.writeFileSync(inputPath, inputContent);

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    process.chdir(tmpDir);

    // Basename mode args
    run({
      configPath: undefined,
      inputPath: "demo.tape.pre",
      outputPath: "demo.tape",
      help: false,
    });

    expect(fs.existsSync(outputPath)).toBe(true);
    const output = fs.readFileSync(outputPath, "utf8");
    expect(output).toContain("Type `ls -la`");

    mockExit.mockRestore();
  });

  it("exits with error for missing input file", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

    process.chdir(tmpDir);

    expect(() => {
      run({
        configPath: undefined,
        inputPath: "nonexistent.tape.pre",
        outputPath: "output.tape",
        help: false,
      });
    }).toThrow("process.exit(1)");

    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining("Input file not found"),
    );

    mockExit.mockRestore();
    mockError.mockRestore();
  });

  it("displays help and exits when help flag is set", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});

    expect(() => {
      run({
        configPath: undefined,
        inputPath: undefined,
        outputPath: undefined,
        help: true,
      });
    }).toThrow("process.exit(0)");

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Usage:"));

    mockExit.mockRestore();
    mockLog.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Too many arguments test (requires mocking process.exit)
// ---------------------------------------------------------------------------

describe("parseArgs error handling", () => {
  it("exits with error for too many positional arguments", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      parseArgs(["node", "pre-vhs", "a", "b", "c"]);
    }).toThrow("process.exit(1)");

    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining("Too many arguments"),
    );

    mockExit.mockRestore();
    mockError.mockRestore();
  });
});
