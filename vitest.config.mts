import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.{js,jsx,ts,tsx}"],
    // Unit tests run in Node; component tests opt into a browser-like DOM with
    // a "// @vitest-environment jsdom" comment at the top of the file.
    environment: "node",
    setupFiles: ["tests/setup.js"],
  },
});
