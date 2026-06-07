import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "cloudflare-pages",
    cloudflare: {
      nodeCompat: true,
    },
  },
  tanstackStart: {
    client: { entry: "client" },
    server: { entry: "server" },
  },
});