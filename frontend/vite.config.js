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
        cookiePathRewrite: { '*': '/' }, // 쿠키 경로 재작성
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Set-Cookie 헤더 처리 (개발 환경에서 쿠키가 제대로 설정되도록)
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              // Domain 속성 제거 (로컬 개발 환경에서 문제 발생 방지)
              // SameSite=None을 SameSite=Lax로 변경 (로컬 개발 환경 호환성)
              const modifiedCookies = setCookieHeaders.map(cookie => {
                return cookie
                  .replace(/Domain=[^;]+;?/gi, '') // Domain 제거
                  .replace(/SameSite=None/gi, 'SameSite=Lax'); // SameSite 변경
              });
              proxyRes.headers['set-cookie'] = modifiedCookies;
            }
          });
        },
        rewrite: (path) => {
          console.log('[Vite Proxy] 프록시 요청:', {
            원본경로: path,
            타겟: env.VITE_BACKEND_TARGET || 'http://localhost:8080',
            최종경로: path.replace(/^\/api/, '/api')
          });
          return path; // /api 경로 유지
        },
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
      // 토스 페이먼츠 API는 프록시하지 않음 (외부 API이므로 직접 호출)
      // '/tosspayments': {
      //   target: 'https://api.tosspayments.com',
      //   changeOrigin: true,
      //   secure: true,
      //   rewrite: (path) => path.replace(/^\/tosspayments/, ''),
      // },
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
