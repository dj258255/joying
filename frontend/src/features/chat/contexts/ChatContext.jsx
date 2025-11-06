/**
 * ChatContext
 * 채팅 관련 전역 상태 관리 컨텍스트 (더미 데이터 사용)
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { chatApi } from '../api/chatApi';
import { messageApi } from '../api/messageApi';
import { useChatSocket } from '../hooks/useChatSocket';

const ChatContext = createContext();

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CURRENT_CHAT_ROOM':
      return {
        ...state,
        currentChatRoom: action.payload
      };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload
      };
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    default:
      return state;
  }
};

const initialState = {
  currentChatRoom: null,
  messages: [],
  isConnected: false,
  isLoading: false
};

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - 자식 컴포넌트
 */
export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { connect, disconnect, sendMessage: sendWebSocketMessage, isConnected } = useChatSocket();

  // WebSocket 연결 관리
  useEffect(() => {
    if (state.currentChatRoom) {
      // WebSocket 연결 (현재는 더미 데이터 사용으로 연결하지 않음)
      // connect(state.currentChatRoom.id, (message) => {
      //   dispatch({ type: 'ADD_MESSAGE', payload: message });
      // }, (error) => {
      //   console.error('WebSocket 오류:', error);
      // });
    }

    return () => {
      // disconnect();
    };
  }, [state.currentChatRoom?.id]); // 의존성을 chatRoomId로만 제한

  // 채팅방 설정
  // setCurrentChatRoom(chatRoomId) - API 호출하여 조회
  // setCurrentChatRoom(chatRoomId, chatRoomData) - 전달된 데이터 사용 (생성 직후 등)
  const setCurrentChatRoom = useCallback(async (chatRoomId, chatRoomData = null) => {
    if (!chatRoomId) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // 전달된 채팅방 데이터가 있으면 사용, 없으면 API 호출
      let chatRoom;
      if (chatRoomData) {
        console.log('[ChatContext] 생성된 채팅방 데이터 사용 (조회 API 호출 생략):', chatRoomData);
        chatRoom = chatRoomData;
      } else {
        console.log('[ChatContext] 채팅방 상세 조회 API 호출:', chatRoomId);
        chatRoom = await chatApi.getChatRoomDetail(chatRoomId);
      }
      
      // 메시지 목록 조회 (백엔드 API 호출)
      const messages = await messageApi.getMessages(chatRoomId);
      
      dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: chatRoom });
      dispatch({ type: 'SET_MESSAGES', payload: messages });
      
      // 메시지 읽음 처리
      await messageApi.markAllAsRead(chatRoomId);
    } catch (error) {
      console.error('채팅방 로드 실패:', error);
      dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: null });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []); // 빈 의존성 배열로 함수가 재생성되지 않도록 함

  // 메시지 전송
  const sendMessage = useCallback(async (messageData) => {
    if (!state.currentChatRoom) return;
    
    try {
      const newMessage = await messageApi.sendMessage(state.currentChatRoom.id, messageData);
      dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
      
      // WebSocket 연결 시 실제 전송 (현재는 더미 데이터로 시뮬레이션)
      // TODO: WebSocket 연결 시 실제 서버로 전송
      if (isConnected) {
        sendWebSocketMessage({
          chatRoomId: state.currentChatRoom.id,
          ...messageData
        });
      }
      
      console.log('메시지 전송:', messageData);
      
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  }, [state.currentChatRoom?.id, isConnected, sendWebSocketMessage]);

  const value = {
    ...state,
    isConnected: isConnected || true, // WebSocket 연결 상태 또는 더미 데이터에서는 항상 연결된 상태
    setCurrentChatRoom,
    sendMessage,
    addMessage: (message) => 
      dispatch({ type: 'ADD_MESSAGE', payload: message }),
    setMessages: (messages) => 
      dispatch({ type: 'SET_MESSAGES', payload: messages }),
    setLoading: (loading) => 
      dispatch({ type: 'SET_LOADING', payload: loading })
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};
