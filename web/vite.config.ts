import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8787' } },
  // `vite build --mode demo` makes a self-contained preview that runs without a server (see src/demo.ts).
  base: mode === 'demo' ? './' : '/',
  build: mode === 'demo'
    ? { outDir: 'dist-demo', assetsInlineLimit: 100_000_000, rollupOptions: { output: { inlineDynamicImports: true } } }
    : { outDir: 'dist', sourcemap: true },
}));
