import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
