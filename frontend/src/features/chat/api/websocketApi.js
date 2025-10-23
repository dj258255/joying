/**
 * WebSocket 설정
 */
export const websocketConfig = {
  url: import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/chat',
  reconnectInterval: 3000,
  heartbeatInterval: 30000
};

/**
 * 채팅 WebSocket 생성
 * @param {string} token - 액세스 토큰
 * @returns {WebSocket}
 */
export const createChatWebSocket = (token) => {
  const ws = new WebSocket(`${websocketConfig.url}?token=${token}`);
  
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
