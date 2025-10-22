/**
 * useAuth Hook
 * 인증 상태 관리 및 인증 관련 함수들을 제공하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useAuth = () => {
  const queryClient = useQueryClient();

  // 현재 사용자 정보 조회
  const {
    data: user,
    isLoading: isUserLoading,
    error: userError
  } = useQuery({
    queryKey: [QUERY_KEYS.AUTH, 'user'],
    queryFn: authApi.getCurrentUser,
    retry: false,
    staleTime: 1000 * 60 * 5 // 5분
  });

  // 로그아웃 뮤테이션
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      // TODO: 로그인 페이지로 리다이렉트
    }
  });

  // 토큰 갱신 뮤테이션
  const refreshTokenMutation = useMutation({
    mutationFn: (refreshToken) => authApi.refreshToken(refreshToken),
    onSuccess: (data) => {
      // TODO: 새 토큰 저장 로직
      queryClient.invalidateQueries([QUERY_KEYS.AUTH]);
    }
  });

  const isAuthenticated = !!user && !userError;

  return {
    user,
    isAuthenticated,
    isUserLoading,
    logout: logoutMutation.mutate,
    refreshToken: refreshTokenMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    isRefreshing: refreshTokenMutation.isPending
  };
};
