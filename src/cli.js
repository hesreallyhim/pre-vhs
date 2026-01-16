/**
 * CLI entry point for pre-vhs.
 *
 * Handles argument parsing and orchestrates file/stdin processing modes.
 */

const fs = require("fs");
const path = require("path");

const { createEngine } = require("./engine");
const { loadConfig, initPacksFromConfig } = require("./config");

// ---------------------------------------------------------------------------
// Usage text
// ---------------------------------------------------------------------------

const USAGE = `Usage: pre-vhs [options] <input> <output>
       pre-vhs [options] <basename>
       cat file | pre-vhs [options]

Options:
  -c, --config <path>  Path to config file
  -h, --help           Show this help message

Examples:
  pre-vhs input.tape.pre output.tape
  pre-vhs demo                         # reads demo.tape.pre → writes demo.tape
  cat file.tape.pre | pre-vhs > out.tape
`;

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

/**
 * Parse command-line arguments.
 *
 * @param {string[]} argv - Process argv array
 * @returns {{ configPath?: string, inputPath?: string, outputPath?: string, help: boolean }}
 */
function parseArgs(argv) {
  const args = {
    configPath: undefined,
    inputPath: undefined,
    outputPath: undefined,
    help: false,
  };

  const raw = argv.slice(2);
  const positional = [];

  let i = 0;
  while (i < raw.length) {
    const tok = raw[i];

    if (tok === "--help" || tok === "-h") {
      args.help = true;
      i += 1;
    } else if (tok === "--config" || tok === "-c") {
      args.configPath = raw[i + 1];
      i += 2;
    } else {
      positional.push(tok);
      i += 1;
    }
  }

  resolvePositionalArgs(args, positional);
  return args;
}

function resolvePositionalArgs(args, positional) {
  if (positional.length === 2) {
    // Explicit mode: input output
    args.inputPath = positional[0];
    args.outputPath = positional[1];
  } else if (positional.length === 1) {
    // Basename convenience mode
    const base = positional[0];
    args.inputPath = `${base}.tape.pre`;
    args.outputPath = `${base}.tape`;
  } else if (positional.length > 2) {
    console.error(`Error: Too many arguments\n\n${USAGE}`);
    process.exit(1);
  }
  // else: stdin/stdout mode (both undefined)
}

// ---------------------------------------------------------------------------
// Main execution
// ---------------------------------------------------------------------------

/**
 * Run the CLI with the given arguments.
 *
 * @param {{ configPath?: string, inputPath?: string, outputPath?: string, help: boolean }} args
 */
function run(args) {
  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const { config, configDir } = loadConfig(args.configPath);
  const engine = createEngine();
  initPacksFromConfig(config, engine, configDir);

  if (args.inputPath && args.outputPath) {
    processFileMode(engine, args.inputPath, args.outputPath);
  } else {
    processStdinMode(engine);
  }
}

function processFileMode(engine, inputPath, outputPath) {
  const cwd = process.cwd();
  const resolvedInput = path.resolve(cwd, inputPath);
  const resolvedOutput = path.resolve(cwd, outputPath);

  if (!fs.existsSync(resolvedInput)) {
    console.error(`Input file not found: ${resolvedInput}`);
    process.exit(1);
  }

  const input = fs.readFileSync(resolvedInput, "utf8");
  const output = engine.processText(input);
  fs.writeFileSync(resolvedOutput, output, "utf8");
}

function processStdinMode(engine) {
  const input = fs.readFileSync(0, "utf8");
  const output = engine.processText(input);
  process.stdout.write(output);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

/**
 * Main CLI entry point.
 */
function main() {
  try {
    const args = parseArgs(process.argv);
    run(args);
  } catch (err) {
    console.error(`[pre-vhs] Error: ${err && err.message ? err.message : err}`);
    process.exit(1);
  }
}

module.exports = {
  USAGE,
  parseArgs,
  run,
  main,
};
