/**
 * useUserProfile Hook
 * 사용자 프로필 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/userApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useUserProfile = (userId) => {
  const queryClient = useQueryClient();

  // 사용자 정보 조회
  const {
    data: user,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.USER, userId],
    queryFn: () => userApi.getUser(userId),
    enabled: !!userId
  });

  // 사용자 정보 수정
  const updateUserMutation = useMutation({
    mutationFn: (userData) => userApi.updateUser(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.USER, userId]);
    }
  });

  // 사용자 탈퇴
  const deleteUserMutation = useMutation({
    mutationFn: () => userApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.clear();
      // TODO: 로그인 페이지로 리다이렉트
    }
  });

  return {
    user,
    isLoading,
    error,
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending
  };
};
