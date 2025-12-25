import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
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
