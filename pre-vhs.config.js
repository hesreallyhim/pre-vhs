/**
 * pre-vhs configuration file.
 *
 * Packs are optional modules that register macros and/or
 * header transforms with the engine. They do not become active
 * until imported explicitly in the .tape.pre file using:
 *
 *     Use MacroName
 *
 * or
 *
 *     Use MacroA MacroB MacroC
 *
 * This file controls which packs are *available*, not which
 * are automatically enabled.
 */

module.exports = {
  /**
   * List of pack modules to load at startup.
   *
   * Each item may be either:
   *   - a string:   "./packs/typingStyles.js"
   *   - an object:  { module: "./packs/typingStyles.js", enabled: true, options: { ... } }
   *
   * Packs should export a single function:
   *
   *     module.exports = function setup(engine) { ... }
   *
   * where `engine` is:
   *     {
   *       registerMacros(fnMap),
   *       registerHeaderTransform(fn),
   *       helpers: { formatType, baseCommandName },
   *       options: userSuppliedPackOptions
   *     }
   *
   * Packs add macros to the META registry. Users then activate
   * these macros manually in .tape.pre via:
   *
   *     Use <MacroName>
   *
   * (The engine does not auto-activate pack macros.)
   */
  packs: [
    // Example pack: typing styles (human, sloppy, etc.)
    {
      module: "./src/packs/typingStyles.js",
      enabled: true,
      options: {
        defaultStyle: "human"
      }
    },

    // Example pack: basic git convenience macros
    // {
    //   module: "./src/packs/gitBasics.js",
    //   enabled: true
    // },

    // Example pack: emoji shortcuts
    {
      module: "./src/packs/emojiShortcuts.js",
      enabled: true
    },

    // Additional packs may be listed here.
  ]
};
