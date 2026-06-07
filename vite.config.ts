// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "url";
import path from "path";

// ESM-safe __dirname equivalent
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // Use path.resolve (direct file path) instead of require.resolve()
        // require.resolve() fails with ERR_PACKAGE_PATH_NOT_EXPORTED because these
        // subpaths are not in the package's exports field. path.resolve bypasses that.
        "tanstack-start-manifest:v": path.resolve(__dirname, "./node_modules/@tanstack/start-server-core/dist/esm/router-manifest.js"),
        "#tanstack-start-entry": path.resolve(__dirname, "./node_modules/@tanstack/start-server-core/dist/esm/createStartHandler.js"),
        "#tanstack-router-entry": path.resolve(__dirname, "./node_modules/@tanstack/start-server-core/dist/esm/createStartHandler.js"),
      },
    },
  },
});