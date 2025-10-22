/**
 * ChatContext
 * 채팅 관련 전역 상태 관리 컨텍스트
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
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
  const { connect, disconnect, sendMessage, isConnected } = useChatSocket();

  useEffect(() => {
    if (state.currentChatRoom) {
      connect(state.currentChatRoom.id, (message) => {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
      });
    }

    return () => {
      disconnect();
    };
  }, [state.currentChatRoom, connect, disconnect]);

  const value = {
    ...state,
    isConnected,
    setCurrentChatRoom: (chatRoom) => 
      dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: chatRoom }),
    addMessage: (message) => 
      dispatch({ type: 'ADD_MESSAGE', payload: message }),
    setMessages: (messages) => 
      dispatch({ type: 'SET_MESSAGES', payload: messages }),
    sendMessage: (content) => 
      sendMessage({ content, chatRoomId: state.currentChatRoom?.id }),
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
