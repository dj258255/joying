/**
 * PushNotificationInitializer Component
 * 푸시 알림 초기화 컴포넌트
 */

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { initializePushNotification } from '../services/pushNotificationService';

/**
 * 푸시 알림 초기화 컴포넌트
 * 사용자가 로그인했을 때 자동으로 푸시 알림을 초기화합니다.
 *
 * LINE, Slack 방식:
 * 1순위: WebSocket 알림 (온라인일 때 즉시 수신) - GlobalPresenceContext에서 처리
 * 2순위: Push 알림 (오프라인/백그라운드 Fallback)
 */
export const PushNotificationInitializer = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // 로그인한 사용자만 푸시 알림 초기화
    if (!isAuthenticated) {
      return;
    }

    // 약간의 지연 후 초기화 (다른 초기화 작업 완료 대기)
    const timer = setTimeout(() => {
      // Push 알림 초기화 (2순위 - 오프라인/백그라운드 Fallback)
      // WebSocket 알림(1순위)은 GlobalPresenceContext에서 처리
      initializePushNotification().catch((error) => {
        console.warn('[PushNotificationInitializer] 푸시 알림 초기화 실패:', error);
        // 초기화 실패는 치명적이지 않으므로 에러를 무시
      });
    }, 2000); // 2초 후 초기화

    return () => {
      clearTimeout(timer);
    };
  }, [isAuthenticated]);

  return null; // UI 렌더링 없음
};

