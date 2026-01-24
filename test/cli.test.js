/**
 * Tests for the CLI module (src/cli.js).
 *
 * Tests argument parsing, help flag, and file modes.
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
        "-h",
        "input.tape.pre",
        "output.tape",
      ]);
      expect(result.help).toBe(true);
      expect(result.inputPath).toBe("input.tape.pre");
      expect(result.outputPath).toBe("output.tape");
    });
  });

  describe("edge cases", () => {
    it("handles empty argv beyond node and script", () => {
      const result = parseArgs(["node", "pre-vhs"]);
      expect(result.help).toBe(false);
      expect(result.inputPath).toBeUndefined();
      expect(result.outputPath).toBeUndefined();
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
        inputPath: undefined,
        outputPath: undefined,
        help: true,
      });
    }).toThrow("process.exit(0)");

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Usage:"));

    mockExit.mockRestore();
    mockLog.mockRestore();
  });

  it("processes stdin/stdout mode when no paths provided", () => {
    const inputContent = `> Type $1\nhi`;
    const originalReadFileSync = fs.readFileSync;
    const mockRead = vi
      .spyOn(fs, "readFileSync")
      .mockImplementation((pathOrFd, encoding) => {
        if (pathOrFd === 0) return inputContent;
        return originalReadFileSync(pathOrFd, encoding);
      });
    const mockWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    process.chdir(tmpDir);

    run({
      inputPath: undefined,
      outputPath: undefined,
      help: false,
    });

    expect(mockWrite).toHaveBeenCalledWith("Type `hi`");

    mockRead.mockRestore();
    mockWrite.mockRestore();
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

// ---------------------------------------------------------------------------
// main() function tests
// ---------------------------------------------------------------------------

describe("main", () => {
  const { main } = require("../src/cli.js");
  let tmpDir;
  let originalCwd;
  let originalArgv;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pre-vhs-main-test-"));
    originalCwd = process.cwd();
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.argv = originalArgv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("catches errors and exits with code 1", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

    process.chdir(tmpDir);
    process.argv = ["node", "pre-vhs", "nonexistent.tape.pre", "out.tape"];

    expect(() => main()).toThrow("process.exit(1)");
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining("[pre-vhs] Error:"),
    );

    mockExit.mockRestore();
    mockError.mockRestore();
  });

  it("processes files successfully via main()", () => {
    const inputContent = `> Type $1
echo test`;
    const inputPath = path.join(tmpDir, "main-test.tape.pre");
    const outputPath = path.join(tmpDir, "main-test.tape");

    fs.writeFileSync(inputPath, inputContent);

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {});

    process.chdir(tmpDir);
    process.argv = ["node", "pre-vhs", "main-test.tape.pre", "main-test.tape"];

    main();

    expect(fs.existsSync(outputPath)).toBe(true);
    const output = fs.readFileSync(outputPath, "utf8");
    expect(output).toContain("Type `echo test`");

    mockExit.mockRestore();
  });
});
