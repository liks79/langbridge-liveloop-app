import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Local dev: proxy Worker API (wrangler dev default: http://127.0.0.1:8787)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
    ...(process.env.ALLOWED_HOSTS
      ? {
          allowedHosts: process.env.ALLOWED_HOSTS.split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }
      : {}),
    hmr: {
      protocol: 'ws',
      ...(process.env.HMR_HOST ? { host: process.env.HMR_HOST } : {}),
      clientPort: 5173,
    },
  }
})
