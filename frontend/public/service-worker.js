/**
 * Service Worker for Push Notifications
 * 푸시 알림을 위한 Service Worker
 */

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] 설치됨');
  // 즉시 활성화
  self.skipWaiting();
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] 활성화됨');
  // 모든 클라이언트에 즉시 제어권 부여
  event.waitUntil(self.clients.claim());
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] 푸시 알림 수신:', event);

  let notificationData = {
    title: '알림',
    body: '새로운 알림이 있습니다.',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'default',
    requireInteraction: false,
    data: {}
  };

  // 푸시 이벤트에 데이터가 있는 경우 파싱
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[ServiceWorker] 푸시 데이터 파싱 성공:', data);
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: data.data || {},
        ...(data.image && { image: data.image }),
        ...(data.actions && { actions: data.actions })
      };
    } catch (e) {
      console.error('[ServiceWorker] JSON 파싱 실패:', e);
      // JSON 파싱 실패 시 텍스트로 처리
      try {
        const text = event.data.text();
        console.log('[ServiceWorker] 텍스트로 파싱:', text);
        if (text) {
          notificationData.body = text;
        }
      } catch (textError) {
        console.error('[ServiceWorker] 텍스트 파싱도 실패:', textError);
      }
    }
  } else {
    console.warn('[ServiceWorker] 푸시 데이터가 없음');
  }

  console.log('[ServiceWorker] 알림 표시 시도:', notificationData);

  // 알림 표시 (각 메시지마다 고유 tag로 쌓임)
  event.waitUntil(
    (async () => {
      try {
        // 현재 채팅방에 있는지 확인 (채팅방 안에 있으면 알림 표시 안함)
        if (notificationData.data && notificationData.data.chatRoomId) {
          const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

          for (const client of clients) {
            const clientUrl = new URL(client.url);
            const currentChatRoomId = clientUrl.pathname.match(/\/chats\/(\d+)/)?.[1];

            if (currentChatRoomId && String(currentChatRoomId) === String(notificationData.data.chatRoomId)) {
              console.log('[ServiceWorker] 현재 채팅방 안에 있으므로 알림 표시 안함:', {
                currentChatRoomId,
                notificationChatRoomId: notificationData.data.chatRoomId,
                clientUrl: client.url
              });
              return; // 알림 표시하지 않음
            }
          }
        }

        // 중복 방지: messageId로 이미 표시된 알림이 있는지 확인
        // (같은 메시지에 대해 WebSocket과 Push 둘 다 오는 경우 중복 방지)
        if (notificationData.data && notificationData.data.messageId) {
          const messageId = notificationData.data.messageId;

          // 최근 5초 이내에 같은 messageId로 표시된 알림이 있는지 확인
          const existingNotifications = await self.registration.getNotifications();
          const now = Date.now();

          for (const notification of existingNotifications) {
            if (notification.data && notification.data.messageId === messageId) {
              // timestamp가 있으면 확인, 없으면 5초 이내로 간주
              const notifTimestamp = notification.data.timestamp || now;
              if ((now - notifTimestamp) < 5000) {
                console.log('[ServiceWorker] 중복 알림 무시 (최근에 표시됨):', messageId);
                return; // 중복이므로 표시하지 않음
              }
            }
          }
        }

        // 알림 표시 (중복이 아닌 경우만)
        await self.registration.showNotification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon,
          badge: notificationData.badge,
          tag: notificationData.tag,
          requireInteraction: notificationData.requireInteraction,
          data: {
            ...notificationData.data,
            timestamp: Date.now() // 표시 시각 기록
          },
          renotify: true,  // Edge 버그 해결: 같은 tag로 알림이 와도 다시 표시
          ...(notificationData.image && { image: notificationData.image }),
          ...(notificationData.actions && { actions: notificationData.actions })
        });

        console.log('[ServiceWorker] Push 알림 표시 완료:', notificationData.title, 'tag:', notificationData.tag);
      } catch (error) {
        console.error('[ServiceWorker] 알림 표시 실패:', error);
      }
    })()
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] 알림 클릭:', event);

  event.notification.close();

  // 알림 데이터에서 URL 추출
  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';

  // 클라이언트 창 열기 또는 포커스
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // 이미 열려있는 창이 있으면 포커스
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // 열려있는 창이 없으면 새로 열기
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 알림 닫기 처리
self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] 알림 닫힘:', event);
});

// 메시지 수신 (클라이언트에서 Service Worker로)
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] 메시지 수신:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

