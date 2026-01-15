// eslint flat config (CommonJS)
const prettier = require("eslint-config-prettier");

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "examples/**",
      "docs/**",
      "dist/**",
    ],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
      "no-console": "off",
    },
  },
  // prettier as a flat config: minimal form to disable formatting rules
  {
    name: "prettier-overrides",
    rules: prettier.rules,
  },
];
