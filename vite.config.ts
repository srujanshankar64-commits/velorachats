import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "tanstack-start-manifest:v": path.resolve(__dirname, "./node_modules/@tanstack/start-server-core/dist/esm/router-manifest.js"),
        "#tanstack-start-entry": path.resolve(__dirname, "./node_modules/@tanstack/start-server-core/dist/esm/createStartHandler.js"),
        "#tanstack-router-entry": path.resolve(__dirname, "./node_modules/@tanstack/start-server-core/dist/esm/createStartHandler.js"),
      },
    },
  },
});