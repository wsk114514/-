import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/login': 'http://localhost:8000',
      '/register': 'http://localhost:8000',
      '/app': 'http://localhost:8000'
    }
  }
});