/**
 * GlobalPresenceContext
 * 전역 온라인 상태 관리 Context
 *
 * 사용자가 사이트 어디에 있든 WebSocket 연결을 유지하여
 * 온라인 상태를 지속적으로 전송합니다.
 * 브라우저를 완전히 닫을 때만 오프라인 상태로 변경됩니다.
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWebSocketUrl } from '@/features/chat/api/websocketApi';
import { chatApi } from '@/features/chat/api/chatApi';

const GlobalPresenceContext = createContext(null);

export const useGlobalPresence = () => {
  const context = useContext(GlobalPresenceContext);
  if (!context) {
    throw new Error('useGlobalPresence must be used within GlobalPresenceProvider');
  }
  return context;
};

export const GlobalPresenceProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const stompClientRef = useRef(null);
  const presenceSubscriptionRef = useRef(null);
  const chatRoomSubscriptionRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  useEffect(() => {
    // 로그인하지 않은 경우 WebSocket 연결하지 않음
    if (!isAuthenticated) {
      return;
    }

    const connectWebSocket = () => {
      try {
        const url = getWebSocketUrl();
        console.log('[GlobalPresence] WebSocket 연결 시도:', url);

        const socket = url.startsWith('ws://') || url.startsWith('wss://')
          ? new WebSocket(url)
          : new SockJS(url, null, {
              transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
              withCredentials: true
            });

        const client = new Client({
          reconnectDelay: 3000,
          heartbeatIncoming: 30000,
          heartbeatOutgoing: 30000,
          debug: (str) => {
            if (import.meta.env.DEV) {
              console.debug('[GlobalPresence STOMP]', str);
            }
          },
          webSocketFactory: () => socket,
          connectHeaders: {
            cookie: document.cookie || ''
          }
        });

        client.onConnect = () => {
          console.log('[GlobalPresence] WebSocket 연결 성공');

          // 온라인 상태 변경 구독
          const presenceSubscription = client.subscribe('/user/queue/presence-update', (message) => {
            try {
              const presenceUpdate = JSON.parse(message.body);
              console.log('[GlobalPresence] 온라인 상태 변경 수신:', presenceUpdate);

              // React Query 캐시 업데이트 (채팅방 목록 온라인 상태 반영)
              queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], (oldData) => {
                if (!oldData || !oldData.chatRooms) return oldData;

                const updatedChatRooms = oldData.chatRooms.map((room) => {
                  if (room.otherMemberId === presenceUpdate.memberId) {
                    return {
                      ...room,
                      member: {
                        ...(room.member || {}),
                        isOnline: presenceUpdate.isOnline,
                        lastSeenAt: presenceUpdate.lastSeenAt
                      }
                    };
                  }
                  return room;
                });

                return {
                  ...oldData,
                  chatRooms: updatedChatRooms
                };
              });
            } catch (error) {
              console.error('[GlobalPresence] 온라인 상태 업데이트 처리 오류:', error);
            }
          });

          presenceSubscriptionRef.current = presenceSubscription;

          // Heartbeat 시작 (30초마다)
          const heartbeatInterval = setInterval(() => {
            if (client && client.connected) {
              try {
                client.publish({
                  destination: '/app/chat/heartbeat',
                  body: ''
                });
                console.log('[GlobalPresence] Heartbeat 전송');
              } catch (error) {
                console.warn('[GlobalPresence] Heartbeat 전송 실패:', error);
              }
            }
          }, 30000);

          heartbeatIntervalRef.current = heartbeatInterval;
        };

        client.onStompError = (frame) => {
          console.error('[GlobalPresence] STOMP 오류:', frame.headers['message'], frame.body);
        };

        client.onWebSocketError = (error) => {
          console.error('[GlobalPresence] WebSocket 오류:', error);
        };

        client.onWebSocketClose = (event) => {
          console.warn('[GlobalPresence] WebSocket 종료:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
        };

        client.activate();
        stompClientRef.current = client;
      } catch (error) {
        console.error('[GlobalPresence] WebSocket 연결 실패:', error);
      }
    };

    connectWebSocket();

    // 정리 함수
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (presenceSubscriptionRef.current) {
        try {
          presenceSubscriptionRef.current.unsubscribe();
        } catch (error) {
          console.warn('[GlobalPresence] 온라인 상태 구독 해제 오류:', error);
        }
        presenceSubscriptionRef.current = null;
      }
      if (stompClientRef.current) {
        try {
          stompClientRef.current.deactivate();
          console.log('[GlobalPresence] WebSocket 연결 해제');
        } catch (error) {
          console.warn('[GlobalPresence] WebSocket 비활성화 오류:', error);
        }
        stompClientRef.current = null;
      }
    };
  }, [isAuthenticated, queryClient]);

  return (
    <GlobalPresenceContext.Provider value={{}}>
      {children}
    </GlobalPresenceContext.Provider>
  );
};
