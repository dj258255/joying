/**
 * useChatSocket Hook
 * 웹소켓 연결 및 메시지 송수신을 관리하는 훅
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketApi } from '../api/websocketApi';

export const useChatSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const currentRoomRef = useRef(null);

  const connect = useCallback((chatRoomId, { onMessage, onError, onConnect, onDisconnect } = {}) => {
    try {
      if (currentRoomRef.current && Number(currentRoomRef.current) === Number(chatRoomId)) {
        if (!websocketApi.isConnected()) {
          console.warn('[useChatSocket] 기존 연결이 끊어져 재연결 시도');
        } else {
          console.log('[useChatSocket] 이미 연결된 채팅방입니다.');
          return;
        }
      }

      websocketApi.connect(chatRoomId, {
        onMessage,
        onError: (error) => {
          onError?.(error);
        },
        onConnect: () => {
          setIsConnected(true);
          onConnect?.();
        },
        onDisconnect: () => {
          setIsConnected(false);
          currentRoomRef.current = null;
          onDisconnect?.();
        }
      });
      currentRoomRef.current = chatRoomId;
    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
      setIsConnected(false);
      onError?.(error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    websocketApi.disconnect();
    setIsConnected(false);
    currentRoomRef.current = null;
  }, []);

  const sendMessage = useCallback((chatRoomId, message) => {
    if (websocketApi.isConnected()) {
      websocketApi.sendMessage(chatRoomId, message);
    } else {
      throw new Error('WebSocket이 연결되지 않았습니다.');
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
