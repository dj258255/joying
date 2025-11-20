/**
 * usePushNotification Hook
 * 푸시 알림 관련 로직을 관리하는 훅
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  initializePushNotification,
  getCurrentSubscription,
  unsubscribeFromPush,
  registerServiceWorker
} from '../services/pushNotificationService';

/**
 * 푸시 알림 훅
 * @returns {Object} 푸시 알림 관련 상태 및 함수
 */
export const usePushNotification = () => {
  const { isAuthenticated } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);

  // 브라우저 지원 여부 확인
  useEffect(() => {
    setIsSupported(isPushNotificationSupported());
  }, []);

  // 권한 상태 확인
  useEffect(() => {
    if (isSupported) {
      getNotificationPermission().then(setPermission);
    }
  }, [isSupported]);

  // 구독 상태 확인
  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported || !isAuthenticated) {
      setIsSubscribed(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const currentSubscription = await getCurrentSubscription(registration);
      setIsSubscribed(!!currentSubscription);
      setSubscription(currentSubscription);
    } catch (error) {
      console.error('[usePushNotification] 구독 상태 확인 실패:', error);
      setIsSubscribed(false);
    }
  }, [isSupported, isAuthenticated]);

  // 구독 상태 확인 (인증 상태 변경 시)
  useEffect(() => {
    if (isAuthenticated && isSupported) {
      checkSubscriptionStatus();
    } else {
      setIsSubscribed(false);
      setSubscription(null);
    }
  }, [isAuthenticated, isSupported, checkSubscriptionStatus]);

  // 푸시 알림 구독
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('이 브라우저는 푸시 알림을 지원하지 않습니다.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 권한 확인 및 요청
      const currentPermission = await getNotificationPermission();
      if (currentPermission !== 'granted') {
        const newPermission = await requestNotificationPermission();
        if (newPermission !== 'granted') {
          setError('알림 권한이 필요합니다.');
          setIsLoading(false);
          return false;
        }
        setPermission(newPermission);
      }

      // 푸시 알림 초기화 및 구독
      const newSubscription = await initializePushNotification();
      
      if (newSubscription) {
        setIsSubscribed(true);
        setSubscription(newSubscription);
        setIsLoading(false);
        return true;
      } else {
        setError('푸시 알림 구독에 실패했습니다.');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      const errorMessage = err.message || '푸시 알림 구독 중 오류가 발생했습니다.';
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  // 푸시 알림 구독 해제
  const unsubscribe = useCallback(async () => {
    if (!isSupported || !subscription) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      await unsubscribeFromPush(registration, subscription.endpoint);
      
      setIsSubscribed(false);
      setSubscription(null);
      setIsLoading(false);
      return true;
    } catch (err) {
      const errorMessage = err.message || '푸시 알림 구독 해제 중 오류가 발생했습니다.';
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, subscription]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscription,
    subscribe,
    unsubscribe,
    checkSubscriptionStatus
  };
};

