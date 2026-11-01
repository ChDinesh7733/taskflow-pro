import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../taskflow-api/src/main/resources/static',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      // Proxy /api calls to the Spring Boot backend
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket connections to Spring Boot
      '/ws': {
        target: 'http://localhost:8081',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
