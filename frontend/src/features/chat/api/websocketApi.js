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
      
    }
  });
  subscriptions = [];
};

const createSocket = () => {
  const url = websocketConfig.url;
  

  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return new WebSocket(url);
  }

  try {
    return new SockJS(url, null, {
      transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
      withCredentials: true
    });
  } catch (error) {
    
    throw error;
  }
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
          
        }
      },
      webSocketFactory: createSocket,
      connectHeaders: {
        cookie: document.cookie || ''
      }
    });

    client.onUnhandledFrame = (frame) => {
      
    };

    client.onUnhandledMessage = (message) => {
      
    };

    client.beforeConnect = () => {
      // ensure cookies are sent (SockJS handles withCredentials)
    };

    client.onConnect = (frame) => {
      
      if (!client) return;
      cleanupSubscriptions();

      const subscribe = (destination) => {
        
        const sub = client.subscribe(destination, (frame) => {
          try {
            const payload = JSON.parse(frame.body);
            
            onMessage?.(payload);
          } catch (error) {
            
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
        
      }

      subscribe(`/queue/chat/${chatRoomIdNum}`);

      const broadcastDestination = `/topic/chat/${chatRoomIdNum}`;
      subscribe(broadcastDestination);

      // 타이핑 이벤트 구독
      const typingDestination = `/topic/chat/${chatRoomIdNum}/typing`;
      
      const typingSub = client.subscribe(typingDestination, (frame) => {
        try {
          const payload = JSON.parse(frame.body);
          
          onTyping?.(payload);
        } catch (error) {
          
        }
      });
      subscriptions.push(typingSub);

      // 읽음 이벤트 구독
      const readDestination = `/topic/chat/${chatRoomIdNum}/read`;
      
      const readSub = client.subscribe(readDestination, (frame) => {
        try {
          const payload = JSON.parse(frame.body);
          
          onRead?.(payload);
        } catch (error) {
          
        }
      });
      subscriptions.push(readSub);

      onConnect?.();
    };

    client.onStompError = (frame) => {
      
      const error = new Error(frame.headers['message'] || frame.body || 'STOMP error');
      onError?.(error);
    };

    client.onWebSocketError = (error) => {
      
      onError?.(error instanceof Error ? error : new Error(error?.message || 'WebSocket error'));
    };

    client.onWebSocketClose = (event) => {
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
      
      return false;
    }
  },

  enterChatRoom(chatRoomId) {
    const chatRoomIdNum = Number(chatRoomId ?? activeChatRoomId);
    if (!client || !client.connected) {
      
      return false;
    }
    if (!chatRoomIdNum || Number.isNaN(chatRoomIdNum)) {
      
      return false;
    }

    try {
      client.publish({
        destination: '/app/chat/enter',
        body: JSON.stringify({ chatRoomId: chatRoomIdNum })
      });
      
      return true;
    } catch (error) {
      
      return false;
    }
  },

  leaveChatRoom() {
    if (!client || !client.connected) {
      
      return false;
    }

    try {
      client.publish({
        destination: '/app/chat/leave',
        body: JSON.stringify({})
      });
      
      return true;
    } catch (error) {
      
      return false;
    }
  },

  refreshChatRoomActivity(chatRoomId) {
    const chatRoomIdNum = Number(chatRoomId ?? activeChatRoomId);
    if (!client || !client.connected) {
      
      return false;
    }
    if (!chatRoomIdNum || Number.isNaN(chatRoomIdNum)) {
      
      return false;
    }

    try {
      // enterChatRoom과 동일한 엔드포인트 사용 (TTL 갱신)
      client.publish({
        destination: '/app/chat/enter',
        body: JSON.stringify({ chatRoomId: chatRoomIdNum })
      });
      
      return true;
    } catch (error) {
      
      return false;
    }
  },

  isConnected() {
    return Boolean(client?.connected);
  }
};
