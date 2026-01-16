const prettier = require("eslint-config-prettier");

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: [
      "node_modules/**",
      "package-lock.json",
      "coverage/**",
      "examples/**",
      "docs/**",
      "dist/**",
      "CLAUDE.md",
      ".claude/**",
      "LICENSE",
      "AGENTS.md",
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
  {
    name: "prettier-overrides",
    rules: prettier.rules,
  },
];
