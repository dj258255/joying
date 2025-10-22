/**
 * useAccountVerify Hook
 * 계좌 인증 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../api/accountApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useAccountVerify = () => {
  const queryClient = useQueryClient();

  // 계좌 인증 상태 조회
  const {
    data: accountStatus,
    isLoading: isStatusLoading
  } = useQuery({
    queryKey: [QUERY_KEYS.USER, 'account-status'],
    queryFn: accountApi.getAccountStatus
  });

  // 계좌 인증
  const verifyAccountMutation = useMutation({
    mutationFn: accountApi.verifyAccount,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.USER, 'account-status']);
    }
  });

  return {
    accountStatus,
    isStatusLoading,
    verifyAccount: verifyAccountMutation.mutateAsync,
    isVerifying: verifyAccountMutation.isPending,
    verifyError: verifyAccountMutation.error
  };
};
