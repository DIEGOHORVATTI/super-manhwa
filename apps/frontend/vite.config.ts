import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend (Vite) + backend (Bun server on :8787) run together via `bun dev`.
// In dev, /api/* is proxied to the local Bun backend (server/dev.ts). In prod,
// the same handler runs as a Vercel function (api/[...path].ts). Same-origin
// either way, so no CORS issues.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-data': ['@orpc/client', '@orpc/openapi-client', '@orpc/react-query', '@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.API_TARGET ?? 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
