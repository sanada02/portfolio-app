import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Tauri expects a fixed port in development
  server: {
    port: 5173,
    strictPort: true,
  },

  // Tauri uses Chromium on Windows/Linux and Safari on macOS
  // No need to support very old browsers
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    sourcemap: true,
  },

  // Prevent vite from obscuring rust errors
  clearScreen: false,
})
