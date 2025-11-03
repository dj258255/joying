/**
 * WebSocket URL 생성
 * 개발/프로덕션 환경에 맞는 WebSocket URL 반환
 */
const getWebSocketUrl = () => {
  const wsUrl = import.meta.env.VITE_WS_URL || '/ws/chat';
  
  // 절대 URL이면 그대로 사용 (예: ws://localhost:8080/ws/chat)
  if (wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://')) {
    return wsUrl;
  }
  
  // 상대 경로인 경우 현재 프로토콜에 맞춰 변환
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}${wsUrl}`;
};

/**
 * WebSocket 설정
 */
export const websocketConfig = {
  get url() {
    return getWebSocketUrl();
  },
  reconnectInterval: 3000,
  heartbeatInterval: 30000
};

let ws = null;

/**
 * 채팅 WebSocket 생성
 * @param {string} token - 액세스 토큰
 * @returns {WebSocket}
 */
export const createChatWebSocket = (token) => {
  ws = new WebSocket(`${websocketConfig.url}?token=${token}`);
  
  ws.onopen = () => {
    console.log('✅ WebSocket Connected');
  };
  
  ws.onerror = (error) => {
    console.error('❌ WebSocket Error:', error);
  };
  
  ws.onclose = () => {
    console.log('🔌 WebSocket Disconnected');
  };
  
  return ws;
};

/**
 * WebSocket API 객체
 */
export const websocketApi = {
  connect(chatRoomId, onMessage, onError) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('인증 토큰이 없습니다.');
    }
    
    ws = createChatWebSocket(token);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        console.error('메시지 파싱 오류:', error);
        onError?.(error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
      onError?.(error);
    };
  },
  
  disconnect() {
    if (ws) {
      ws.close();
      ws = null;
    }
  },
  
  sendMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket이 연결되지 않았습니다.');
    }
  },
  
  isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }
};
