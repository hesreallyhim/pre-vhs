#!/usr/bin/env node

/**
 * pre-vhs: A lightweight macro engine and DSL for writing VHS tapes.
 *
 * This is the main entry point that:
 * - Re-exports the public API for library usage
 * - Runs the CLI when invoked directly
 *
 * Module structure:
 * - constants.js  - VHS command set for collision detection
 * - helpers.js    - Core utility functions
 * - parser.js     - File header parsing
 * - engine.js     - Engine factory and processing logic
 * - cli.js        - Command-line interface
 */

const { createEngine } = require("./engine");
const { formatType, baseCommandName } = require("./helpers");
const { main } = require("./cli");

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  main();
}

// ---------------------------------------------------------------------------
// Library exports
// ---------------------------------------------------------------------------

module.exports = {
  createEngine,
  processText(input, options = {}) {
    const engine = createEngine(options.engineOptions);
    return engine.processText(input);
  },
  formatType,
  baseCommandName,
};
