import preact from "@preact/preset-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { assertSilOpenFontLicenses } from "./src/font-license.ts";

const root = path.dirname(fileURLToPath(import.meta.url));

function fontLicensePlugin() {
  return {
    name: "sil-open-font-license",
    buildStart() {
      assertSilOpenFontLicenses(path.join(root, "fonts"));
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE ?? "./",
  plugins: [preact(), fontLicensePlugin()],
  server: {
    fs: {
      allow: [path.resolve(root, "../..")],
    },
  },
  build: {
    target: "safari16",
    commonjsOptions: {
      include: [/amortize\.js/, /node_modules/],
    },
  },
  test: {
    include: ["unit/**/*.ts"],
  },
});
