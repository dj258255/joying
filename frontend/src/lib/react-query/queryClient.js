/**
 * React Query Client Configuration
 * React Query 클라이언트 설정
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60, // 1분
      cacheTime: 1000 * 60 * 5, // 5분
    },
    mutations: {
      retry: 1,
    },
  },
});
