import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxy = { '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:4000', changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy, port: 4173 },
  build: {
    sourcemap: process.env.VITE_SOURCEMAP === '1',
    rollupOptions: { output: { manualChunks: { monaco: ['monaco-editor', '@monaco-editor/react'] } } }
  }
});
