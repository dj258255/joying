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
      // 모든 쿼리 캐시 클리어
      queryClient.clear();
      // 로컬 스토리지 정리
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    onError: (error) => {
      
      throw error; // 컴포넌트에서 에러 처리할 수 있도록 에러를 다시 throw
    }
  });

  // 프로필 이미지 업데이트
  const updateProfileImageMutation = useMutation({
    mutationFn: (file) => userApi.updateProfileImage(userId, file),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.USER, userId]);
    }
  });

  // 프로필 이미지 삭제
  const deleteProfileImageMutation = useMutation({
    mutationFn: () => userApi.deleteProfileImage(userId),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.USER, userId]);
    }
  });

  return {
    user,
    isLoading,
    error,
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    updateProfileImage: updateProfileImageMutation.mutateAsync,
    deleteProfileImage: deleteProfileImageMutation.mutateAsync,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    isUploadingImage: updateProfileImageMutation.isPending,
    isDeletingImage: deleteProfileImageMutation.isPending
  };
};
