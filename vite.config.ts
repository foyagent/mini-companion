import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/ws': {
        target: 'ws://localhost:18789',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
