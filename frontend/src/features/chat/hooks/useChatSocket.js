/**
 * useChatSocket Hook
 * 웹소켓 연결 및 메시지 송수신을 관리하는 훅
 */

import { useState, useEffect, useCallback } from 'react';
import { websocketApi } from '../api/websocketApi';

export const useChatSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback((chatRoomId, onMessage, onError) => {
    try {
      websocketApi.connect(chatRoomId, onMessage, onError);
      setIsConnected(true);
    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
      onError?.(error);
    }
  }, []);

  const disconnect = useCallback(() => {
    websocketApi.disconnect();
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message) => {
    if (websocketApi.isConnected()) {
      websocketApi.sendMessage(message);
    } else {
      console.error('WebSocket이 연결되지 않음');
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    isConnected
  };
};
