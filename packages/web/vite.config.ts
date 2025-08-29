import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@ultibiker/core': resolve(__dirname, '../core/src'),
      '@ultibiker/shared': resolve(__dirname, '../shared/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});