import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets load cleanly on GitHub Pages subpaths like /el-patio-carta/
  server: {
    port: 5174,
    host: true
  }
});
