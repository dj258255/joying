import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [react()],
  resolve: {
    alias: {
        '@': path.resolve(__dirname, './src')
      }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: env.VITE_BACKEND_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
          cookiePathRewrite: { '*': '/' },
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
                const modifiedCookies = setCookieHeaders.map((cookie) =>
                  cookie
                    .replace(/Domain=[^;]+;?/gi, '')
                    .replace(/SameSite=None/gi, 'SameSite=Lax')
                );
              proxyRes.headers['set-cookie'] = modifiedCookies;
            }
          });
          }
      },
      '/oauth2': {
        target: env.VITE_BACKEND_TARGET || 'http://localhost:8080',
        changeOrigin: true,
          secure: false
      },
      '/ws': {
        target: env.VITE_BACKEND_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
          secure: false
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
  };
});
