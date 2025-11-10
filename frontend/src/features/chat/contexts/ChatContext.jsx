/**
 * ChatContext
 * 채팅 관련 전역 상태 관리 컨텍스트 (더미 데이터 사용)
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef } from 'react';
import { chatApi } from '../api/chatApi';
import { messageApi } from '../api/messageApi';
import { websocketApi } from '../api/websocketApi';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAuth } from '@/features/auth/contexts/AuthContext';

const DEFAULT_MESSAGE_PAGE_SIZE = 20;
const MESSAGE_POLL_SIZE = 20;

const sortMessagesAscending = (messages) => {
  return [...messages].sort((a, b) => {
    const aTime = new Date(a?.timestamp || 0).getTime();
    const bTime = new Date(b?.timestamp || 0).getTime();
    return aTime - bTime;
  });
};

const createMessageKey = (message) => {
  if (!message) return 'undefined';
  if (message.id) return String(message.id);
  const senderId = message.senderId ?? message.sender?.id ?? 'unknown';
  const timestamp = message.timestamp ?? 'no-time';
  const type = message.type ?? 'unknown';
  const content = message.content ?? '';
  return `${senderId}-${timestamp}-${type}-${content}`;
};

const mergeMessages = (existing, incoming) => {
  const map = new Map();

  existing.forEach((message) => {
    const key = createMessageKey(message);
    map.set(key, message);
  });

  incoming.forEach((message) => {
    if (!message) return;
    const key = createMessageKey(message);
    const previous = map.get(key) || {};
    map.set(key, { ...previous, ...message });
  });

  return sortMessagesAscending(Array.from(map.values()));
};

const ChatContext = createContext();

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CURRENT_CHAT_ROOM':
      return {
        ...state,
        currentChatRoom: action.payload
      };
    case 'ADD_MESSAGE': {
      if (!action.payload) return state;
      return {
        ...state,
        messages: mergeMessages(state.messages, [action.payload])
      };
    }
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: mergeMessages([], action.payload)
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
    case 'SET_HAS_MORE_PAST':
      return {
        ...state,
        hasMorePast: action.payload
      };
    default:
      return state;
  }
};

const initialState = {
  currentChatRoom: null,
  messages: [],
  isConnected: false,
  isLoading: false,
  hasMorePast: true
};

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - 자식 컴포넌트
 */
export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const pollingRef = useRef(null);
  const isFetchingPastRef = useRef(false);
  const { connect, disconnect, sendMessage: sendWebSocketMessage, isConnected: socketConnected } = useChatSocket();
  const { user } = useAuth();

  const currentUserId = useMemo(() => {
    return user?.memberId ?? user?.id ?? user?.member_id ?? null;
  }, [user?.memberId, user?.id, user?.member_id]);

  const connectionPromiseRef = useRef(Promise.resolve());
  const connectionResolveRef = useRef(() => {});
  const connectionRejectRef = useRef(() => {});

  const resetConnectionPromise = useCallback(() => {
    connectionPromiseRef.current = new Promise((resolve, reject) => {
      connectionResolveRef.current = resolve;
      connectionRejectRef.current = reject;
    });
  }, []);

  const resolveSenderInfo = useCallback((senderId, chatRoomOverride = null) => {
    if (senderId == null) {
      return {
        id: null,
        nickname: '알 수 없음',
        profileImageUrl: null
      };
    }

    if (currentUserId != null && Number(senderId) === Number(currentUserId)) {
      return {
        id: senderId,
        nickname: user?.nickname || user?.name || '나',
        profileImageUrl: user?.profileImage || user?.profileImageUrl || null
      };
    }

    const activeChatRoom = chatRoomOverride || state.currentChatRoom;

    const other = activeChatRoom?.otherMember;
    if (other && Number(other.id) === Number(senderId)) {
      return {
        id: senderId,
        nickname: other.nickname || other.name || other.username || '상대방',
        profileImageUrl: other.profileImageUrl || other.profileImage || null
      };
    }

    const participant = activeChatRoom?.participants?.find((p) => Number(p?.id) === Number(senderId));
    if (participant) {
      return {
        id: senderId,
        nickname: participant.nickname || participant.name || participant.username || '참여자',
        profileImageUrl: participant.profileImageUrl || participant.profileImage || null
      };
    }

    return {
      id: senderId,
      nickname: '알 수 없음',
      profileImageUrl: null
    };
  }, [currentUserId, state.currentChatRoom?.otherMember, state.currentChatRoom?.participants, user?.nickname, user?.name, user?.profileImage, user?.profileImageUrl]);

  const normalizeMessage = useCallback((rawMessage, chatRoomOverride = null) => {
    if (!rawMessage) return null;

    const type = (rawMessage.type || 'TEXT').toString().toLowerCase();
    const senderId = rawMessage.senderId ?? rawMessage.sender?.id ?? rawMessage.sender_id ?? null;
    const sender = resolveSenderInfo(senderId, chatRoomOverride);

    const timestamp = rawMessage.createdAt || rawMessage.timestamp || new Date().toISOString();
    const replyTo = rawMessage.replyToMessage || rawMessage.replyTo || rawMessage.replyToMessageId || null;

    const message = {
      id: rawMessage.id || `msg_${Date.now()}`,
      chatRoomId: rawMessage.chatRoomId ?? chatRoomOverride?.chatRoomId ?? chatRoomOverride?.id ?? state.currentChatRoom?.chatRoomId ?? state.currentChatRoom?.id ?? null,
      type,
      content: type === 'image' ? (rawMessage.imageUrl || rawMessage.content || '') : rawMessage.content || '',
      imageUrl: rawMessage.imageUrl || null,
      fileUrl: rawMessage.fileUrl || null,
      fileName: rawMessage.fileName || null,
      fileSize: rawMessage.fileSize || null,
      replyTo,
      sender,
      senderId,
      timestamp,
      isRead: rawMessage.isRead ?? false,
      status: rawMessage.status || null
    };

    return message;
  }, [resolveSenderInfo, state.currentChatRoom?.chatRoomId, state.currentChatRoom?.id]);

  const stopMessagePolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollLatestMessages = useCallback(async (roomId, chatRoomData) => {
    try {
      const snapshot = stateRef.current;
      if (!snapshot.currentChatRoom || Number(snapshot.currentChatRoom.chatRoomId ?? snapshot.currentChatRoom.id) !== Number(roomId)) {
        return;
      }

      const currentMessages = snapshot.messages || [];
      const lastMessage = currentMessages[currentMessages.length - 1];
      const params = { size: MESSAGE_POLL_SIZE };
      if (lastMessage?.timestamp) {
        params.after = new Date(lastMessage.timestamp).toISOString();
      }

      const fetched = await messageApi.getMessages(roomId, params);
      const normalized = (fetched || [])
        .map((msg) => normalizeMessage(msg, chatRoomData))
        .filter(Boolean);

      if (normalized.length > 0) {
        normalized.forEach((message) => {
          dispatch({ type: 'ADD_MESSAGE', payload: message });
        });
      }
    } catch (error) {
      console.warn('[ChatContext] 메시지 폴링 실패:', error);
    }
  }, [normalizeMessage]);

  const startMessagePolling = useCallback((roomId, chatRoomData) => {
    stopMessagePolling();

    if (!roomId) return;

    pollLatestMessages(roomId, chatRoomData);

    pollingRef.current = setInterval(() => {
      pollLatestMessages(roomId, chatRoomData);
    }, 2000);
  }, [pollLatestMessages, stopMessagePolling]);

  const loadOlderMessages = useCallback(async () => {
    try {
      const snapshot = stateRef.current;
      if (!snapshot.currentChatRoom) return false;

      const roomId = snapshot.currentChatRoom.chatRoomId || snapshot.currentChatRoom.id;
      if (!roomId) return false;

      if (isFetchingPastRef.current) return false;
      isFetchingPastRef.current = true;

      const existingMessages = snapshot.messages || [];
      const firstMessage = existingMessages[0];

      const params = { size: DEFAULT_MESSAGE_PAGE_SIZE };
      if (firstMessage?.timestamp) {
        params.before = new Date(firstMessage.timestamp).toISOString();
      }

      const fetched = await messageApi.getMessages(roomId, params);
      const normalized = (fetched || [])
        .map((msg) => normalizeMessage(msg, snapshot.currentChatRoom))
        .filter(Boolean);

      if (normalized.length > 0) {
        const merged = mergeMessages(normalized, existingMessages);
        dispatch({ type: 'SET_MESSAGES', payload: merged });
      }

      dispatch({ type: 'SET_HAS_MORE_PAST', payload: normalized.length >= DEFAULT_MESSAGE_PAGE_SIZE });

      return normalized.length > 0;
    } catch (error) {
      console.error('[ChatContext] 과거 메시지 로드 실패:', error);
      return false;
    } finally {
      isFetchingPastRef.current = false;
    }
  }, [normalizeMessage]);

  const searchMessages = useCallback(async ({ keyword, page = 0, size = DEFAULT_MESSAGE_PAGE_SIZE, chatRoomId: overrideRoomId } = {}) => {
    const snapshot = stateRef.current;
    const roomId = overrideRoomId ?? snapshot.currentChatRoom?.chatRoomId ?? snapshot.currentChatRoom?.id;
    if (!roomId) {
      throw new Error('채팅방 ID를 확인할 수 없습니다.');
    }
    if (!keyword || !keyword.trim()) {
      return { results: [], hasMore: false };
    }

    const fetched = await messageApi.getMessages(roomId, {
      keyword: keyword.trim(),
      page,
      size
    });

    const normalized = (fetched || [])
      .map((msg) => normalizeMessage(msg, snapshot.currentChatRoom))
      .filter(Boolean);

    return {
      results: mergeMessages([], normalized),
      hasMore: (fetched?.length ?? 0) >= size
    };
  }, [normalizeMessage]);

  const initializeConnection = useCallback((roomId, chatRoomData) => {
    if (!roomId) {
      return;
    }

    console.log('[ChatContext] WebSocket 연결 시도:', roomId);
    resetConnectionPromise();
    connect(roomId, {
      onMessage: (rawMessage) => {
        const normalized = normalizeMessage(rawMessage, chatRoomData);
        if (normalized) {
          dispatch({ type: 'ADD_MESSAGE', payload: normalized });
        }
      },
      onError: (errorLike) => {
        const error = errorLike instanceof Error ? errorLike : new Error(errorLike?.message || errorLike?.reason || 'WebSocket error');
        console.error('[ChatContext] WebSocket 오류:', errorLike);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
        const reject = connectionRejectRef.current;
        connectionRejectRef.current = () => {};
        connectionResolveRef.current = () => {};
        reject?.(error);
        connectionPromiseRef.current = Promise.resolve();
      },
      onConnect: () => {
        console.log('[ChatContext] WebSocket 연결 성공:', roomId);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        startMessagePolling(roomId, chatRoomData);
        const resolve = connectionResolveRef.current;
        connectionResolveRef.current = () => {};
        connectionRejectRef.current = () => {};
        resolve?.();
      },
      onDisconnect: () => {
        console.log('[ChatContext] WebSocket 연결 종료:', roomId);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
        connectionResolveRef.current = () => {};
        connectionRejectRef.current = () => {};
        connectionPromiseRef.current = Promise.resolve();
        stopMessagePolling();
      }
    });
  }, [connect, normalizeMessage, resetConnectionPromise, startMessagePolling, stopMessagePolling]);

  // 채팅방 설정
  // setCurrentChatRoom(chatRoomId) - API 호출하여 조회
  // setCurrentChatRoom(chatRoomId, chatRoomData) - 전달된 데이터 사용 (생성 직후 등)
  const setCurrentChatRoom = useCallback(async (chatRoomId, chatRoomData = null) => {
    if (!chatRoomId) {
      stopMessagePolling();
      disconnect();
      dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: null });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      connectionPromiseRef.current = Promise.resolve();
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });

      stopMessagePolling();
      disconnect();

      let chatRoom;
      if (chatRoomData) {
        console.log('[ChatContext] 생성된 채팅방 데이터 사용 (조회 API 호출 생략):', chatRoomData);
        chatRoom = chatRoomData;
      } else {
        console.log('[ChatContext] 채팅방 상세 조회 API 호출:', chatRoomId);
        chatRoom = await chatApi.getChatRoomDetail(chatRoomId, { include: 'member' });
      }

      const roomId = chatRoom?.chatRoomId || chatRoomId;

      const normalizedChatRoom = (() => {
        const name = chatRoom.name
          || chatRoom.otherMemberNickname
          || chatRoom.productTitle
          || `채팅방 ${roomId}`;

        const otherMember = {
          id: chatRoom.otherMemberId,
          nickname: chatRoom.otherMemberNickname,
          profileImageUrl: chatRoom.otherMemberProfileUrl,
          isOnline: chatRoom.member?.isOnline ?? null,
          lastSeenAt: chatRoom.member?.lastSeenAt ?? null,
        };

        const participants = chatRoom.participants
          || (chatRoom.otherMemberId ? [
              {
                id: chatRoom.otherMemberId,
                nickname: chatRoom.otherMemberNickname,
                profileImage: chatRoom.otherMemberProfileUrl,
              },
            ] : []);

        return {
          ...chatRoom,
          id: chatRoom.chatRoomId || chatRoom.id || roomId,
          chatRoomId: roomId,
          name,
          participants,
          otherMember,
        };
      })();

      const messages = await messageApi.getMessages(roomId, { size: DEFAULT_MESSAGE_PAGE_SIZE });
      const normalizedMessages = mergeMessages([], (messages || [])
        .map((msg) => normalizeMessage(msg, normalizedChatRoom))
        .filter(Boolean));

      dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: normalizedChatRoom });
      dispatch({ type: 'SET_MESSAGES', payload: normalizedMessages });
      dispatch({ type: 'SET_HAS_MORE_PAST', payload: (messages?.length ?? 0) >= DEFAULT_MESSAGE_PAGE_SIZE });

      initializeConnection(roomId, normalizedChatRoom);

      try {
        websocketApi.sendReadReceipt(roomId);
      } catch (readError) {
        console.warn('[ChatContext] 읽음 처리 실패:', readError);
      }
    } catch (error) {
      console.error('채팅방 로드 실패:', error);
      stopMessagePolling();
      dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: null });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });

      const reject = connectionRejectRef.current;
      connectionRejectRef.current = () => {};
      connectionResolveRef.current = () => {};
      reject?.(error);
      connectionPromiseRef.current = Promise.resolve();

      disconnect();
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [disconnect, initializeConnection, normalizeMessage, stopMessagePolling]);

  // 메시지 전송
  const sendMessage = useCallback(async (messageData) => {
    if (!state.currentChatRoom) return;
    
    try {
      const roomId = state.currentChatRoom.chatRoomId || state.currentChatRoom.id;
      if (!roomId) throw new Error('채팅방 ID를 확인할 수 없습니다.');

      const payload = {
        type: (messageData.type || 'TEXT').toUpperCase(),
        content: messageData.content ?? '',
        imageUrl: messageData.imageUrl ?? null,
        fileUrl: messageData.fileUrl ?? null,
        fileName: messageData.fileName ?? null,
        fileSize: messageData.fileSize ?? null,
        replyToMessageId: messageData.replyToMessageId ?? messageData.replyTo ?? null
      };

      if (!socketConnected || !websocketApi.isConnected?.()) {
        console.warn('WebSocket 연결을 기다리는 중입니다.');
        await connectionPromiseRef.current;
      }

      const optimisticMessage = {
        id: `temp_${Date.now()}`,
        chatRoomId: roomId,
        type: payload.type.toLowerCase(),
        content: payload.content,
        imageUrl: payload.imageUrl,
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        replyTo: payload.replyToMessageId,
        senderId: currentUserId,
        sender: resolveSenderInfo(currentUserId, state.currentChatRoom),
        timestamp: new Date().toISOString(),
        isRead: true,
        status: 'pending'
      };

      dispatch({ type: 'ADD_MESSAGE', payload: optimisticMessage });

      sendWebSocketMessage(roomId, payload);
      console.log('[ChatContext] 메시지 전송 요청:', payload);

      try {
        websocketApi.sendReadReceipt(roomId);
      } catch (readError) {
        console.warn('[ChatContext] 읽음 처리 실패:', readError);
      }

      try {
        const refreshed = await messageApi.getMessages(roomId, { size: 50 });
        const normalized = sortMessagesAscending((refreshed || [])
          .map((msg) => normalizeMessage(msg, state.currentChatRoom))
          .filter(Boolean));
        if (normalized.length > 0) {
          dispatch({ type: 'SET_MESSAGES', payload: normalized });
        }
      } catch (refreshError) {
        console.warn('메시지 새로고침 실패:', refreshError);
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      throw error;
    }
  }, [currentUserId, normalizeMessage, resolveSenderInfo, sendWebSocketMessage, socketConnected, state.currentChatRoom]);

  const derivedOnlineStatus = state.currentChatRoom?.otherMember?.isOnline;

  const value = {
    ...state,
    isConnected: state.isConnected || socketConnected || (typeof derivedOnlineStatus === 'boolean' ? derivedOnlineStatus : false),
    setCurrentChatRoom,
    sendMessage,
    loadOlderMessages,
    hasMorePast: state.hasMorePast,
    searchMessages,
    addMessage: (message) => 
      dispatch({ type: 'ADD_MESSAGE', payload: message }),
    setMessages: (messages) => 
      dispatch({ type: 'SET_MESSAGES', payload: sortMessagesAscending(messages) }),
    setLoading: (loading) =>
      dispatch({ type: 'SET_LOADING', payload: loading })
  };

  useEffect(() => {
    return () => {
      stopMessagePolling();
    };
  }, [stopMessagePolling]);

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
