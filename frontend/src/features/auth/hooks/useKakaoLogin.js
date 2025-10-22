/**
 * useKakaoLogin Hook
 * 카카오 로그인 관련 로직을 관리하는 훅
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useKakaoLogin = () => {
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: (code) => authApi.kakaoLogin(code),
    onSuccess: (data) => {
      // TODO: 토큰 저장 로직
      queryClient.invalidateQueries([QUERY_KEYS.AUTH]);
    }
  });

  const login = async () => {
    // TODO: 카카오 SDK를 통한 인증 코드 획득
    const code = 'kakao_auth_code'; // 임시 코드
    return loginMutation.mutateAsync(code);
  };

  return {
    login,
    isLoading: loginMutation.isPending,
    error: loginMutation.error
  };
};
