/**
 * useUnreadCount Hook
 * 읽지 않은 채팅 메시지 수를 조회하는 훅
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/contexts/AuthContext';

/**
 * 읽지 않은 메시지 수 조회
 */
export const useUnreadCount = () => {
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadCount', user?.memberId],
    queryFn: async () => {
      // TODO: 실제 API 연동 시 구현
      // const response = await chatApi.getUnreadCount();
      // return response.data.unreadCount;
      return 0; // 임시로 0 반환
    },
    enabled: !!user?.memberId,
    staleTime: 1000 * 30, // 30초마다 갱신
    refetchInterval: 1000 * 30
  });

  return {
    unreadCount
  };
};

