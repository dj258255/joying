/**
 * Main Entry Point
 * 애플리케이션 진입점
 */

import '@/polyfills/nodeGlobals';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '@/lib/react-query/queryClient';
import App from './App.jsx';
import './styles/globalStyles.css';

// MSW 비활성화 (백엔드 연동)
// if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
//   const { worker } = await import('./mocks/browser');
//   worker.start({
//     onUnhandledRequest: 'bypass', // 처리되지 않은 요청은 실제 API로
//   });
// }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
