import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://solid-fiesta-q7x59r5gvjp6hwgw-80.app.github.dev',
        changeOrigin: true,
      },
      '/data': {
        target: 'https://solid-fiesta-q7x59r5gvjp6hwgw-80.app.github.dev',
        changeOrigin: true,
      },
    },
  },
})