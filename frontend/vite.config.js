import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 환경 변수 로드
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: env.VITE_BACKEND_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/oauth2': {
        target: env.VITE_BACKEND_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: env.VITE_BACKEND_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          utils: ['axios']
        }
      }
    }
  }
  }
})
