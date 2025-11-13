/**
 * ChatContext
 * 채팅 관련 전역 상태 관리 컨텍스트 (더미 데이터 사용)
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { messageApi } from '../api/messageApi';
import { websocketApi, getWebSocketUrl } from '../api/websocketApi';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

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
      // 서버에서 받은 메시지로 완전히 교체 (병합하지 않음)
      const updatedMessages = [...state.messages];
      updatedMessages[messageIndex] = updatedMessage;
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
    case 'UPDATE_CHAT_ROOM_STATUS':
      // 채팅방 상태 업데이트 (나가기, 자동 종료)
      const { chatRoomId, status, isLeft } = action.payload;
      if (!state.currentChatRoom || (state.currentChatRoom.chatRoomId || state.currentChatRoom.id) !== chatRoomId) {
        return state;
      }
      // isLeft 값이 명시적으로 전달된 경우에만 업데이트 (undefined가 아닌 경우)
      const updatedIsLeft = isLeft !== undefined ? isLeft : state.currentChatRoom.otherMember?.isLeft ?? false;
      return {
        ...state,
        currentChatRoom: {
          ...state.currentChatRoom,
          status: status ?? state.currentChatRoom.status,
          otherMemberIsLeft: updatedIsLeft, // 상위 레벨 필드도 업데이트
          otherMember: {
            ...state.currentChatRoom.otherMember,
            isLeft: updatedIsLeft
          }
        }
      };
    case 'SET_CHAT_ROOM_DISABLED':
      // 채팅방 입력 비활성화 (자동 종료 등)
      return {
        ...state,
        isChatRoomDisabled: action.payload
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
  lastReadAt: null, // 마지막 읽은 시간 (상대방이 읽은 시간)
  isChatRoomDisabled: false // 채팅방 입력 비활성화 (자동 종료 등)
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
  const globalWebSocketClientRef = useRef(null); // 전역 WebSocket 클라이언트 (채팅방 상태 변경 알림용)
  const globalWebSocketSubscriptionRef = useRef(null); // 전역 WebSocket 구독
  const globalHeartbeatIntervalRef = useRef(null); // 전역 WebSocket Heartbeat 인터벌
  const activeRoomIdRef = useRef(null); // 현재 활성화된 채팅방 ID (자동 읽음 처리용)
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
    if (!rawMessage) {
      console.warn('[ChatContext] normalizeMessage: rawMessage is null or undefined');
      return null;
    }

    // 타입 정규화 (대소문자 구분 없이 처리)
    let type = rawMessage.type || rawMessage.messageType || 'TEXT';
    if (typeof type === 'string') {
      type = type.toLowerCase();
    } else {
      type = type.toString().toLowerCase();
    }
    
    // 시스템 메시지인 경우 타입 강제 설정 (내용 기반 감지 포함)
    // 단, 대여 요청 메시지는 시스템 메시지가 아니므로 JSON 파싱 전에 체크하지 않음
    if (type === 'system' || 
        rawMessage.type === 'SYSTEM' || 
        rawMessage.messageType === 'SYSTEM' ||
        (rawMessage.content && 
         typeof rawMessage.content === 'string' &&
         !rawMessage.content.trim().startsWith('{') && // JSON 문자열이 아닌 경우만
         (
          rawMessage.content.includes('나갔습니다') || 
          rawMessage.content.includes('자동 종료')
         ))) {
      type = 'system';
    }
    
    const senderId = rawMessage.senderId ?? rawMessage.sender?.id ?? rawMessage.sender_id ?? null;
    
    // 시스템 메시지인 경우 sender를 null로 설정
    const sender = type === 'system' ? null : resolveSenderInfo(senderId, chatRoomOverride);

    const timestamp = rawMessage.createdAt || rawMessage.timestamp || new Date().toISOString();
    
    // 디버깅: 시스템 메시지 감지 시 로그
    if (type === 'system') {
      console.log('[ChatContext] normalizeMessage: 시스템 메시지 감지:', {
        rawMessage,
        type,
        content: rawMessage.content,
        senderId,
        timestamp
      });
    }
    
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

    // 메시지 ID 추출 (다양한 형식 지원: id, _id, messageId)
    const messageId = rawMessage.id || rawMessage._id || rawMessage.messageId || `msg_${Date.now()}`;

    // 대여 요청 메시지인 경우 rentalInfo 파싱
    // 백엔드가 RENTAL_REQUEST 타입을 지원하지 않으므로 TEXT 타입으로 전송되지만,
    // content에 JSON 문자열로 대여 요청 정보가 포함되어 있음
    let rentalInfo = rawMessage.rentalInfo || null;
    
    // rentalInfo가 없고 content가 JSON 문자열인 경우 파싱 시도
    // type이 'text'이거나 'rental_request'인 경우 모두 확인
    if (!rentalInfo && rawMessage.content) {
      try {
        // content에서 JSON 문자열 추출 (여러 줄일 수 있으므로 JSON 부분만 추출)
        const contentStr = String(rawMessage.content).trim();
        
        // JSON 객체를 찾기 위해 '{' 부터 '}' 까지 추출
        const jsonStartIndex = contentStr.indexOf('{');
        const jsonEndIndex = contentStr.lastIndexOf('}');
        
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          const jsonStr = contentStr.substring(jsonStartIndex, jsonEndIndex + 1);
          
          console.log('[ChatContext] normalizeMessage: JSON 문자열 추출:', {
            originalContent: contentStr.substring(0, 100) + '...',
            jsonStr: jsonStr.substring(0, 100) + '...',
            jsonStartIndex,
            jsonEndIndex
          });
          
          const parsed = JSON.parse(jsonStr);
          console.log('[ChatContext] normalizeMessage: JSON 파싱 결과:', {
            parsed,
            hasType: !!parsed?.type,
            type: parsed?.type
          });
          
          if (parsed && parsed.type === 'RENTAL_REQUEST') {
            rentalInfo = {
              productId: parsed.productId,
              productTitle: parsed.productTitle,
              productImageUrl: parsed.productImageUrl,
              startDate: parsed.startDate,
              endDate: parsed.endDate,
              days: parsed.days,
              rentMethod: parsed.rentMethod,
              dailyPrice: parsed.dailyPrice,
              deposit: parsed.deposit,
              totalPrice: parsed.totalPrice,
              requesterId: parsed.requesterId,
              requesterName: parsed.requesterName,
              requesterProfileUrl: parsed.requesterProfileUrl,
              status: parsed.status || 'pending'
            };
            
            console.log('[ChatContext] normalizeMessage: rentalInfo 추출 성공:', {
              rentalInfo,
              productId: rentalInfo.productId,
              productTitle: rentalInfo.productTitle
            });
            
            // 대여 요청 메시지인 경우 타입을 rental_request로 설정
            if (type === 'text' && rentalInfo) {
              type = 'rental_request';
              console.log('[ChatContext] 대여 요청 메시지 감지 (content 파싱): text -> rental_request', {
                parsed,
                rentalInfo,
                type,
                productId: rentalInfo.productId,
                productTitle: rentalInfo.productTitle
              });
            }
          } else {
            console.log('[ChatContext] normalizeMessage: JSON 파싱 성공했지만 RENTAL_REQUEST 타입 아님:', {
              parsedType: parsed?.type,
              parsed
            });
          }
        } else {
          // JSON 문자열이 직접 시작하고 끝나는 경우 (단일 JSON 문자열)
          if (contentStr.startsWith('{') && contentStr.endsWith('}')) {
            const parsed = JSON.parse(contentStr);
            console.log('[ChatContext] normalizeMessage: JSON 파싱 결과 (직접 파싱):', {
              parsed,
              hasType: !!parsed?.type,
              type: parsed?.type
            });
            
            if (parsed && parsed.type === 'RENTAL_REQUEST') {
              rentalInfo = {
                productId: parsed.productId,
                productTitle: parsed.productTitle,
                productImageUrl: parsed.productImageUrl,
                startDate: parsed.startDate,
                endDate: parsed.endDate,
                days: parsed.days,
                rentMethod: parsed.rentMethod,
                dailyPrice: parsed.dailyPrice,
                deposit: parsed.deposit,
                totalPrice: parsed.totalPrice,
                requesterId: parsed.requesterId,
                requesterName: parsed.requesterName,
                requesterProfileUrl: parsed.requesterProfileUrl,
                status: parsed.status || 'pending'
              };
              
              if (type === 'text' && rentalInfo) {
                type = 'rental_request';
                console.log('[ChatContext] 대여 요청 메시지 감지 (직접 파싱): text -> rental_request', {
                  rentalInfo,
                  type
                });
              }
            }
          } else {
            console.log('[ChatContext] normalizeMessage: JSON 문자열이 아님 (일반 텍스트):', {
              content: contentStr.substring(0, 50) + '...'
            });
          }
        }
      } catch (e) {
        // JSON 파싱 실패 시 일반 텍스트 메시지로 처리
        console.log('[ChatContext] normalizeMessage: JSON 파싱 실패 (일반 텍스트 메시지):', {
          error: e.message,
          content: String(rawMessage.content).substring(0, 50) + '...'
        });
      }
    } else if (rentalInfo) {
      console.log('[ChatContext] normalizeMessage: rentalInfo가 이미 있음 (rawMessage에서):', {
        rentalInfo,
        productId: rentalInfo.productId,
        productTitle: rentalInfo.productTitle
      });
    }
    
    // rentalInfo가 있으면 타입을 rental_request로 설정 (이중 체크)
    if (rentalInfo && type === 'text') {
      type = 'rental_request';
      console.log('[ChatContext] 대여 요청 메시지 타입 변경: text -> rental_request (rentalInfo 있음)', {
        rentalInfo,
        type,
        productId: rentalInfo.productId,
        productTitle: rentalInfo.productTitle
      });
    }

    // 대여 요청 메시지인 경우 content를 빈 문자열로 설정 (rentalInfo에서 표시하므로)
    // 일반 텍스트 메시지가 아닌 경우만 content 유지
    let messageContent = rawMessage.content || '';
    if (type === 'rental_request' && rentalInfo) {
      // 대여 요청 메시지는 rentalInfo로 표시하므로 content는 숨김
      messageContent = '';
    } else if (type === 'image') {
      messageContent = rawMessage.imageUrl || rawMessage.content || '';
    } else if (type === 'system') {
      messageContent = rawMessage.content || '';
    }

    const message = {
      id: messageId,
      chatRoomId: rawMessage.chatRoomId ?? chatRoomOverride?.chatRoomId ?? chatRoomOverride?.id ?? state.currentChatRoom?.chatRoomId ?? state.currentChatRoom?.id ?? null,
      type,
      content: messageContent,
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
      status: rawMessage.status || null,
      // 대여 요청 메시지인 경우 추가 정보 포함
      productId: rawMessage.productId || rentalInfo?.productId || null,
      rentalInfo: rentalInfo
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
      
      // 중복 제거를 위한 Map 사용 (chatRoomId 기준)
      const chatRoomsMap = new Map();
      
      // 기존 채팅방 목록을 Map에 추가 (중복 제거)
      oldData.chatRooms.forEach((room) => {
        const id = room.chatRoomId || room.id;
        if (id) {
          const existingRoom = chatRoomsMap.get(id);
          if (!existingRoom) {
            chatRoomsMap.set(id, room);
          } else {
            // 최신 활동 시간 비교하여 최신 것만 유지
            const existingTime = new Date(existingRoom.lastMessageAt || existingRoom.updatedAt || 0).getTime();
            const currentTime = new Date(room.lastMessageAt || room.updatedAt || 0).getTime();
            if (currentTime > existingTime) {
              chatRoomsMap.set(id, room);
            }
          }
        }
      });
      
      const room = chatRoomsMap.get(roomId);
      if (!room) return oldData;
      
      const isOwnMessage = Number(message.senderId) === Number(currentUserId);
      
      // lastMessage와 lastMessageAt 업데이트 (실시간으로 미리보기 업데이트)
      let lastMessage = '';
      if (message.type === 'system') {
        // 시스템 메시지: 그대로 표시
        lastMessage = message.content || '';
      } else if (message.type === 'image') {
        lastMessage = '[이미지]';
      } else if (message.type === 'file') {
        lastMessage = `[파일] ${message.fileName || '파일'}`;
      } else if (message.type === 'rental_request' || message.rentalInfo) {
        // 대여 요청 메시지: "대여 요청"으로 표시
        lastMessage = '대여 요청';
      } else {
        // content에 JSON이 포함되어 있는지 확인 (대여 요청 메시지 감지)
        const content = message.content || '';
        if (content && typeof content === 'string') {
          try {
            // JSON 문자열 추출 시도
            const contentStr = content.trim();
            const jsonStartIndex = contentStr.indexOf('{');
            const jsonEndIndex = contentStr.lastIndexOf('}');
            
            if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
              const jsonStr = contentStr.substring(jsonStartIndex, jsonEndIndex + 1);
              const parsed = JSON.parse(jsonStr);
              
              // RENTAL_REQUEST 타입이면 "대여 요청"으로 표시
              if (parsed && parsed.type === 'RENTAL_REQUEST') {
                lastMessage = '대여 요청';
              } else {
                lastMessage = content;
              }
            } else if (contentStr.startsWith('{') && contentStr.endsWith('}')) {
              // 전체가 JSON 문자열인 경우
              const parsed = JSON.parse(contentStr);
              if (parsed && parsed.type === 'RENTAL_REQUEST') {
                lastMessage = '대여 요청';
              } else {
                lastMessage = content;
              }
            } else {
              lastMessage = content;
            }
          } catch (e) {
            // JSON 파싱 실패 시 일반 텍스트로 처리
            lastMessage = content;
          }
        } else {
          lastMessage = content;
        }
      }
      const lastMessageAt = message.timestamp || new Date().toISOString();
      
      // unreadCount 업데이트
      let unreadCount = room.unreadCount || 0;
      // 시스템 메시지는 unreadCount에 영향 없음
      if (message.type === 'system') {
        // 시스템 메시지는 unreadCount 유지
      } else if (isOwnMessage) {
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
      
      chatRoomsMap.set(roomId, {
        ...room,
        lastMessage,
        lastMessageAt,
        unreadCount
      });
      
      const uniqueChatRooms = Array.from(chatRoomsMap.values());
      
      // 최신 활동 순으로 정렬 (고정 채팅방 우선)
      uniqueChatRooms.sort((a, b) => {
        const aPinned = !!a.isPinned;
        const bPinned = !!b.isPinned;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        const aTime = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
        const bTime = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
        return bTime - aTime;
      });
      
      // totalUnreadCount 계산
      const totalUnreadCount = uniqueChatRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
      
      return {
        ...oldData,
        chatRooms: uniqueChatRooms,
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
        console.log('[ChatContext] WebSocket 메시지 수신 (raw):', {
          rawMessage,
          type: rawMessage?.type,
          content: rawMessage?.content,
          senderId: rawMessage?.senderId,
          chatRoomId: rawMessage?.chatRoomId
        });
        
        const normalized = normalizeMessage(rawMessage, chatRoomData);
        console.log('[ChatContext] WebSocket 메시지 정규화 후:', {
          normalized,
          type: normalized?.type,
          content: normalized?.content,
          senderId: normalized?.senderId,
          chatRoomId: normalized?.chatRoomId
        });
        
        if (normalized) {
          const snapshot = stateRef.current;
          const isOwnMessage = Number(normalized.senderId) === Number(currentUserId);
          
          // 시스템 메시지 처리 (재입장, 나가기 등) - 타입 체크를 더 엄격하게
          const isSystemMessage = normalized.type === 'system' || 
                                  normalized.type === 'SYSTEM' ||
                                  rawMessage?.type === 'SYSTEM' ||
                                  rawMessage?.type === 'system' ||
                                  rawMessage?.messageType === 'SYSTEM' ||
                                  rawMessage?.messageType === 'system';
          
          if (isSystemMessage) {
            // 재입장 메시지는 무시 (표시하지 않음)
            if (normalized.content?.includes('다시 들어왔습니다') || normalized.content?.includes('재입장')) {
              console.log('[ChatContext] 재입장 시스템 메시지 무시:', normalized);
              return;
            }
            
            console.log('[ChatContext] 시스템 메시지 감지 (onMessage):', {
              normalized,
              rawMessage,
              type: normalized.type,
              content: normalized.content
            });
            
            // 기존 메시지 확인 (동일한 시스템 메시지가 이미 있는지 확인)
            const existingSystemMessage = snapshot.messages.find((msg) => {
              if (!msg) return false;
              const msgType = msg.type?.toLowerCase?.() || msg.type || '';
              if (msgType !== 'system') return false;
              
              // 내용이 정확히 일치하면 중복
              if (msg.content === normalized.content) {
                console.log('[ChatContext] 동일한 내용의 시스템 메시지 발견:', msg);
                return true;
              }
              
              return false;
            });
            
            if (existingSystemMessage) {
              console.log('[ChatContext] 동일한 시스템 메시지가 이미 존재함, 무시:', {
                existing: existingSystemMessage,
                incoming: normalized
              });
              return;
            }
            
            // 시스템 메시지 추가
            console.log('[ChatContext] 시스템 메시지 추가 (중복 없음):', normalized);
            dispatch({ type: 'ADD_MESSAGE', payload: normalized });
            
            // 채팅 목록 업데이트
            updateChatRoomList(normalized, false);
            
            return;
          }
          
          // 상대방이 메시지를 보냈으면 온라인 상태로 업데이트
          if (!isOwnMessage) {
            dispatch({ 
              type: 'UPDATE_OPPONENT_ONLINE_STATUS', 
              payload: { isOnline: true, lastSeenAt: null } 
            });
          }
          
          // 기존 메시지 확인 (수정/삭제된 메시지 처리 우선)
          // 메시지 ID를 문자열로 변환하여 비교 (ObjectId와 문자열 모두 처리)
          const existingMessage = snapshot.messages.find((msg) => {
            if (!msg || !normalized) return false;
            // ID가 정확히 일치하는지 확인
            if (String(msg.id) === String(normalized.id)) return true;
            // ID가 없지만 다른 속성으로 매칭할 수 있는지 확인 (임시 메시지 제외)
            if (!msg.id || !normalized.id) return false;
            return false;
          });
          
          // 기존 메시지가 있는 경우 (수정/삭제 또는 일반 업데이트)
          if (existingMessage) {
            // 기존 메시지를 서버에서 받은 메시지로 완전히 교체 (수정/삭제 상태 반영)
            // 수정/삭제된 메시지는 서버에서 받은 상태를 그대로 반영
            dispatch({ type: 'UPDATE_MESSAGE', payload: normalized });
            // 채팅 목록 업데이트 (lastMessage는 변경될 수 있으므로 업데이트)
            // 메시지 수정/삭제는 unreadCount에 영향 없음
            updateChatRoomList(normalized, false);
            return;
          }
          
          // 기존 메시지가 없고, 수정/삭제된 메시지인 경우 (이상한 경우이지만 처리)
          if (normalized.isDeleted || normalized.isEdited) {
            // 수정/삭제된 메시지가 목록에 없으면 추가 (나중에 로드된 메시지일 수 있음)
            dispatch({ type: 'ADD_MESSAGE', payload: normalized });
            updateChatRoomList(normalized, false);
            return;
          }
          
          // 본인이 보낸 새 메시지이고 임시 메시지가 있으면 교체
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
              // 채팅 목록 업데이트
              updateChatRoomList(normalized, false);
              return;
            }
          }
          
            // 새 메시지 추가
            dispatch({ type: 'ADD_MESSAGE', payload: normalized });
            // 채팅 목록 업데이트
            // 채팅방 안에 있으면 자동 읽음 처리, 밖에 있으면 안읽음으로 표시
            const isInThisChatRoom = activeRoomIdRef.current === roomId;
            updateChatRoomList(normalized, isInThisChatRoom);
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
        
        // 채팅방 입장 전송
        try {
          websocketApi.enterChatRoom(roomId);
        } catch (error) {
          console.warn('[ChatContext] 채팅방 입장 전송 실패:', error);
        }
        
        // Heartbeat 시작 (30초마다 전송, chatRoomId 포함)
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // 초기 Heartbeat 즉시 전송 (chatRoomId 포함)
        websocketApi.sendHeartbeat(roomId);
        
        // 30초마다 Heartbeat 전송 (chatRoomId 포함)
        heartbeatIntervalRef.current = setInterval(() => {
          websocketApi.sendHeartbeat(roomId);
        }, 30000);
      },
      onDisconnect: () => {
        console.log('[ChatContext] WebSocket 연결 종료:', roomId);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
        
        // 채팅방 퇴장 전송
        try {
          websocketApi.leaveChatRoom();
        } catch (error) {
          console.warn('[ChatContext] 채팅방 퇴장 전송 실패:', error);
        }
        
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

          // 읽음 표시 유지 (타이머 제거)
        }
      }
    });
  }, [connect, normalizeMessage, resetConnectionPromise, currentUserId, queryClient, updateChatRoomList, stateRef]);

  // 채팅방 설정
  // setCurrentChatRoom(chatRoomId) - API 호출하여 조회
  // setCurrentChatRoom(chatRoomId, chatRoomData) - 전달된 데이터 사용 (생성 직후 등)
  const setCurrentChatRoom = useCallback(async (chatRoomId, chatRoomData = null) => {
    if (!chatRoomId) {
      // 채팅방 퇴장 전송
      try {
        websocketApi.leaveChatRoom();
      } catch (error) {
        console.warn('[ChatContext] 채팅방 퇴장 전송 실패:', error);
      }

      disconnect();
      dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: null });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      connectionPromiseRef.current = Promise.resolve();
      activeRoomIdRef.current = null; // 채팅방 퇴장 시 ref 초기화
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
        try {
          chatRoom = await chatApi.getChatRoomDetail(chatRoomId, { include: 'member' });
        } catch (error) {
          // 403 에러는 나간 채팅방 접근 시도로 간주
          if (error.response?.status === 403 || error.message?.includes('접근할 권한이 없습니다')) {
            console.warn('[ChatContext] 나간 채팅방 접근 시도 (403 에러). 접근 차단.');
            dispatch({ type: 'SET_LOADING', payload: false });
            throw new Error('나간 채팅방입니다. 채팅방 목록으로 이동합니다.');
          }
          // 다른 에러는 그대로 전파
          throw error;
        }
      }

      const roomId = chatRoom?.chatRoomId || chatRoomId;

      // 본인이 나간 상태(isLeft=true)인지 확인하여 접근 차단
      // 백엔드 API 응답에 isLeft 필드가 포함되어 있는지 확인
      if (chatRoom.isLeft === true || chatRoom.isLeft === 'true') {
        console.warn('[ChatContext] 본인이 나간 채팅방에 접근 시도 (isLeft=true). 접근 차단.');
        dispatch({ type: 'SET_LOADING', payload: false });
        throw new Error('나간 채팅방입니다. 채팅방 목록으로 이동합니다.');
      }
      
      // 추가 검증: 채팅방 목록에서 해당 채팅방이 있는지 확인
      // 백엔드가 나간 채팅방을 목록에서 제외하므로, 목록에 없으면 나간 채팅방일 가능성이 높음
      // 단, 목록이 로드되지 않은 경우는 제외 (직접 URL 접근 등)
      try {
        const chatRoomsData = queryClient.getQueryData([QUERY_KEYS.CHATS, 'rooms']);
        if (chatRoomsData && chatRoomsData.chatRooms && Array.isArray(chatRoomsData.chatRooms)) {
          const roomExists = chatRoomsData.chatRooms.some((room) => {
            const existingRoomId = room.chatRoomId || room.id;
            return existingRoomId && Number(existingRoomId) === Number(roomId);
          });
          
          // 목록이 로드되어 있고, 해당 채팅방이 목록에 없으면 나간 채팅방으로 간주
          // 단, 목록이 비어있으면 정상 채팅방일 수도 있으므로 차단하지 않음
          if (chatRoomsData.chatRooms.length > 0 && !roomExists) {
            console.warn('[ChatContext] 나간 채팅방 접근 시도 (목록에 없음). 접근 차단.');
            dispatch({ type: 'SET_LOADING', payload: false });
            throw new Error('나간 채팅방입니다. 채팅방 목록으로 이동합니다.');
          }
        }
      } catch (error) {
        // 목록 확인 중 에러가 발생하면 무시 (API 응답에 의존)
        console.warn('[ChatContext] 채팅방 목록 확인 중 에러:', error);
      }

      // 채팅방 상태 확인 (자동 종료 여부) 및 입력창 비활성화 설정
      if (chatRoom.status === 'AUTO_CLOSED') {
        dispatch({ type: 'SET_CHAT_ROOM_DISABLED', payload: true });
      } else {
        dispatch({ type: 'SET_CHAT_ROOM_DISABLED', payload: false });
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
          otherMemberIsLeft: otherMember.isLeft ?? false, // 상위 레벨 필드도 포함
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

      activeRoomIdRef.current = roomId; // 채팅방 입장 시 ref 설정

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
          
          // 중복 제거를 위한 Map 사용 (chatRoomId 기준)
          const chatRoomsMap = new Map();
          
          // 기존 채팅방 목록을 Map에 추가 (중복 제거)
          oldData.chatRooms.forEach((room) => {
            const id = room.chatRoomId || room.id;
            if (id) {
              const existingRoom = chatRoomsMap.get(id);
              if (!existingRoom) {
                chatRoomsMap.set(id, room);
              } else {
                // 최신 활동 시간 비교하여 최신 것만 유지
                const existingTime = new Date(existingRoom.lastMessageAt || existingRoom.updatedAt || 0).getTime();
                const currentTime = new Date(room.lastMessageAt || room.updatedAt || 0).getTime();
                if (currentTime > existingTime) {
                  chatRoomsMap.set(id, room);
                }
              }
            }
          });
          
          // 해당 채팅방의 unreadCount를 0으로 설정
          const room = chatRoomsMap.get(roomId);
          if (room) {
            chatRoomsMap.set(roomId, { ...room, unreadCount: 0 });
            }
          
          const uniqueChatRooms = Array.from(chatRoomsMap.values());
          
          // 최신 활동 순으로 정렬 (고정 채팅방 우선)
          uniqueChatRooms.sort((a, b) => {
            const aPinned = !!a.isPinned;
            const bPinned = !!b.isPinned;
            if (aPinned !== bPinned) return aPinned ? -1 : 1;
            const aTime = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
            const bTime = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
            return bTime - aTime;
          });
          
          const totalUnreadCount = uniqueChatRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
            
            return {
              ...oldData,
            chatRooms: uniqueChatRooms,
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
        replyToMessageId: messageData.replyToMessageId ?? messageData.replyTo ?? null,
        // 대여 요청 메시지인 경우 추가 정보 포함
        productId: messageData.productId ?? null,
        rentalInfo: messageData.rentalInfo ?? null
      };

      if (!socketConnected || !websocketApi.isConnected?.()) {
        console.warn('WebSocket 연결을 기다리는 중입니다.');
        await connectionPromiseRef.current;
      }

      // 대여 요청 메시지인 경우 타입 확인
      // 백엔드가 RENTAL_REQUEST 타입을 지원하지 않으므로 TEXT 타입으로 전송되지만,
      // 프론트엔드에서는 rentalInfo가 있으면 rental_request 타입으로 표시
      let messageType = payload.type.toLowerCase();
      if (payload.rentalInfo && messageType === 'text') {
        messageType = 'rental_request';
        console.log('[ChatContext] 대여 요청 메시지 감지 (optimistic): text -> rental_request');
      }
      
      const optimisticMessage = {
        id: `temp_${Date.now()}`,
        chatRoomId: roomId,
        type: messageType,
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
        status: 'pending',
        // 대여 요청 메시지인 경우 추가 정보 포함
        productId: payload.productId,
        rentalInfo: payload.rentalInfo
      };

      dispatch({ type: 'ADD_MESSAGE', payload: optimisticMessage });
      
      // 채팅 목록 업데이트 (내가 보낸 메시지이므로 읽음 처리하지 않음, 상대방이 읽을 때까지)
      updateChatRoomList(optimisticMessage, false);

      sendWebSocketMessage(roomId, payload);
      console.log('[ChatContext] 메시지 전송 요청:', payload);

      // 읽음 표시는 onRead 이벤트로만 처리 (상대방이 sendReadReceipt()를 보내면 자동으로 처리됨)
      // typingMemberId로 판단하는 것은 부정확함 (상대방이 채팅방에 있어도 타이핑하지 않으면 null)

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

  // 채팅방 상태 변경 알림 처리 함수
  const handleChatRoomStatusEvent = useCallback((event) => {
    try {
      console.log('[ChatContext] handleChatRoomStatusEvent 호출:', {
        event,
        eventType: event?.eventType,
        chatRoomId: event?.chatRoomId,
        memberId: event?.memberId,
        memberNickname: event?.memberNickname,
        timestamp: event?.timestamp
      });
      
      if (!event || !event.eventType) {
        console.warn('[ChatContext] 유효하지 않은 채팅방 상태 변경 이벤트:', event);
        return;
      }
      
      const { chatRoomId, eventType, memberId, memberNickname, status, timestamp } = event;
      const snapshot = stateRef.current;
      const currentRoomId = snapshot.currentChatRoom?.chatRoomId || snapshot.currentChatRoom?.id;
      
      console.log('[ChatContext] 채팅방 상태 변경 이벤트 처리:', {
        eventType,
        chatRoomId: Number(chatRoomId),
        currentRoomId: Number(currentRoomId),
        isCurrentRoom: currentRoomId && Number(currentRoomId) === Number(chatRoomId),
        memberId,
        memberNickname,
        timestamp
      });
      
      // 현재 채팅방이 해당 채팅방인 경우에만 처리
      const isCurrentRoom = currentRoomId && Number(currentRoomId) === Number(chatRoomId);
      
      console.log('[ChatContext] 채팅방 상태 변경 이벤트 처리 조건 확인:', {
        isCurrentRoom,
        currentRoomId: Number(currentRoomId),
        eventChatRoomId: Number(chatRoomId),
        eventType,
        memberNickname
      });
      
      if (isCurrentRoom) {
        console.log('[ChatContext] 현재 채팅방과 일치, 이벤트 처리 시작:', eventType);
        switch (eventType) {
          case 'MEMBER_LEFT':
            // 상대방이 나갔습니다
            const leaveSystemMessage = {
              id: `system-leave-${chatRoomId}-${Date.now()}`,
              type: 'system',
              content: `${memberNickname || '상대방'}님이 채팅방을 나갔습니다`,
              timestamp: timestamp || new Date().toISOString(),
              chatRoomId: Number(chatRoomId),
              senderId: memberId || 0
            };
            dispatch({ type: 'ADD_MESSAGE', payload: leaveSystemMessage });
            
            // 상대방 상태 업데이트 (나갔음)
            dispatch({
              type: 'UPDATE_CHAT_ROOM_STATUS',
              payload: {
                chatRoomId: Number(chatRoomId),
                isLeft: true
              }
            });
            
            // 채팅방 목록 업데이트 (시스템 메시지 포함)
            updateChatRoomList(leaveSystemMessage, false);
            
            // 채팅방 목록 상태 업데이트 (otherMemberIsLeft 추가)
            queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], (oldData) => {
              if (!oldData || !oldData.chatRooms) return oldData;
              
              // 중복 제거를 위한 Map 사용 (chatRoomId 기준)
              const chatRoomsMap = new Map();
              
              // 기존 채팅방 목록을 Map에 추가 (중복 제거)
              oldData.chatRooms.forEach((room) => {
                const id = room.chatRoomId || room.id;
                if (id) {
                  const existingRoom = chatRoomsMap.get(id);
                  if (!existingRoom) {
                    chatRoomsMap.set(id, room);
                  } else {
                    // 최신 활동 시간 비교하여 최신 것만 유지
                    const existingTime = new Date(existingRoom.lastMessageAt || existingRoom.updatedAt || 0).getTime();
                    const currentTime = new Date(room.lastMessageAt || room.updatedAt || 0).getTime();
                    if (currentTime > existingTime) {
                      chatRoomsMap.set(id, room);
                    }
                  }
                }
              });
              
              // 해당 채팅방 상태 업데이트
              const roomId = Number(chatRoomId);
              const room = chatRoomsMap.get(roomId);
              if (room) {
                chatRoomsMap.set(roomId, {
                  ...room,
                  otherMemberIsLeft: true
                });
              }
              
              const uniqueChatRooms = Array.from(chatRoomsMap.values());
              
              // 최신 활동 순으로 정렬 (고정 채팅방 우선)
              uniqueChatRooms.sort((a, b) => {
                const aPinned = !!a.isPinned;
                const bPinned = !!b.isPinned;
                if (aPinned !== bPinned) return aPinned ? -1 : 1;
                const aTime = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
                const bTime = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
                return bTime - aTime;
              });
              
              return { ...oldData, chatRooms: uniqueChatRooms };
            });
            break;
            
          case 'MEMBER_REJOINED':
            // 재입장 이벤트는 무시 (재입장 메시지 표시하지 않음)
            // 상대방 상태만 업데이트
            console.log('[ChatContext] 재입장 이벤트 수신 (메시지 표시하지 않음):', {
              chatRoomId,
              memberId,
              memberNickname
            });
            
            // 상대방 상태 업데이트 (다시 들어옴)
            dispatch({
              type: 'UPDATE_CHAT_ROOM_STATUS',
              payload: {
                chatRoomId: Number(chatRoomId),
                isLeft: false
              }
            });
            
            // 채팅방 목록 상태 업데이트 (otherMemberIsLeft 업데이트)
            queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], (oldData) => {
              if (!oldData || !oldData.chatRooms) return oldData;
              
              // 중복 제거를 위한 Map 사용 (chatRoomId 기준)
              const chatRoomsMap = new Map();
              
              // 기존 채팅방 목록을 Map에 추가 (중복 제거)
              oldData.chatRooms.forEach((room) => {
                const id = room.chatRoomId || room.id;
                if (id) {
                  const existingRoom = chatRoomsMap.get(id);
                  if (!existingRoom) {
                    chatRoomsMap.set(id, room);
                  } else {
                    // 최신 활동 시간 비교하여 최신 것만 유지
                    const existingTime = new Date(existingRoom.lastMessageAt || existingRoom.updatedAt || 0).getTime();
                    const currentTime = new Date(room.lastMessageAt || room.updatedAt || 0).getTime();
                    if (currentTime > existingTime) {
                      chatRoomsMap.set(id, room);
                    }
                  }
                }
              });
              
              // 해당 채팅방 상태 업데이트
              const roomId = Number(chatRoomId);
              const room = chatRoomsMap.get(roomId);
              if (room) {
                chatRoomsMap.set(roomId, {
                  ...room,
                  otherMemberIsLeft: false
                });
              }
              
              const uniqueChatRooms = Array.from(chatRoomsMap.values());
              
              // 최신 활동 순으로 정렬 (고정 채팅방 우선)
              uniqueChatRooms.sort((a, b) => {
                const aPinned = !!a.isPinned;
                const bPinned = !!b.isPinned;
                if (aPinned !== bPinned) return aPinned ? -1 : 1;
                const aTime = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
                const bTime = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
                return bTime - aTime;
              });
              
              return { ...oldData, chatRooms: uniqueChatRooms };
            });
            break;
            
          case 'ROOM_CLOSED':
            // 채팅방이 자동 종료되었습니다
            const closeSystemMessage = {
              id: `system-closed-${chatRoomId}-${Date.now()}`,
              type: 'system',
              content: '채팅방이 30일 미사용으로 자동 종료되었습니다',
              timestamp: timestamp || new Date().toISOString(),
              chatRoomId: Number(chatRoomId),
              senderId: 0
            };
            dispatch({ type: 'ADD_MESSAGE', payload: closeSystemMessage });
            
            // 채팅방 상태 업데이트 (자동 종료)
            dispatch({
              type: 'UPDATE_CHAT_ROOM_STATUS',
              payload: {
                chatRoomId: Number(chatRoomId),
                status: status || 'AUTO_CLOSED'
              }
            });
            
            // 입력창 비활성화
            dispatch({ type: 'SET_CHAT_ROOM_DISABLED', payload: true });
            
            // 채팅방 목록 업데이트 (시스템 메시지 포함)
            updateChatRoomList(closeSystemMessage, false);
            
            // 채팅방 목록 상태 업데이트 (status 업데이트)
            queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], (oldData) => {
              if (!oldData || !oldData.chatRooms) return oldData;
              
              // 중복 제거를 위한 Map 사용 (chatRoomId 기준)
              const chatRoomsMap = new Map();
              
              // 기존 채팅방 목록을 Map에 추가 (중복 제거)
              oldData.chatRooms.forEach((room) => {
                const id = room.chatRoomId || room.id;
                if (id) {
                  const existingRoom = chatRoomsMap.get(id);
                  if (!existingRoom) {
                    chatRoomsMap.set(id, room);
                  } else {
                    // 최신 활동 시간 비교하여 최신 것만 유지
                    const existingTime = new Date(existingRoom.lastMessageAt || existingRoom.updatedAt || 0).getTime();
                    const currentTime = new Date(room.lastMessageAt || room.updatedAt || 0).getTime();
                    if (currentTime > existingTime) {
                      chatRoomsMap.set(id, room);
                    }
                  }
                }
              });
              
              // 해당 채팅방 상태 업데이트
              const roomId = Number(chatRoomId);
              const room = chatRoomsMap.get(roomId);
              if (room) {
                chatRoomsMap.set(roomId, {
                  ...room,
                  status: status || 'AUTO_CLOSED'
                });
              }
              
              const uniqueChatRooms = Array.from(chatRoomsMap.values());
              
              // 최신 활동 순으로 정렬 (고정 채팅방 우선)
              uniqueChatRooms.sort((a, b) => {
                const aPinned = !!a.isPinned;
                const bPinned = !!b.isPinned;
                if (aPinned !== bPinned) return aPinned ? -1 : 1;
                const aTime = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
                const bTime = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
                return bTime - aTime;
              });
              
              return { ...oldData, chatRooms: uniqueChatRooms };
            });
            break;
            
          default:
            console.warn('[ChatContext] 알 수 없는 채팅방 상태 변경 이벤트:', eventType);
        }
      } else {
        // 현재 채팅방이 아닌 경우, 채팅방 목록만 업데이트 (시스템 메시지 표시)
        let systemMessage = null;
        
        if (eventType === 'MEMBER_LEFT') {
          systemMessage = {
            id: `system-leave-${chatRoomId}-${Date.now()}`,
            type: 'system',
            content: `${memberNickname || '상대방'}님이 채팅방을 나갔습니다`,
            timestamp: timestamp || new Date().toISOString(),
            chatRoomId: Number(chatRoomId),
            senderId: memberId || 0
          };
        } else if (eventType === 'MEMBER_REJOINED') {
          // 재입장 메시지는 표시하지 않음 (상태만 업데이트)
          systemMessage = null;
        } else if (eventType === 'ROOM_CLOSED') {
          systemMessage = {
            id: `system-closed-${chatRoomId}-${Date.now()}`,
            type: 'system',
            content: '채팅방이 30일 미사용으로 자동 종료되었습니다',
            timestamp: timestamp || new Date().toISOString(),
            chatRoomId: Number(chatRoomId),
            senderId: 0
          };
        }
        
        // 시스템 메시지가 있으면 채팅방 목록 업데이트
        if (systemMessage) {
          // 채팅방 목록 업데이트 (시스템 메시지 포함)
          updateChatRoomList(systemMessage, false);
          
          // 채팅방 목록 상태 업데이트 (상태 필드 업데이트)
          queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], (oldData) => {
            if (!oldData || !oldData.chatRooms) return oldData;
            
            // 중복 제거를 위한 Map 사용 (chatRoomId 기준)
            const chatRoomsMap = new Map();
            
            // 기존 채팅방 목록을 Map에 추가 (중복 제거)
            oldData.chatRooms.forEach((room) => {
              const id = room.chatRoomId || room.id;
              if (id) {
                const existingRoom = chatRoomsMap.get(id);
                if (!existingRoom) {
                  chatRoomsMap.set(id, room);
                } else {
                  // 최신 활동 시간 비교하여 최신 것만 유지
                  const existingTime = new Date(existingRoom.lastMessageAt || existingRoom.updatedAt || 0).getTime();
                  const currentTime = new Date(room.lastMessageAt || room.updatedAt || 0).getTime();
                  if (currentTime > existingTime) {
                    chatRoomsMap.set(id, room);
                  }
                }
              }
            });
            
            // 해당 채팅방 상태 업데이트
            const roomId = Number(chatRoomId);
            const room = chatRoomsMap.get(roomId);
            if (room) {
              const updatedRoom = { ...room };
              
              if (eventType === 'MEMBER_LEFT') {
                updatedRoom.otherMemberIsLeft = true;
              } else if (eventType === 'MEMBER_REJOINED') {
                // 재입장 시 상태만 업데이트 (메시지 표시하지 않음)
                updatedRoom.otherMemberIsLeft = false;
              } else if (eventType === 'ROOM_CLOSED') {
                updatedRoom.status = status || 'AUTO_CLOSED';
              }
              
              chatRoomsMap.set(roomId, updatedRoom);
            }
            
            const uniqueChatRooms = Array.from(chatRoomsMap.values());
            
            // 최신 활동 순으로 정렬 (고정 채팅방 우선)
            uniqueChatRooms.sort((a, b) => {
              const aPinned = !!a.isPinned;
              const bPinned = !!b.isPinned;
              if (aPinned !== bPinned) return aPinned ? -1 : 1;
              const aTime = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
              const bTime = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
              return bTime - aTime;
            });
            
            return { ...oldData, chatRooms: uniqueChatRooms };
          });
        }
      }
    } catch (error) {
      console.error('[ChatContext] 채팅방 상태 변경 이벤트 처리 실패:', error);
    }
  }, [queryClient, updateChatRoomList]);

  // 전역 WebSocket 연결 (채팅방 상태 변경 알림 구독)
  useEffect(() => {
    if (!currentUserId) return;
    
    let client = null;
    let subscription = null;
    let heartbeatInterval = null;

    const connectGlobalWebSocket = () => {
      try {
        const url = getWebSocketUrl();
        console.log('[ChatContext] 전역 WebSocket 연결 시도 (채팅방 상태 변경 알림):', url);

        const socket = url.startsWith('ws://') || url.startsWith('wss://')
          ? new WebSocket(url)
          : new SockJS(url, null, {
              transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
              withCredentials: true
            });

        client = new Client({
          reconnectDelay: 3000,
          heartbeatIncoming: 30000,
          heartbeatOutgoing: 30000,
          debug: (str) => {
            if (import.meta.env.DEV) {
              console.debug('[ChatContext Global STOMP]', str);
            }
          },
          webSocketFactory: () => socket,
          connectHeaders: {
            cookie: document.cookie || ''
          }
        });

        client.onConnect = (frame) => {
          console.log('[ChatContext] 전역 WebSocket 연결 성공 (채팅방 상태 변경 알림)');

          // 채팅방 상태 변경 알림 구독
          subscription = client.subscribe('/user/queue/chatroom-status', (message) => {
            try {
              console.log('[ChatContext] 채팅방 상태 변경 이벤트 수신 (raw):', {
                body: message.body,
                headers: message.headers
              });
              
              const event = JSON.parse(message.body);
              console.log('[ChatContext] 채팅방 상태 변경 이벤트 수신 (parsed):', {
                event,
                eventType: event.eventType,
                chatRoomId: event.chatRoomId,
                memberId: event.memberId,
                memberNickname: event.memberNickname,
                timestamp: event.timestamp
              });
              
              handleChatRoomStatusEvent(event);
            } catch (error) {
              console.error('[ChatContext] 채팅방 상태 변경 이벤트 파싱 오류:', {
                error,
                body: message.body,
                headers: message.headers
              });
            }
          });
          
          console.log('[ChatContext] 채팅방 상태 변경 알림 구독 완료: /user/queue/chatroom-status');

          // Heartbeat 시작 (30초마다, chatRoomId 없이)
          heartbeatInterval = setInterval(() => {
            if (client && client.connected) {
              try {
                client.publish({
                  destination: '/app/chat/heartbeat',
                  body: JSON.stringify({})
                });
              } catch (error) {
                console.warn('[ChatContext] 전역 WebSocket Heartbeat 전송 실패:', error);
              }
            }
          }, 30000);

          globalWebSocketClientRef.current = client;
          globalWebSocketSubscriptionRef.current = subscription;
          globalHeartbeatIntervalRef.current = heartbeatInterval;
        };

        client.onStompError = (frame) => {
          console.error('[ChatContext] 전역 WebSocket STOMP 오류:', frame.headers['message'], frame.body);
        };

        client.onWebSocketError = (error) => {
          console.error('[ChatContext] 전역 WebSocket 오류:', error);
        };

        client.onWebSocketClose = (event) => {
          console.warn('[ChatContext] 전역 WebSocket 종료:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
        };

        client.activate();
      } catch (error) {
        console.error('[ChatContext] 전역 WebSocket 연결 실패:', error);
      }
    };

    connectGlobalWebSocket();

    // 정리 함수
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.warn('[ChatContext] 전역 WebSocket 구독 해제 오류:', error);
        }
      }
      if (client) {
        try {
          client.deactivate();
        } catch (error) {
          console.warn('[ChatContext] 전역 WebSocket 비활성화 오류:', error);
        }
      }
      globalWebSocketClientRef.current = null;
      globalWebSocketSubscriptionRef.current = null;
      globalHeartbeatIntervalRef.current = null;
    };
  }, [currentUserId, handleChatRoomStatusEvent]);

  // 브라우저 포그라운드 복귀 시 Heartbeat 전송
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
          // 포그라운드로 복귀했을 때 즉시 Heartbeat 전송 (chatRoomId 포함)
        if (websocketApi.isConnected?.()) {
          const currentRoomId = stateRef.current.currentChatRoom?.chatRoomId || stateRef.current.currentChatRoom?.id;
          websocketApi.sendHeartbeat(currentRoomId);
        }
        // 전역 WebSocket Heartbeat도 전송 (chatRoomId 없이)
        if (globalWebSocketClientRef.current?.connected) {
          try {
            globalWebSocketClientRef.current.publish({
              destination: '/app/chat/heartbeat',
              body: JSON.stringify({})
            });
          } catch (error) {
            console.warn('[ChatContext] 전역 WebSocket Heartbeat 전송 실패:', error);
          }
        }
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
    isChatRoomDisabled: state.isChatRoomDisabled, // 채팅방 입력 비활성화 상태
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
