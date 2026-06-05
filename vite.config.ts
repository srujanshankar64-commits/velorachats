import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [react(), TanStackRouterVite()],
  ssr: {
    noExternal: ['@tanstack/router-plugin', '@tanstack/react-router']
  }
});
