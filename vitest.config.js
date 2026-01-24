import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      all: true,
      exclude: [
        "**/test/**",
        "**/examples/**",
        "**/docs/**",
        ".claude/**",
        "**/node_modules/**",
        "src/index.js",
        "vitest.config.{js,ts}",
        "pre-vhs.config.{js,cjs,json}",
      ],
    },
  },
});
