/**
 * WebSocket Notification Service
 * WebSocket을 통한 실시간 알림 구현
 *
 * LINE, Slack 등 대기업 메신저 표준 구현 방식:
 * 1순위: WebSocket (온라인일 때 즉시 수신, 빠름)
 * 2순위: Web Push (오프라인/백그라운드에서도 수신, Fallback)
 */

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWebSocketUrl } from '@/features/chat/api/websocketApi';

let globalClient = null;
let notificationSubscription = null;
let chatRoomUpdateSubscription = null;
let chatRoomStatusSubscription = null;

/**
 * WebSocket으로 전역 알림 구독
 * (채팅방에 들어가지 않아도 알림 수신 가능)
 */
export function subscribeToGlobalNotifications() {
  // 이미 연결되어 있으면 재연결 안 함
  if (globalClient?.connected) {
    console.log('[WebSocketNotification] 이미 전역 알림이 구독되어 있습니다.');
    return;
  }

  console.log('[WebSocketNotification] 전역 알림 WebSocket 연결 시작...');

  const createSocket = () => {
    const url = getWebSocketUrl();
    console.log('[WebSocketNotification] SockJS 연결 URL:', url);

    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return new WebSocket(url);
    }

    return new SockJS(url, null, {
      transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
      withCredentials: true
    });
  };

  globalClient = new Client({
    reconnectDelay: 5000,
    heartbeatIncoming: 30000,
    heartbeatOutgoing: 30000,
    debug: (str) => {
      if (import.meta.env.DEV) {
        console.debug('[WebSocketNotification STOMP]', str);
      }
    },
    webSocketFactory: createSocket,
    connectHeaders: {
      cookie: document.cookie || ''
    }
  });

  globalClient.onConnect = (frame) => {
    console.log('[WebSocketNotification] 전역 알림 WebSocket 연결 성공');

    // 푸시 알림 Fallback 구독
    notificationSubscription = globalClient.subscribe('/user/queue/notifications', (message) => {
      try {
        const notification = JSON.parse(message.body);
        console.log('[WebSocketNotification] 알림 수신:', notification);

        handleNotification(notification);
      } catch (error) {
        console.error('[WebSocketNotification] 알림 파싱 오류:', error);
      }
    });

    // 채팅방 목록 업데이트 구독 (안읽은 개수 등)
    chatRoomUpdateSubscription = globalClient.subscribe('/user/queue/chatroom-update', (message) => {
      try {
        const update = JSON.parse(message.body);
        console.log('[WebSocketNotification] 채팅방 업데이트:', update);

        // 채팅 목록 페이지가 열려있으면 리로드 이벤트 발생
        window.dispatchEvent(new CustomEvent('chatroom-update', { detail: update }));
      } catch (error) {
        console.error('[WebSocketNotification] 채팅방 업데이트 파싱 오류:', error);
      }
    });

    // 채팅방 상태 변경 구독 (재입장 등)
    chatRoomStatusSubscription = globalClient.subscribe('/user/queue/chatroom-status', (message) => {
      try {
        const status = JSON.parse(message.body);
        console.log('[WebSocketNotification] 채팅방 상태 변경:', status);

        // 채팅방 상태 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('chatroom-status', { detail: status }));
      } catch (error) {
        console.error('[WebSocketNotification] 채팅방 상태 파싱 오류:', error);
      }
    });

    console.log('[WebSocketNotification] 모든 구독 완료');
  };

  globalClient.onStompError = (frame) => {
    console.error('[WebSocketNotification] STOMP 오류:', frame.headers['message'], frame.body);
  };

  globalClient.onWebSocketError = (error) => {
    console.error('[WebSocketNotification] WebSocket 오류:', error);
  };

  globalClient.onWebSocketClose = (event) => {
    console.warn('[WebSocketNotification] WebSocket 종료:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    // 구독 정리
    notificationSubscription = null;
    chatRoomUpdateSubscription = null;
    chatRoomStatusSubscription = null;
  };

  globalClient.activate();
}

/**
 * WebSocket 알림 구독 해제
 */
export function unsubscribeFromGlobalNotifications() {
  console.log('[WebSocketNotification] 전역 알림 구독 해제...');

  if (notificationSubscription) {
    try {
      notificationSubscription.unsubscribe();
    } catch (error) {
      console.warn('[WebSocketNotification] 알림 구독 해제 실패:', error);
    }
    notificationSubscription = null;
  }

  if (chatRoomUpdateSubscription) {
    try {
      chatRoomUpdateSubscription.unsubscribe();
    } catch (error) {
      console.warn('[WebSocketNotification] 채팅방 업데이트 구독 해제 실패:', error);
    }
    chatRoomUpdateSubscription = null;
  }

  if (chatRoomStatusSubscription) {
    try {
      chatRoomStatusSubscription.unsubscribe();
    } catch (error) {
      console.warn('[WebSocketNotification] 채팅방 상태 구독 해제 실패:', error);
    }
    chatRoomStatusSubscription = null;
  }

  if (globalClient) {
    try {
      globalClient.deactivate();
    } catch (error) {
      console.warn('[WebSocketNotification] 연결 종료 실패:', error);
    }
    globalClient = null;
  }
}

/**
 * WebSocket으로 받은 알림 처리
 * @param {Object} notification - 알림 데이터
 */
export function handleNotification(notification) {
  const { type, title, body, icon, image, badge, tag, data } = notification;

  console.log('[WebSocketNotification] 알림 처리:', { type, title, body, data, fullNotification: notification });

  // 현재 채팅방에 있는지 확인 (채팅방 안에 있으면 알림 표시 안함)
  // chatRoomId, chatroomId, roomId 등 다양한 필드명 체크
  const notificationChatRoomId = data?.chatRoomId || data?.chatroomId || data?.roomId || notification.chatRoomId;

  if (notificationChatRoomId) {
    const currentPath = window.location.pathname;
    const currentChatRoomId = currentPath.match(/\/chats\/(\d+)/)?.[1];
    
    // window 객체에 저장된 현재 활성 채팅방 ID도 확인 (ChatContext에서 설정)
    const activeChatRoomId = window.__activeChatRoomId__ || null;

    console.log('[WebSocketNotification] 채팅방 체크:', {
      currentPath,
      currentChatRoomId,
      activeChatRoomId,
      notificationChatRoomId,
      matchesPath: currentChatRoomId && String(currentChatRoomId) === String(notificationChatRoomId),
      matchesActive: activeChatRoomId && String(activeChatRoomId) === String(notificationChatRoomId)
    });

    // 경로나 활성 채팅방 ID가 일치하면 알림 표시 안함
    const isInCurrentChatRoom = (currentChatRoomId && String(currentChatRoomId) === String(notificationChatRoomId)) ||
                                (activeChatRoomId && String(activeChatRoomId) === String(notificationChatRoomId));

    if (isInCurrentChatRoom) {
      console.log('[WebSocketNotification] 현재 채팅방 안에 있으므로 알림 표시 안함');
      return;
    }
  } else {
    console.log('[WebSocketNotification] chatRoomId 없음, 알림 표시 진행');
  }

  // 중복 알림 방지: 최근 5초 이내에 같은 messageId 받았으면 무시
  if (data?.messageId) {
    const storageKey = `notification_${data.messageId}`;
    const lastShown = localStorage.getItem(storageKey);
    const now = Date.now();

    if (lastShown && (now - parseInt(lastShown)) < 5000) {
      console.log('[WebSocketNotification] 중복 알림 무시 (최근에 표시됨)');
      return;
    }

    localStorage.setItem(storageKey, now.toString());

    // 5초 후 자동 삭제 (메모리 절약)
    setTimeout(() => {
      localStorage.removeItem(storageKey);
    }, 5000);
  }

  // 브라우저 알림 권한 확인
  if (Notification.permission !== 'granted') {
    console.log('[WebSocketNotification] 브라우저 알림 권한 없음 (권한:', Notification.permission, ')');
    return;
  }

  // Service Worker를 통해 알림 표시 (Edge 호환성)
  // Edge는 페이지에서 직접 Notification 생성하는 것을 제한할 수 있음
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    console.log('[WebSocketNotification] Service Worker를 통해 알림 표시 시도...');

    // WebSocket 알림 표시 (1순위 - 즉시 표시)
    // 각 메시지마다 고유 tag를 사용하므로 알림이 쌓임
    setTimeout(() => {
      navigator.serviceWorker.ready.then(async (registration) => {
        try {
          const notificationOptions = {
            body,
            icon: icon || '/vite.svg',
            badge: badge || '/vite.svg',
            tag: tag || 'default',
            requireInteraction: false,
            data: data || {},
            renotify: true  // Edge 버그 해결: 같은 tag로 알림이 와도 다시 표시
          };

          if (image) {
            notificationOptions.image = image;
          }

          await registration.showNotification(title, notificationOptions);
          console.log('[WebSocketNotification] WebSocket 알림 표시 완료 (Fallback 작동, tag:', tag, ')');
        } catch (error) {
          console.error('[WebSocketNotification] Service Worker 알림 표시 실패:', error);
        }
      }).catch((error) => {
        console.error('[WebSocketNotification] Service Worker 준비 실패:', error);
      });
    }, 200); // 200ms 지연
  } else {
    // Service Worker 없으면 일반 Notification API 사용 (폴백)
    console.log('[WebSocketNotification] Service Worker 없음, 페이지 알림 사용');

    try {
      const notificationOptions = {
        body,
        icon: icon || '/vite.svg',
        badge: badge || '/vite.svg',
        tag: tag || 'default',
        requireInteraction: false,
        data: data || {},
        renotify: true  // Edge 버그 해결: 같은 tag로 알림이 와도 다시 표시
      };

      if (image) {
        notificationOptions.image = image;
      }

      const browserNotification = new Notification(title, notificationOptions);

      // 알림 클릭 시 해당 페이지로 이동
      browserNotification.onclick = () => {
        const url = data?.url || '/';
        window.focus();
        window.location.href = url;
        browserNotification.close();
      };

      console.log('[WebSocketNotification] 페이지 알림 표시 완료 (tag:', tag, ')');
    } catch (error) {
      console.error('[WebSocketNotification] 페이지 알림 표시 실패:', error);
    }
  }

  // 인앱 토스트 알림 (선택적)
  // TODO: 나중에 토스트 UI 라이브러리 추가하면 여기서 표시
  // showToast({ title, body, icon });
}

/**
 * WebSocket 연결 상태 확인
 */
export function isGlobalNotificationConnected() {
  return globalClient?.connected || false;
}