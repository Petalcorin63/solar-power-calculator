/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    // In dev the API runs separately (`pnpm dev:server`); in production the
    // Node server serves both the API and the built frontend from one origin.
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
  test: {
    // The server tests hash passwords with scrypt (~0.5 s and 128 MB each). Run in
    // parallel, they can starve otherwise-quick tests past Vitest's 5 s default.
    testTimeout: 30_000,
  },
})
