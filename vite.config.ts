import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "cloudflare-pages",
    output: {
      dir: "dist",
      publicDir: "dist",
      serverDir: "dist/_worker.js",
    },
    cloudflare: {
      nodeCompat: true,
      deployConfig: true,
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});