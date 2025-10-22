/**
 * WebSocket API functions
 * 웹소켓 연결 및 메시지 송수신 API
 */

class WebSocketAPI {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * 웹소켓 연결
   * @param {string} chatRoomId - 채팅방 ID
   * @param {Function} onMessage - 메시지 수신 콜백
   * @param {Function} onError - 에러 콜백
   */
  connect(chatRoomId, onMessage, onError) {
    const wsUrl = `${import.meta.env.VITE_WS_URL}/chats/${chatRoomId}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket 연결됨');
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage(message);
      } catch (error) {
        console.error('메시지 파싱 오류:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket 오류:', error);
      onError?.(error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket 연결 종료');
    };
  }

  /**
   * 메시지 전송
   * @param {Object} message - 전송할 메시지
   */
  sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket이 연결되지 않음');
    }
  }

  /**
   * 웹소켓 연결 종료
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * 연결 상태 확인
   * @returns {boolean} 연결 상태
   */
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

export const websocketApi = new WebSocketAPI();
