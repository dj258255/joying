/**
 * ChatContext
 * 채팅 관련 전역 상태 관리 컨텍스트 (더미 데이터 사용)
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { messageApi } from '../api/messageApi';
import { websocketApi } from '../api/websocketApi';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

const DEFAULT_MESSAGE_PAGE_SIZE = 20;

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
    if (!message) return;
    // ID가 있으면 ID를 키로 사용, 없으면 createMessageKey 사용
    const key = message.id ? String(message.id) : createMessageKey(message);
    map.set(key, message);
  });

  incoming.forEach((message) => {
    if (!message) return;
    // ID가 있으면 ID를 키로 사용, 없으면 createMessageKey 사용
    const key = message.id ? String(message.id) : createMessageKey(message);
    const existingMessage = map.get(key);
    
    // 같은 ID를 가진 메시지가 있으면 기존 메시지를 유지 (중복 방지)
    // 단, 임시 메시지(temp_로 시작)는 실제 메시지로 교체
    if (existingMessage) {
      const isExistingTemp = existingMessage.id && existingMessage.id.startsWith('temp_');
      const isIncomingReal = message.id && !message.id.startsWith('temp_');
      
      if (isExistingTemp && isIncomingReal) {
        // 임시 메시지를 실제 메시지로 교체
        map.set(key, message);
      }
      // 그 외의 경우는 기존 메시지 유지 (중복 방지)
    } else {
      map.set(key, message);
    }
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
    case 'REPLACE_MESSAGE': {
      const { oldId, newMessage } = action.payload;
      if (!newMessage) return state;
      const messageIndex = state.messages.findIndex((msg) => msg.id === oldId);
      if (messageIndex === -1) {
        // 임시 메시지를 찾지 못하면 그냥 추가
        return {
          ...state,
          messages: mergeMessages(state.messages, [newMessage])
        };
      }
      const updatedMessages = [...state.messages];
      updatedMessages[messageIndex] = newMessage;
      return {
        ...state,
        messages: sortMessagesAscending(updatedMessages)
      };
    }
    case 'UPDATE_MESSAGE': {
      const updatedMessage = action.payload;
      if (!updatedMessage || !updatedMessage.id) return state;
      const messageIndex = state.messages.findIndex((msg) => msg.id === updatedMessage.id);
      if (messageIndex === -1) {
        // 메시지를 찾지 못하면 추가
        return {
          ...state,
          messages: mergeMessages(state.messages, [updatedMessage])
        };
      }
      const updatedMessages = [...state.messages];
      updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updatedMessage };
      return {
        ...state,
        messages: sortMessagesAscending(updatedMessages)
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
    case 'SET_TYPING':
      return {
        ...state,
        typingMemberId: action.payload
      };
    case 'SET_LAST_READ_AT':
      return {
        ...state,
        lastReadAt: action.payload
      };
    case 'MARK_MESSAGES_AS_READ':
      // 마지막 메시지만 읽음 표시 표시 (생겼다 사라지는 형태)
      const { readAt, currentUserId } = action.payload;
      if (!readAt) return state;
      const readTimestamp = new Date(readAt).getTime();
      
      // 내가 보낸 메시지 중 가장 마지막 메시지 찾기
      const ownMessages = state.messages
        .filter((msg) => {
          const isOwnMessage = currentUserId != null && Number(msg.senderId) === Number(currentUserId);
          const msgTimestamp = new Date(msg.timestamp || 0).getTime();
          return isOwnMessage && msgTimestamp <= readTimestamp;
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      const lastOwnMessage = ownMessages[0];
      
      const updatedMessages = state.messages.map((msg) => {
        // 마지막 메시지만 읽음 표시 표시
        if (lastOwnMessage && msg.id === lastOwnMessage.id) {
          return { ...msg, isRead: true, showReadIndicator: true };
        }
        // 나머지 메시지는 읽음 상태만 업데이트 (표시는 숨김)
        const isOwnMessage = currentUserId != null && Number(msg.senderId) === Number(currentUserId);
        const msgTimestamp = new Date(msg.timestamp || 0).getTime();
        if (isOwnMessage && msgTimestamp <= readTimestamp) {
          return { ...msg, isRead: true, showReadIndicator: false };
        }
        return msg;
      });
      
      return {
        ...state,
        messages: updatedMessages,
        lastReadAt: readAt
      };
    case 'SHOW_READ_INDICATOR_FOR_MESSAGE':
      // 특정 메시지의 읽음 표시 표시
      const { messageId: showMessageId } = action.payload;
      return {
        ...state,
        messages: state.messages.map((msg) => 
          msg.id === showMessageId ? { ...msg, showReadIndicator: true, isRead: true } : msg
        )
      };
    case 'HIDE_READ_INDICATOR':
      // 특정 메시지의 읽음 표시 숨기기 (일시적 표시만 숨김, isRead는 유지)
      const { messageId } = action.payload;
      return {
        ...state,
        messages: state.messages.map((msg) => 
          msg.id === messageId ? { ...msg, showReadIndicator: false } : msg
        )
      };
    case 'HIDE_ALL_READ_INDICATORS':
      // 모든 읽음 표시 숨기기 (일시적 표시만 숨김, isRead는 유지)
      return {
        ...state,
        messages: state.messages.map((msg) => 
          msg.showReadIndicator ? { ...msg, showReadIndicator: false } : msg
        )
      };
    case 'UPDATE_OPPONENT_ONLINE_STATUS':
      // 상대방 온라인 상태 업데이트
      const { isOnline, lastSeenAt } = action.payload;
      if (!state.currentChatRoom?.otherMember) return state;
      return {
        ...state,
        currentChatRoom: {
          ...state.currentChatRoom,
          otherMember: {
            ...state.currentChatRoom.otherMember,
            isOnline: isOnline ?? state.currentChatRoom.otherMember.isOnline,
            lastSeenAt: lastSeenAt ?? state.currentChatRoom.otherMember.lastSeenAt
          }
        }
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
  hasMorePast: true,
  typingMemberId: null, // 타이핑 중인 사용자 ID
  lastReadAt: null // 마지막 읽은 시간 (상대방이 읽은 시간)
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
  const isFetchingPastRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const readIndicatorTimeoutsRef = useRef(new Map()); // 메시지별 읽음 표시 타이머
  const heartbeatIntervalRef = useRef(null); // Heartbeat 주기 전송 타이머
  const queryClient = useQueryClient();
  const { connect, disconnect, sendMessage: sendWebSocketMessage, sendTyping: sendTypingEvent, isConnected: socketConnected } = useChatSocket();
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
    
    // 답장 정보 정규화
    let replyTo = null;
    let replyToMessageId = rawMessage.replyToMessageId || null;
    
    if (rawMessage.replyTo) {
      // 백엔드에서 ReplyMessageInfo 객체로 온 경우
      if (typeof rawMessage.replyTo === 'object' && rawMessage.replyTo !== null) {
        const replySenderId = rawMessage.replyTo.senderId;
        const replySender = resolveSenderInfo(replySenderId, chatRoomOverride);
        const replyId = rawMessage.replyTo.id || null;
        replyTo = {
          id: replyId,
          senderId: replySenderId,
          sender: replySender,
          content: rawMessage.replyTo.content || (rawMessage.replyTo.isDeleted ? '삭제된 메시지입니다.' : null),
          isDeleted: rawMessage.replyTo.isDeleted || false
        };
        // replyToMessageId가 없으면 replyTo.id를 사용
        if (!replyToMessageId && replyId) {
          replyToMessageId = replyId;
        }
      } else {
        // 단순 ID인 경우 (기존 호환성)
        replyTo = rawMessage.replyTo;
        if (!replyToMessageId) {
          replyToMessageId = typeof replyTo === 'string' ? replyTo : null;
        }
      }
    } else if (rawMessage.replyToMessageId) {
      // replyToMessageId만 있는 경우
      replyTo = rawMessage.replyToMessageId;
      replyToMessageId = rawMessage.replyToMessageId;
    } else if (rawMessage.replyToMessage) {
      // replyToMessage 객체인 경우
      if (typeof rawMessage.replyToMessage === 'object' && rawMessage.replyToMessage !== null) {
        const replySenderId = rawMessage.replyToMessage.senderId || rawMessage.replyToMessage.sender?.id;
        const replySender = resolveSenderInfo(replySenderId, chatRoomOverride);
        const replyId = rawMessage.replyToMessage.id || rawMessage.replyToMessageId || null;
        replyTo = {
          id: replyId,
          senderId: replySenderId,
          sender: replySender,
          content: rawMessage.replyToMessage.content || (rawMessage.replyToMessage.isDeleted ? '삭제된 메시지입니다.' : null),
          isDeleted: rawMessage.replyToMessage.isDeleted || false
        };
        if (!replyToMessageId && replyId) {
          replyToMessageId = replyId;
        }
      } else {
        replyTo = rawMessage.replyToMessage;
        if (!replyToMessageId) {
          replyToMessageId = typeof replyTo === 'string' ? replyTo : null;
        }
      }
    }

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
      replyToMessageId: replyToMessageId,
      sender,
      senderId,
      timestamp,
      isRead: rawMessage.isRead ?? false,
      showReadIndicator: false, // 일시적 읽음 표시 (기본값: 숨김)
      isDeleted: rawMessage.isDeleted ?? false,
      isEdited: rawMessage.isEdited ?? false,
      status: rawMessage.status || null
    };

    return message;
  }, [resolveSenderInfo, state.currentChatRoom?.chatRoomId, state.currentChatRoom?.id]);

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

  // 메시지 점프 (특정 메시지 주변 조회)
  const jumpToMessage = useCallback(async (messageId, options = {}) => {
    const snapshot = stateRef.current;
    const roomId = snapshot.currentChatRoom?.chatRoomId ?? snapshot.currentChatRoom?.id;
    if (!roomId) {
      throw new Error('채팅방 ID를 확인할 수 없습니다.');
    }
    if (!messageId) {
      throw new Error('메시지 ID가 필요합니다.');
    }

    try {
      const { before = 20, after = 20 } = options;
      
      // 메시지 주변 조회 API 호출
      const fetched = await messageApi.getMessagesAround(roomId, messageId, { before, after });
      
      // 메시지 정규화
      const normalized = (fetched || [])
        .map((msg) => normalizeMessage(msg, snapshot.currentChatRoom))
        .filter(Boolean);

      // 기존 메시지와 병합 (교체하지 않고 추가)
      const existingMessages = snapshot.messages || [];
      const mergedMessages = mergeMessages(existingMessages, normalized);

      // 병합된 메시지 목록 설정
      dispatch({ type: 'SET_MESSAGES', payload: mergedMessages });

      // 하이라이트할 메시지 ID 반환 (스크롤 및 하이라이트는 호출하는 컴포넌트에서 처리)
      return {
        success: true,
        messageId,
        messages: mergedMessages,
        targetMessageIndex: mergedMessages.findIndex(msg => String(msg.id) === String(messageId))
      };
    } catch (error) {
      console.error('[ChatContext] 메시지 점프 실패:', error);
      throw error;
    }
  }, [normalizeMessage]);

  // 채팅 목록 업데이트 (lastMessage, lastMessageAt, unreadCount)
  // initializeConnection보다 먼저 정의되어야 함
  const updateChatRoomList = useCallback((message, shouldMarkAsRead = false) => {
    if (!message || !message.chatRoomId) return;
    
    const roomId = message.chatRoomId;
    queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], (oldData) => {
      if (!oldData || !oldData.chatRooms) return oldData;
      
      const chatRooms = [...oldData.chatRooms];
      const roomIndex = chatRooms.findIndex(
        (room) => (room.chatRoomId || room.id) === roomId
      );
      
      if (roomIndex === -1) return oldData;
      
      const room = chatRooms[roomIndex];
      const isOwnMessage = Number(message.senderId) === Number(currentUserId);
      
      // lastMessage와 lastMessageAt 업데이트 (실시간으로 미리보기 업데이트)
      const lastMessage = message.type === 'image' 
        ? '[이미지]' 
        : message.type === 'file'
        ? `[파일] ${message.fileName || '파일'}`
        : message.content || '';
      const lastMessageAt = message.timestamp || new Date().toISOString();
      
      // unreadCount 업데이트
      let unreadCount = room.unreadCount || 0;
      if (isOwnMessage) {
        // 내가 보낸 메시지는 unreadCount에 영향 없음
        // (상대방이 읽지 않은 내 메시지는 메시지 아래에 "1"로 표시됨)
      } else {
        // 상대방이 보낸 메시지 (내가 읽지 않은 메시지 개수)
        if (shouldMarkAsRead) {
          // 채팅방에 진입해서 읽음 처리한 경우 unreadCount를 0으로 설정
          unreadCount = 0;
        } else {
          // 새로 받은 메시지면 unreadCount 증가
          unreadCount = (unreadCount || 0) + 1;
        }
      }
      
      chatRooms[roomIndex] = {
        ...room,
        lastMessage,
        lastMessageAt,
        unreadCount
      };
      
      // 최신 활동 순으로 정렬 (고정 채팅방 우선)
      chatRooms.sort((a, b) => {
        const aPinned = !!a.isPinned;
        const bPinned = !!b.isPinned;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        const aTime = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
        const bTime = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
        return bTime - aTime;
      });
      
      // totalUnreadCount 계산
      const totalUnreadCount = chatRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
      
      return {
        ...oldData,
        chatRooms,
        totalUnreadCount
      };
    });
  }, [queryClient, currentUserId]);

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
          // 본인이 보낸 메시지이고 임시 메시지가 있으면 교체, 아니면 추가
          const snapshot = stateRef.current;
          const isOwnMessage = Number(normalized.senderId) === Number(currentUserId);
          
          // 상대방이 메시지를 보냈으면 온라인 상태로 업데이트
          if (!isOwnMessage) {
            dispatch({ 
              type: 'UPDATE_OPPONENT_ONLINE_STATUS', 
              payload: { isOnline: true, lastSeenAt: null } 
            });
          }
          
          if (isOwnMessage) {
            // 임시 메시지(temp_로 시작하거나 status가 'sending'/'pending'인 메시지) 찾기
            const tempMessage = snapshot.messages.find(
              (msg) => 
                (msg.id && msg.id.startsWith('temp_')) || 
                (msg.status === 'sending' || msg.status === 'pending') &&
                Number(msg.senderId) === Number(currentUserId) &&
                msg.content === normalized.content &&
                Math.abs(new Date(msg.timestamp) - new Date(normalized.timestamp)) < 5000 // 5초 이내
            );
            
            if (tempMessage) {
              // 임시 메시지를 실제 메시지로 교체
              dispatch({ type: 'REPLACE_MESSAGE', payload: { oldId: tempMessage.id, newMessage: normalized } });
              return;
            }
          }
          
          // 메시지 업데이트 (수정/삭제된 메시지 처리)
          const existingMessage = snapshot.messages.find((msg) => msg.id === normalized.id);
          if (existingMessage) {
            // 기존 메시지가 있으면 업데이트 (수정 또는 삭제 상태 반영)
            dispatch({ type: 'UPDATE_MESSAGE', payload: normalized });
            // 채팅 목록 업데이트 (lastMessage는 변경될 수 있으므로 업데이트)
            // 메시지 수정/삭제는 unreadCount에 영향 없음
            updateChatRoomList(normalized, false);
          } else {
            // 새 메시지 추가
            dispatch({ type: 'ADD_MESSAGE', payload: normalized });
            // 채팅 목록 업데이트
            // 새 메시지는 읽지 않은 상태로 처리 (채팅방에 진입해서 읽음 처리하면 shouldMarkAsRead=true로 호출됨)
            updateChatRoomList(normalized, false);
          }
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
        const resolve = connectionResolveRef.current;
        connectionResolveRef.current = () => {};
        connectionRejectRef.current = () => {};
        resolve?.();
        
        // Heartbeat 시작 (30초마다 전송)
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // 초기 Heartbeat 즉시 전송
        websocketApi.sendHeartbeat();
        
        // 30초마다 Heartbeat 전송
        heartbeatIntervalRef.current = setInterval(() => {
          websocketApi.sendHeartbeat();
        }, 30000);
      },
      onDisconnect: () => {
        console.log('[ChatContext] WebSocket 연결 종료:', roomId);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
        // 타이핑 상태 초기화
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        dispatch({ type: 'SET_TYPING', payload: null });
        // 읽음 표시 타이머 정리
        readIndicatorTimeoutsRef.current.forEach((timeout) => {
          clearTimeout(timeout);
        });
        readIndicatorTimeoutsRef.current.clear();
        // Heartbeat interval 정리
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        connectionResolveRef.current = () => {};
        connectionRejectRef.current = () => {};
        connectionPromiseRef.current = Promise.resolve();
      },
      onTyping: (typingEvent) => {
        // 본인의 타이핑 알림은 무시
        if (typingEvent.memberId && Number(typingEvent.memberId) === Number(currentUserId)) {
          return;
        }
        
        // 상대방이 타이핑 중이면 온라인 상태로 업데이트
        if (typingEvent.isTyping) {
          dispatch({ 
            type: 'UPDATE_OPPONENT_ONLINE_STATUS', 
            payload: { isOnline: true, lastSeenAt: null } 
          });
        }
        
        // 타이핑 상태 설정
        if (typingEvent.isTyping) {
          dispatch({ type: 'SET_TYPING', payload: typingEvent.memberId });
          
          // 기존 타이머가 있으면 취소
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          // 3초 후 타이핑 상태 숨기기
          typingTimeoutRef.current = setTimeout(() => {
            dispatch({ type: 'SET_TYPING', payload: null });
            typingTimeoutRef.current = null;
          }, 3000);
        } else {
          // isTyping이 false면 즉시 숨기기
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
          dispatch({ type: 'SET_TYPING', payload: null });
        }
      },
      onRead: (readEvent) => {
        // 본인의 읽음 알림은 무시
        if (readEvent.memberId && Number(readEvent.memberId) === Number(currentUserId)) {
          return;
        }
        
        // 상대방이 읽은 시간 이전의 내가 보낸 메시지를 읽음 처리
        if (readEvent.readAt) {
          // readAt이 Unix timestamp (milliseconds)인 경우 Date로 변환
          const readAt = typeof readEvent.readAt === 'number' 
            ? new Date(readEvent.readAt).toISOString()
            : readEvent.readAt;
          
          // 마지막 메시지만 읽음 표시 표시
          dispatch({ 
            type: 'MARK_MESSAGES_AS_READ', 
            payload: { readAt, currentUserId } 
          });
          
          // 3초 후 읽음 표시 숨기기
          setTimeout(() => {
            const snapshot = stateRef.current;
            const ownMessages = snapshot.messages
              .filter((msg) => {
                const isOwnMessage = currentUserId != null && Number(msg.senderId) === Number(currentUserId);
                const msgTimestamp = new Date(msg.timestamp || 0).getTime();
                const readTimestamp = new Date(readAt).getTime();
                return isOwnMessage && msgTimestamp <= readTimestamp;
              })
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            const lastOwnMessage = ownMessages[0];
            if (lastOwnMessage && lastOwnMessage.showReadIndicator) {
              dispatch({ 
                type: 'HIDE_READ_INDICATOR', 
                payload: { messageId: lastOwnMessage.id } 
              });
            }
          }, 3000);
        }
      }
    });
  }, [connect, normalizeMessage, resetConnectionPromise, currentUserId, queryClient, updateChatRoomList, stateRef]);

  // 채팅방 설정
  // setCurrentChatRoom(chatRoomId) - API 호출하여 조회
  // setCurrentChatRoom(chatRoomId, chatRoomData) - 전달된 데이터 사용 (생성 직후 등)
  const setCurrentChatRoom = useCallback(async (chatRoomId, chatRoomData = null) => {
    if (!chatRoomId) {
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

      // 본인이 나간 상태(isLeft=true)인지 확인하여 접근 차단
      if (chatRoom.isLeft === true) {
        console.warn('[ChatContext] 본인이 나간 채팅방에 접근 시도. 접근 차단.');
        dispatch({ type: 'SET_LOADING', payload: false });
        throw new Error('나간 채팅방입니다. 채팅방 목록으로 이동합니다.');
      }

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
          isLeft: chatRoom.otherMemberIsLeft ?? false, // 상대방이 나갔는지 여부
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

      // 상대방이 나간 상태인지 확인하여 시스템 메시지 추가
      const otherMemberIsLeft = normalizedChatRoom.otherMember?.isLeft ?? false;
      if (otherMemberIsLeft) {
        // 이미 "상대방이 나갔습니다" 메시지가 있는지 확인
        const hasLeaveMessage = normalizedMessages.some(
          msg => msg.type === 'system' && msg.content?.includes('나갔습니다')
        );
        
        if (!hasLeaveMessage) {
          // 시스템 메시지 추가
          const leaveSystemMessage = {
            id: `system-leave-${roomId}-${Date.now()}`,
            type: 'system',
            content: `${normalizedChatRoom.otherMember?.nickname || '상대방'}이 나갔습니다`,
            timestamp: new Date().toISOString(),
            chatRoomId: roomId,
            senderId: null,
            sender: null,
            isOwn: false,
            isRead: true,
            showReadIndicator: false,
          };
          normalizedMessages.push(leaveSystemMessage);
        }
      }

      dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: normalizedChatRoom });
      dispatch({ type: 'SET_MESSAGES', payload: normalizedMessages });
      dispatch({ type: 'SET_HAS_MORE_PAST', payload: (messages?.length ?? 0) >= DEFAULT_MESSAGE_PAGE_SIZE });

      initializeConnection(roomId, normalizedChatRoom);

      // 채팅 목록의 unreadCount를 0으로 업데이트
      // 마지막 메시지가 있으면 updateChatRoomList를 사용하여 일관성 유지
      const lastMessage = normalizedMessages[normalizedMessages.length - 1];
      if (lastMessage) {
        // 읽음 처리로 표시 (shouldMarkAsRead = true)
        updateChatRoomList(lastMessage, true);
      } else {
        // 메시지가 없어도 unreadCount를 0으로 설정
        queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], (oldData) => {
          if (!oldData || !oldData.chatRooms) return oldData;
          
          const chatRooms = oldData.chatRooms.map((room) => {
            if ((room.chatRoomId || room.id) === roomId) {
              return { ...room, unreadCount: 0 };
            }
            return room;
          });
          
          const totalUnreadCount = chatRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
            
            return {
              ...oldData,
              chatRooms,
              totalUnreadCount
            };
          });
        }
      
      // WebSocket 연결이 완료된 후 읽음 처리
      connectionPromiseRef.current
        .then(() => {
          // 연결이 완료되면 읽음 처리
          if (socketConnected || websocketApi.isConnected?.()) {
            try {
              websocketApi.sendReadReceipt(roomId);
            } catch (readError) {
              console.warn('[ChatContext] 읽음 처리 실패:', readError);
            }
          }
        })
        .catch((error) => {
          // 연결 실패 시 조용히 처리 (오류 로그만 남기지 않음)
          // WebSocket 연결이 실패했을 때는 읽음 처리를 시도하지 않음
        });
    } catch (error) {
      console.error('채팅방 로드 실패:', error);
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
  }, [disconnect, initializeConnection, normalizeMessage, updateChatRoomList, queryClient]);

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
        isRead: false, // 상대방이 읽기 전이므로 false
        status: 'pending'
      };

      dispatch({ type: 'ADD_MESSAGE', payload: optimisticMessage });
      
      // 채팅 목록 업데이트 (내가 보낸 메시지이므로 읽음 처리하지 않음, 상대방이 읽을 때까지)
      updateChatRoomList(optimisticMessage, false);

      sendWebSocketMessage(roomId, payload);
      console.log('[ChatContext] 메시지 전송 요청:', payload);

      // 상대방이 채팅방에 있는 경우 (typingMemberId가 있으면) 읽음 표시를 즉시 표시했다가 사라지게
      const snapshot = stateRef.current;
      const isOpponentInRoom = snapshot.typingMemberId != null;
      
      if (isOpponentInRoom) {
        // 즉시 읽음 표시 표시
        dispatch({ 
          type: 'SHOW_READ_INDICATOR_FOR_MESSAGE', 
          payload: { messageId: optimisticMessage.id } 
        });
        
        // 2초 후 읽음 표시 숨기기
        setTimeout(() => {
          dispatch({ 
            type: 'HIDE_READ_INDICATOR', 
            payload: { messageId: optimisticMessage.id } 
          });
        }, 2000);
      }

      // WebSocket 연결이 완료된 후 읽음 처리
      connectionPromiseRef.current
        .then(() => {
          if (socketConnected || websocketApi.isConnected?.()) {
            try {
              websocketApi.sendReadReceipt(roomId);
            } catch (readError) {
              console.warn('[ChatContext] 읽음 처리 실패:', readError);
            }
          }
        })
        .catch((error) => {
          // 연결 실패 시 조용히 처리 (오류 로그만 남기지 않음)
          // WebSocket 연결이 실패했을 때는 읽음 처리를 시도하지 않음
        });

      // WebSocket을 통해 서버에서 메시지가 자동으로 수신됨
      // 메시지 전송 후 자동 스크롤을 위해 약간의 지연 후 스크롤
      setTimeout(() => {
        // ChatRoomPage의 scrollToBottom을 호출하기 위해 이벤트 발생
        window.dispatchEvent(new CustomEvent('chat:message-sent'));
      }, 100);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      throw error;
    }
  }, [currentUserId, resolveSenderInfo, sendWebSocketMessage, socketConnected, state.currentChatRoom, updateChatRoomList]);

  // 메시지 삭제
  const deleteMessage = useCallback(async (messageId) => {
    const snapshot = stateRef.current;
    if (!snapshot.currentChatRoom) {
      throw new Error('채팅방이 선택되지 않았습니다.');
    }

    const roomId = snapshot.currentChatRoom.chatRoomId || snapshot.currentChatRoom.id;
    if (!roomId) {
      throw new Error('채팅방 ID를 확인할 수 없습니다.');
    }

    try {
      // Optimistic update: 먼저 UI에 반영
      const existingMessages = snapshot.messages || [];
      const optimisticDeleted = existingMessages.map((msg) => {
        if (msg.id === messageId) {
          // 이미지 메시지의 경우 타입을 유지하면서 삭제 표시
          if (msg.type === 'image' || msg.type === 'file') {
            return { ...msg, isDeleted: true, status: 'deleting' };
          }
          return { ...msg, isDeleted: true, content: '삭제된 메시지입니다.', status: 'deleting' };
        }
        return msg;
      });
      dispatch({ type: 'SET_MESSAGES', payload: optimisticDeleted });

      // API 호출
      await messageApi.deleteMessage(roomId, messageId);
      
      // 서버 응답 후 최종 업데이트 (isDeleted: true로 확정)
      const finalMessages = (stateRef.current.messages || []).map((msg) => {
        if (msg.id === messageId) {
          // 이미지/파일 메시지의 경우 타입을 유지하면서 삭제 표시
          if (msg.type === 'image' || msg.type === 'file') {
            return { ...msg, isDeleted: true, status: null };
          }
          return { ...msg, isDeleted: true, content: '삭제된 메시지입니다.', status: null };
        }
        return msg;
      });
      dispatch({ type: 'SET_MESSAGES', payload: finalMessages });

      // WebSocket을 통해 서버에서 삭제된 메시지가 자동으로 수신되면 다시 업데이트됨
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      // 실패 시 Optimistic update 롤백
      const currentMessages = stateRef.current.messages || [];
      const rollbackMessages = currentMessages.map((msg) => {
        if (msg.id === messageId && msg.status === 'deleting') {
          // 삭제 상태 제거 (원래 상태로 복구)
          const { status, ...rest } = msg;
          return { ...rest, isDeleted: false };
        }
        return msg;
      });
      dispatch({ type: 'SET_MESSAGES', payload: rollbackMessages });
      throw error;
    }
  }, []);

  // 메시지 수정
  const updateMessage = useCallback(async (messageId, content) => {
    const snapshot = stateRef.current;
    if (!snapshot.currentChatRoom) {
      throw new Error('채팅방이 선택되지 않았습니다.');
    }

    const roomId = snapshot.currentChatRoom.chatRoomId || snapshot.currentChatRoom.id;
    if (!roomId) {
      throw new Error('채팅방 ID를 확인할 수 없습니다.');
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('메시지 내용이 필요합니다.');
    }

    try {
      // Optimistic update: 먼저 UI에 반영
      const existingMessages = snapshot.messages || [];
      const messageIndex = existingMessages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        const optimisticUpdated = existingMessages.map((msg, index) => {
          if (index === messageIndex) {
            return { ...msg, content: content.trim(), isEdited: true, status: 'updating' };
          }
          return msg;
        });
        dispatch({ type: 'SET_MESSAGES', payload: optimisticUpdated });
      }

      // API 호출
      const updatedMessage = await messageApi.updateMessage(roomId, messageId, content);
      
      // 서버 응답으로 최종 업데이트
      const normalized = normalizeMessage(updatedMessage, snapshot.currentChatRoom);
      if (normalized) {
        const finalMessages = (stateRef.current.messages || []).map((msg) => {
          if (msg.id === messageId) {
            return normalized;
          }
          return msg;
        });
        dispatch({ type: 'SET_MESSAGES', payload: finalMessages });
      }

      // WebSocket을 통해 서버에서 수정된 메시지가 자동으로 수신되면 다시 업데이트됨
    } catch (error) {
      console.error('메시지 수정 실패:', error);
      // 실패 시 Optimistic update 롤백
      const rollbackMessages = snapshot.messages.map((msg) => {
        if (msg.id === messageId && msg.status === 'updating') {
          return { ...msg, status: null };
        }
        return msg;
      });
      dispatch({ type: 'SET_MESSAGES', payload: rollbackMessages });
      throw error;
    }
  }, [normalizeMessage]);

  // 파일 업로드
  const uploadFile = useCallback(async (file) => {
    const snapshot = stateRef.current;
    if (!snapshot.currentChatRoom) {
      throw new Error('채팅방이 선택되지 않았습니다.');
    }

    const roomId = snapshot.currentChatRoom.chatRoomId || snapshot.currentChatRoom.id;
    if (!roomId) {
      throw new Error('채팅방 ID를 확인할 수 없습니다.');
    }

    try {
      // 파일 업로드 API 호출
      const fileData = await messageApi.uploadFile(roomId, file);
      
      // 파일 업로드 후 메시지 전송
      const messageType = fileData.fileType === 'IMAGE' ? 'IMAGE' : 'FILE';
      const payload = {
        type: messageType,
        content: fileData.url,
        imageUrl: messageType === 'IMAGE' ? fileData.url : null,
        fileUrl: messageType === 'FILE' ? fileData.url : null,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize
      };

      await sendMessage(payload);
      return fileData;
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      throw error;
    }
  }, [sendMessage]);

  const derivedOnlineStatus = state.currentChatRoom?.otherMember?.isOnline;

  // 타이핑 이벤트 전송
  const sendTyping = useCallback(() => {
    const snapshot = stateRef.current;
    if (!snapshot.currentChatRoom) {
      return;
    }
    const roomId = snapshot.currentChatRoom.chatRoomId || snapshot.currentChatRoom.id;
    if (!roomId) {
      return;
    }
    try {
      sendTypingEvent(roomId);
    } catch (error) {
      console.warn('[ChatContext] 타이핑 이벤트 전송 실패:', error);
    }
  }, [sendTypingEvent]);

  // 읽음 처리 전송
  const sendReadReceipt = useCallback(() => {
    const snapshot = stateRef.current;
    if (!snapshot.currentChatRoom) {
      return;
    }
    const roomId = snapshot.currentChatRoom.chatRoomId || snapshot.currentChatRoom.id;
    if (!roomId) {
      return;
    }
    // WebSocket 연결이 완료된 후 읽음 처리
    connectionPromiseRef.current
      .then(() => {
        // 연결 상태 확인 후 읽음 처리
        const isConnected = snapshot.isConnected || socketConnected || websocketApi.isConnected?.();
        if (isConnected) {
          try {
            websocketApi.sendReadReceipt(roomId);
          } catch (error) {
            console.warn('[ChatContext] 읽음 처리 전송 실패:', error);
          }
        }
      })
      .catch((error) => {
        // 연결 실패 시 조용히 처리 (오류 로그만 남기지 않음)
        // WebSocket 연결이 실패했을 때는 읽음 처리를 시도하지 않음
      });
  }, [socketConnected]);

  // 브라우저 포그라운드 복귀 시 Heartbeat 전송
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && websocketApi.isConnected?.()) {
        // 포그라운드로 복귀했을 때 즉시 Heartbeat 전송
        websocketApi.sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 온라인 상태 업데이트 함수
  const updateOpponentOnlineStatus = useCallback((isOnline, lastSeenAt) => {
    dispatch({ 
      type: 'UPDATE_OPPONENT_ONLINE_STATUS', 
      payload: { isOnline, lastSeenAt } 
    });
  }, []);

  const value = {
    ...state,
    isConnected: state.isConnected || socketConnected || (typeof derivedOnlineStatus === 'boolean' ? derivedOnlineStatus : false),
    error: state.error,
    typingMemberId: state.typingMemberId,
    setCurrentChatRoom,
    sendMessage,
    sendTyping,
    sendReadReceipt,
    deleteMessage,
    updateMessage,
    uploadFile,
    loadOlderMessages,
    hasMorePast: state.hasMorePast,
    searchMessages,
    jumpToMessage,
    updateOpponentOnlineStatus,
    addMessage: (message) => 
      dispatch({ type: 'ADD_MESSAGE', payload: message }),
    setMessages: (messages) => 
      dispatch({ type: 'SET_MESSAGES', payload: sortMessagesAscending(messages) }),
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
