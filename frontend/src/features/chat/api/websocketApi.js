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

/**
 * 이 전송을 가리키는 값을 만든다.
 *
 * 같은 값이 두 번 나오면 안 된다. 브라우저가 주는 것을 쓰되, 없는 환경도 있으므로
 * 시각과 난수를 붙인 것으로 대신한다.
 */
export const newClientMessageId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

export const websocketApi = {
  connect(chatRoomId, { onMessage, onTyping, onRead, onError, onConnect, onDisconnect } = {}) {
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

      // 타이핑 이벤트 구독
      const typingDestination = `/topic/chat/${chatRoomIdNum}/typing`;
      console.log('[websocketApi] 타이핑 구독 경로:', typingDestination);
      const typingSub = client.subscribe(typingDestination, (frame) => {
        try {
          const payload = JSON.parse(frame.body);
          console.log('[websocketApi] 타이핑 이벤트 수신:', payload);
          onTyping?.(payload);
        } catch (error) {
          console.error('[websocketApi] 타이핑 이벤트 파싱 오류:', error);
        }
      });
      subscriptions.push(typingSub);

      // 읽음 이벤트 구독
      const readDestination = `/topic/chat/${chatRoomIdNum}/read`;
      console.log('[websocketApi] 읽음 구독 경로:', readDestination);
      const readSub = client.subscribe(readDestination, (frame) => {
        try {
          const payload = JSON.parse(frame.body);
          console.log('[websocketApi] 읽음 이벤트 수신:', payload);
          onRead?.(payload);
        } catch (error) {
          console.error('[websocketApi] 읽음 이벤트 파싱 오류:', error);
        }
      });
      subscriptions.push(readSub);

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

    // 이 전송을 가리키는 값을 붙인다.
    //
    // 발행이 실패하면 저장은 됐는데 전달이 안 된 상태가 된다. 그때 사용자가 다시
    // 보내면 서버가 같은 값을 보고 두 번 저장하지 않는다. 없으면 같은 말풍선이
    // 두 번 뜬다.
    const withClientId = {
      ...message,
      clientMessageId: message.clientMessageId ?? newClientMessageId()
    };

    client.publish({
      destination: `/app/chat/${chatRoomIdNum}/send`,
      body: JSON.stringify(withClientId)
    });

    return withClientId.clientMessageId;
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

  sendTyping(chatRoomId) {
    const chatRoomIdNum = Number(chatRoomId ?? activeChatRoomId);
    if (!client || !client.connected) {
      throw new Error('WebSocket이 연결되지 않았습니다.');
    }
    if (!chatRoomIdNum || Number.isNaN(chatRoomIdNum)) {
      throw new Error('유효하지 않은 채팅방 ID입니다.');
    }

    client.publish({
      destination: `/app/chat/${chatRoomIdNum}/typing`,
      body: JSON.stringify({})
    });
  },

  sendHeartbeat(chatRoomId) {
    if (!client || !client.connected) {
      console.warn('[websocketApi] Heartbeat 전송 실패: WebSocket이 연결되지 않았습니다.');
      return false;
    }

    try {
      const chatRoomIdNum = Number(chatRoomId ?? activeChatRoomId);
      // chatRoomId가 있으면 포함, 없으면 빈 객체
      const body = chatRoomIdNum ? JSON.stringify({ chatRoomId: chatRoomIdNum }) : JSON.stringify({});
      
      client.publish({
        destination: '/app/chat/heartbeat',
        body: body
      });
      return true;
    } catch (error) {
      console.warn('[websocketApi] Heartbeat 전송 오류:', error);
      return false;
    }
  },

  enterChatRoom(chatRoomId) {
    const chatRoomIdNum = Number(chatRoomId ?? activeChatRoomId);
    if (!client || !client.connected) {
      console.warn('[websocketApi] 채팅방 입장 실패: WebSocket이 연결되지 않았습니다.');
      return false;
    }
    if (!chatRoomIdNum || Number.isNaN(chatRoomIdNum)) {
      console.warn('[websocketApi] 채팅방 입장 실패: 유효하지 않은 채팅방 ID입니다.');
      return false;
    }

    try {
      client.publish({
        destination: '/app/chat/enter',
        body: JSON.stringify({ chatRoomId: chatRoomIdNum })
      });
      console.log('[websocketApi] 채팅방 입장 전송:', chatRoomIdNum);
      return true;
    } catch (error) {
      console.warn('[websocketApi] 채팅방 입장 전송 오류:', error);
      return false;
    }
  },

  leaveChatRoom() {
    if (!client || !client.connected) {
      console.warn('[websocketApi] 채팅방 퇴장 실패: WebSocket이 연결되지 않았습니다.');
      return false;
    }

    try {
      client.publish({
        destination: '/app/chat/leave',
        body: JSON.stringify({})
      });
      console.log('[websocketApi] 채팅방 퇴장 전송');
      return true;
    } catch (error) {
      console.warn('[websocketApi] 채팅방 퇴장 전송 오류:', error);
      return false;
    }
  },

  refreshChatRoomActivity(chatRoomId) {
    const chatRoomIdNum = Number(chatRoomId ?? activeChatRoomId);
    if (!client || !client.connected) {
      console.warn('[websocketApi] 채팅방 활성 상태 갱신 실패: WebSocket이 연결되지 않았습니다.');
      return false;
    }
    if (!chatRoomIdNum || Number.isNaN(chatRoomIdNum)) {
      console.warn('[websocketApi] 채팅방 활성 상태 갱신 실패: 유효하지 않은 채팅방 ID입니다.');
      return false;
    }

    try {
      // enterChatRoom과 동일한 엔드포인트 사용 (TTL 갱신)
      client.publish({
        destination: '/app/chat/enter',
        body: JSON.stringify({ chatRoomId: chatRoomIdNum })
      });
      console.log('[websocketApi] 채팅방 활성 상태 갱신:', chatRoomIdNum);
      return true;
    } catch (error) {
      console.warn('[websocketApi] 채팅방 활성 상태 갱신 오류:', error);
      return false;
    }
  },

  isConnected() {
    return Boolean(client?.connected);
  }
};
