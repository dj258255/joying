import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 환경변수 로드
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_TARGET || 'http://localhost:8080'

  // WebSocket URL 생성 (http:// → ws://, https:// → wss://)
  const wsTarget = backendTarget
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')

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
      // 로컬 개발 시 백엔드 API 프록시 설정
      // .env의 VITE_BACKEND_TARGET 값에 따라 프록시 타겟 변경
      // 예: localhost:5173/api/* → http://localhost:8080/api/*
      //     또는 → https://k13c202.p.ssafy.io/api/*
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          // rewrite: (path) => path.replace(/^\/api/, '/api'), // 경로 유지
        },
        // OAuth2 엔드포인트도 프록시 필요
        '/oauth2': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/login': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        // WebSocket 프록시 (채팅, 실시간 통신)
        '/ws': {
          target: wsTarget,
          changeOrigin: true,
          secure: false,
          ws: true, // WebSocket 활성화
        }
      }
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
