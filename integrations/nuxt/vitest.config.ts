import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The runtime reaches shared constants through the package's own `./constant`
    // export; alias it to source so tests never depend on a built `.dist`.
    alias: {
      "@icon-sheets/nuxt/constant": fileURLToPath(
        new URL("./src/constant.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: ".coverage",
      include: ["src/**/*.ts"],
    },
  },
});
