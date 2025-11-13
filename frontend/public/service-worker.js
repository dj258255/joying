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

  // 알림 표시 (중복 방지 로직 추가)
  event.waitUntil(
    (async () => {
      try {
        // 중복 알림 방지: 같은 tag의 알림이 이미 표시되어 있는지 확인
        const existingNotifications = await self.registration.getNotifications({
          tag: notificationData.tag
        });

        // 같은 tag의 알림이 최근 3초 이내에 표시되었으면 무시
        if (existingNotifications.length > 0) {
          console.log('[ServiceWorker] 중복 알림 무시 (이미 표시됨):', notificationData.tag);
          return;
        }

        // 알림 표시
        await self.registration.showNotification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon,
          badge: notificationData.badge,
          tag: notificationData.tag,
          requireInteraction: notificationData.requireInteraction,
          data: notificationData.data,
          ...(notificationData.image && { image: notificationData.image }),
          ...(notificationData.actions && { actions: notificationData.actions })
        });

        console.log('[ServiceWorker] 알림 표시 완료:', notificationData.title);
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

