import '@/polyfills/nodeGlobals';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * WebSocket 설정 및 API
 */

// WebSocket URL 생성 (SockJS/표준 WebSocket 지원)
export function getWebSocketUrl() {
  const explicitUrl = import.meta.env.VITE_WS_URL;
  if (explicitUrl) {
    if (/^https?:\/\//i.test(explicitUrl) || /^wss?:\/\//i.test(explicitUrl)) {
      return explicitUrl;
    }

    const backendTarget = import.meta.env.VITE_BACKEND_TARGET;
    if (backendTarget) {
      const sanitizedTarget = backendTarget.replace(/\/$/, '');
      const path = explicitUrl.startsWith('/') ? explicitUrl : `/${explicitUrl}`;
      return `${sanitizedTarget}${path}`;
    }

    const { protocol, host } = window.location;
    const httpProtocol = protocol === 'https:' ? 'https:' : 'http:';
    const path = explicitUrl.startsWith('/') ? explicitUrl : `/${explicitUrl}`;
    return `${httpProtocol}//${host}${path}`;
  }

  const backendTargetEnv = import.meta.env.VITE_BACKEND_TARGET;
  if (backendTargetEnv) {
    const sanitizedTarget = backendTargetEnv.replace(/\/$/, '');
    return `${sanitizedTarget}/ws/chat`;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8080/ws/chat';
  }

  const defaultPath = '/ws/chat';
  const { protocol, host } = window.location;
  const httpProtocol = protocol === 'https:' ? 'https:' : 'http:';
  return `${httpProtocol}//${host}${defaultPath}`;
}

export const websocketConfig = {
  get url() {
    return getWebSocketUrl();
  },
  reconnectInterval: 3000,
  heartbeatInterval: 30000
};

let client = null;
let subscriptions = [];
let activeChatRoomId = null;

const cleanupSubscriptions = () => {
  if (subscriptions.length === 0) return;
  subscriptions.forEach((sub) => {
    if (!sub) return;
    try {
      sub.unsubscribe();
    } catch (error) {
      console.warn('[websocketApi] 구독 해제 중 오류:', error);
    }
  });
  subscriptions = [];
};

const createSocket = () => {
  const url = websocketConfig.url;
  console.log('[websocketApi] SockJS 연결 시도 URL:', url);

  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return new WebSocket(url);
  }

  try {
    return new SockJS(url, null, {
      transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
      withCredentials: true
    });
  } catch (error) {
    console.error('[websocketApi] SockJS 생성 실패:', error);
    throw error;
  }
};

export const websocketApi = {
  connect(chatRoomId, { onMessage, onError, onConnect, onDisconnect } = {}) {
    const chatRoomIdNum = Number(chatRoomId);
    if (!chatRoomIdNum || Number.isNaN(chatRoomIdNum)) {
      throw new Error('유효하지 않은 채팅방 ID입니다.');
    }

    activeChatRoomId = chatRoomIdNum;

    if (client) {
      this.disconnect();
    }

    client = new Client({
      reconnectDelay: websocketConfig.reconnectInterval,
      heartbeatIncoming: websocketConfig.heartbeatInterval,
      heartbeatOutgoing: websocketConfig.heartbeatInterval,
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.debug('[STOMP]', str);
        }
      },
      webSocketFactory: createSocket,
      connectHeaders: {
        cookie: document.cookie || ''
      }
    });

    client.onUnhandledFrame = (frame) => {
      console.warn('[websocketApi] 처리되지 않은 STOMP Frame:', frame);
    };

    client.onUnhandledMessage = (message) => {
      console.warn('[websocketApi] 처리되지 않은 메시지:', message);
    };

    client.beforeConnect = () => {
      // ensure cookies are sent (SockJS handles withCredentials)
    };

    client.onConnect = (frame) => {
      console.log('[websocketApi] STOMP 연결 성공:', frame.command);
      if (!client) return;
      cleanupSubscriptions();

      const subscribe = (destination) => {
        console.log('[websocketApi] 구독 경로:', destination);
        const sub = client.subscribe(destination, (frame) => {
          try {
            const payload = JSON.parse(frame.body);
            console.log('[websocketApi] 메시지 수신:', { destination, payload });
            onMessage?.(payload);
          } catch (error) {
            console.error('[websocketApi] 메시지 파싱 오류:', error);
            onError?.(error);
          }
        });
        subscriptions.push(sub);
      };

      subscribe(`/user/queue/chat/${chatRoomIdNum}`);

      try {
        const rawUrl = client.webSocket?._transport?.url || client.webSocket?._transportUrl || '';
        const sessionId = rawUrl.split('/').slice(-2, -1)[0];
        if (sessionId) {
          subscribe(`/user/${sessionId}/queue/chat/${chatRoomIdNum}`);
        }
      } catch (error) {
        console.warn('[websocketApi] 세션 기반 구독 설정 실패:', error?.message || error);
      }

      subscribe(`/queue/chat/${chatRoomIdNum}`);

      const broadcastDestination = `/topic/chat/${chatRoomIdNum}`;
      subscribe(broadcastDestination);

      onConnect?.();
    };

    client.onStompError = (frame) => {
      console.error('[websocketApi] STOMP 오류:', frame.headers['message'], frame.body);
      const error = new Error(frame.headers['message'] || frame.body || 'STOMP error');
      onError?.(error);
    };

    client.onWebSocketError = (error) => {
      console.error('[websocketApi] WebSocket 오류:', error);
      onError?.(error instanceof Error ? error : new Error(error?.message || 'WebSocket error'));
    };

    client.onWebSocketClose = (event) => {
      console.warn('[websocketApi] WebSocket 종료:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      cleanupSubscriptions();
      onDisconnect?.(event);
    };

    client.activate();
  },

  disconnect() {
    cleanupSubscriptions();
    if (client) {
      try {
        client.deactivate();
      } catch (error) {
        console.warn('[websocketApi] 비활성화 오류:', error);
      }
      client = null;
    }
    activeChatRoomId = null;
  },

  sendMessage(chatRoomId, message) {
    const chatRoomIdNum = Number(chatRoomId ?? activeChatRoomId);
    if (!client || !client.connected) {
      throw new Error('WebSocket이 연결되지 않았습니다.');
    }
    if (!chatRoomIdNum || Number.isNaN(chatRoomIdNum)) {
      throw new Error('유효하지 않은 채팅방 ID입니다.');
    }

    client.publish({
      destination: `/app/chat/${chatRoomIdNum}/send`,
      body: JSON.stringify(message)
    });
  },

  sendReadReceipt(chatRoomId) {
    const chatRoomIdNum = Number(chatRoomId ?? activeChatRoomId);
    if (!client || !client.connected) {
      throw new Error('WebSocket이 연결되지 않았습니다.');
    }
    if (!chatRoomIdNum || Number.isNaN(chatRoomIdNum)) {
      throw new Error('유효하지 않은 채팅방 ID입니다.');
    }

    client.publish({
      destination: `/app/chat/${chatRoomIdNum}/read`,
      body: JSON.stringify({})
    });
  },

  isConnected() {
    return Boolean(client?.connected);
  }
};
