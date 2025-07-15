// 只保留一组导入语句
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
      '/login': 'http://localhost:5000',
      '/register': 'http://localhost:5000',
      '/app': 'http://localhost:5000'
    }
  }
});