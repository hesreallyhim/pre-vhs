import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      exclude: [
        "**/test/**",
        "**/examples/**",
        "**/docs/**",
        "**/node_modules/**",
        "vitest.config.{js,ts}",
        "pre-vhs.config.{js,cjs,json}",
        "__INTERNAL__/**",
      ],
    },
  },
});
