/**
 * ChatListPage Component
 * 채팅방 목록 페이지 컴포넌트 (카카오톡 스타일)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatRooms } from '../hooks/useChatRooms';
import { chatApi } from '../api/chatApi';
import ChatRoomListItem from '../components/ChatRoomListItem';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWebSocketUrl } from '../api/websocketApi';
import { requestNotificationPermission, getNotificationPermission } from '@/features/push/services/pushNotificationService';

const ChatListPage = () => {
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState(null);
  const { chatRooms, totalUnreadCount, isLoading, error, refetch, leaveChatRoom, isLeaving } = useChatRooms();
  const queryClient = useQueryClient();
  const stompClientRef = useRef(null);
  const chatRoomSubscriptionRef = useRef(null);

  const resolveRoomId = (room) => {
    if (!room) return null;
    return room.chatRoomId ?? room.id ?? null;
  };

  const normalizeChatRoomId = (id) => {
    if (id == null) return null;
    const numeric = Number(id);
    return Number.isNaN(numeric) ? id : numeric;
  };

  // WebSocket 연결 및 채팅방 목록 실시간 업데이트 구독
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const url = getWebSocketUrl();
        console.log('[ChatListPage] WebSocket 연결 시도:', url);

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
              console.debug('[ChatListPage STOMP]', str);
            }
          },
          webSocketFactory: () => socket,
          connectHeaders: {
            cookie: document.cookie || ''
          }
        });

        client.onConnect = (frame) => {
          console.log('[ChatListPage] WebSocket 연결 성공');

          // 채팅방 목록 업데이트 구독
          const chatRoomSubscription = client.subscribe('/user/queue/chatroom-update', (message) => {
            try {
              const update = JSON.parse(message.body);
              console.log('[ChatListPage] 채팅방 업데이트 수신:', update);

              // React Query 캐시 업데이트
              queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], (oldData) => {
                if (!oldData || !oldData.chatRooms) return oldData;

                // 중복 제거를 위한 Map 사용 (chatRoomId 기준)
                const chatRoomsMap = new Map();
                
                // 기존 채팅방 목록을 Map에 추가 (중복 제거)
                oldData.chatRooms.forEach((room) => {
                  const roomId = room.chatRoomId || room.id;
                  if (roomId) {
                    // 같은 chatRoomId를 가진 채팅방이 이미 있으면 최신 것만 유지
                    const existingRoom = chatRoomsMap.get(roomId);
                    if (!existingRoom) {
                      chatRoomsMap.set(roomId, room);
                    } else {
                      // 최신 활동 시간 비교하여 최신 것만 유지
                      const existingTime = new Date(existingRoom.lastMessageAt || existingRoom.updatedAt || 0).getTime();
                      const currentTime = new Date(room.lastMessageAt || room.updatedAt || 0).getTime();
                      if (currentTime > existingTime) {
                        chatRoomsMap.set(roomId, room);
                      }
                    }
                  }
                });

                const roomId = update.chatRoomId;
                const existingRoom = chatRoomsMap.get(roomId);

                if (!existingRoom) {
                  // 채팅방 목록에 없는 경우 (새 채팅방)
                  // API로 채팅방 정보 조회 후 추가
                  chatApi.getChatRoomDetail(roomId)
                    .then((newRoom) => {
                      queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], (prevData) => {
                        if (!prevData || !prevData.chatRooms) return prevData;
                        
                        // 중복 제거를 위한 Map 사용
                        const roomsMap = new Map();
                        
                        // 기존 채팅방 목록을 Map에 추가 (중복 제거)
                        prevData.chatRooms.forEach((room) => {
                          const id = room.chatRoomId || room.id;
                          if (id) {
                            const existing = roomsMap.get(id);
                            if (!existing) {
                              roomsMap.set(id, room);
                            } else {
                              // 최신 활동 시간 비교하여 최신 것만 유지
                              const existingTime = new Date(existing.lastMessageAt || existing.updatedAt || 0).getTime();
                              const currentTime = new Date(room.lastMessageAt || room.updatedAt || 0).getTime();
                              if (currentTime > existingTime) {
                                roomsMap.set(id, room);
                              }
                            }
                          }
                        });
                        
                        // 새 채팅방 추가 (중복 체크)
                        const newRoomId = newRoom.chatRoomId || newRoom.id;
                        if (newRoomId) {
                          const existing = roomsMap.get(newRoomId);
                          if (!existing) {
                            roomsMap.set(newRoomId, newRoom);
                          } else {
                            // 최신 활동 시간 비교하여 최신 것만 유지
                            const existingTime = new Date(existing.lastMessageAt || existing.updatedAt || 0).getTime();
                            const newTime = new Date(newRoom.lastMessageAt || newRoom.updatedAt || 0).getTime();
                            if (newTime > existingTime) {
                              roomsMap.set(newRoomId, newRoom);
                            }
                          }
                        }
                        
                        const uniqueChatRooms = Array.from(roomsMap.values());
                        
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
                        const totalUnreadCount = uniqueChatRooms.reduce(
                          (sum, room) => sum + (room.unreadCount || 0),
                          0
                        );
                        
                        return {
                          ...prevData,
                          chatRooms: uniqueChatRooms,
                          totalUnreadCount
                        };
                      });
                    })
                    .catch((err) => {
                      console.error('[ChatListPage] 새 채팅방 조회 실패:', err);
                    });
                  return oldData;
                }

                // 기존 채팅방 업데이트
                const oldUnreadCount = existingRoom.unreadCount || 0;
                const newUnreadCount = update.unreadCount || 0;

                // lastMessage가 JSON 형식인 경우 "대여 요청"으로 변환
                let lastMessage = update.lastMessage || '';
                if (lastMessage && typeof lastMessage === 'string') {
                  try {
                    // JSON 문자열 추출 시도
                    const contentStr = lastMessage.trim();
                    const jsonStartIndex = contentStr.indexOf('{');
                    const jsonEndIndex = contentStr.lastIndexOf('}');
                    
                    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                      const jsonStr = contentStr.substring(jsonStartIndex, jsonEndIndex + 1);
                      const parsed = JSON.parse(jsonStr);
                      
                      // RENTAL_REQUEST 타입이면 "대여 요청"으로 표시
                      if (parsed && parsed.type === 'RENTAL_REQUEST') {
                        lastMessage = '대여 요청';
                      }
                    } else if (contentStr.startsWith('{') && contentStr.endsWith('}')) {
                      // 전체가 JSON 문자열인 경우
                      const parsed = JSON.parse(contentStr);
                      if (parsed && parsed.type === 'RENTAL_REQUEST') {
                        lastMessage = '대여 요청';
                      }
                    }
                  } catch (e) {
                    // JSON 파싱 실패 시 원본 유지
                  }
                }

                chatRoomsMap.set(roomId, {
                  ...existingRoom,
                  lastMessage: lastMessage,
                  lastMessageAt: update.lastMessageAt,
                  unreadCount: newUnreadCount
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
                const totalUnreadCount = uniqueChatRooms.reduce(
                  (sum, room) => sum + (room.unreadCount || 0),
                  0
                );

                return {
                  ...oldData,
                  chatRooms: uniqueChatRooms,
                  totalUnreadCount
                };
              });
            } catch (error) {
              console.error('[ChatListPage] 채팅방 업데이트 처리 오류:', error);
            }
          });

          // ref에 저장
          stompClientRef.current = client;
          chatRoomSubscriptionRef.current = chatRoomSubscription;
        };

        client.onStompError = (frame) => {
          console.error('[ChatListPage] STOMP 오류:', frame.headers['message'], frame.body);
        };

        client.onWebSocketError = (error) => {
          console.error('[ChatListPage] WebSocket 오류:', error);
        };

        client.onWebSocketClose = (event) => {
          console.warn('[ChatListPage] WebSocket 종료:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
        };

        client.activate();
      } catch (error) {
        console.error('[ChatListPage] WebSocket 연결 실패:', error);
      }
    };

    connectWebSocket();

    // 정리 함수
    return () => {
      if (chatRoomSubscriptionRef.current) {
        try {
          chatRoomSubscriptionRef.current.unsubscribe();
        } catch (error) {
          console.warn('[ChatListPage] 채팅방 구독 해제 오류:', error);
        }
        chatRoomSubscriptionRef.current = null;
      }
      if (stompClientRef.current) {
        try {
          stompClientRef.current.deactivate();
        } catch (error) {
          console.warn('[ChatListPage] WebSocket 비활성화 오류:', error);
        }
        stompClientRef.current = null;
      }
    };
  }, [queryClient]);

  // 알림 권한 자동 요청 (채팅 목록 페이지 진입 시)
  useEffect(() => {
    const requestPermissionIfNeeded = async () => {
      try {
        // 브라우저가 알림을 지원하는지 확인
        if (!('Notification' in window)) {
          console.log('[ChatListPage] 브라우저가 알림을 지원하지 않습니다.');
          return;
        }

        const permission = await getNotificationPermission();
        console.log('[ChatListPage] 현재 알림 권한:', permission);

        // 권한이 'default'(아직 결정 안함)인 경우에만 자동 요청
        if (permission === 'default') {
          // localStorage에서 마지막 요청 시간 확인 (하루에 한 번만 자동 요청)
          const lastRequestTime = localStorage.getItem('notification_last_request_time');
          const now = Date.now();
          const oneDayInMs = 24 * 60 * 60 * 1000;

          if (!lastRequestTime || (now - parseInt(lastRequestTime)) > oneDayInMs) {
            console.log('[ChatListPage] 알림 권한을 자동으로 요청합니다...');

            try {
              const newPermission = await requestNotificationPermission();
              console.log('[ChatListPage] 알림 권한 요청 결과:', newPermission);

              // 요청 시간 기록
              localStorage.setItem('notification_last_request_time', now.toString());
            } catch (error) {
              console.warn('[ChatListPage] 알림 권한 요청 실패:', error.message);
            }
          } else {
            console.log('[ChatListPage] 알림 권한은 하루에 한 번만 자동 요청합니다.');
          }
        } else if (permission === 'denied') {
          console.log('[ChatListPage] 알림 권한이 거부되었습니다. 브라우저 설정에서 수동으로 허용해주세요.');
        } else if (permission === 'granted') {
          console.log('[ChatListPage] 알림 권한이 이미 허용되어 있습니다.');
        }
      } catch (error) {
        console.error('[ChatListPage] 알림 권한 체크 중 오류:', error);
      }
    };

    // 페이지 진입 시 500ms 후 권한 체크 (UX 개선)
    const timer = setTimeout(() => {
      requestPermissionIfNeeded();
    }, 500);

    return () => clearTimeout(timer);
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  const handleChatRoomClick = (chatRoomId) => {
    const id = normalizeChatRoomId(chatRoomId);
    if (!id) return;
    navigate(`/chats/${id}`);
  };

  const handleOpenContextById = (chatRoomId, x, y) => {
    // chatRoomId로 채팅방 찾기 (id 또는 chatRoomId 모두 확인)
    const room = chatRooms.find((r) => {
      const roomId = resolveRoomId(r);
      if (roomId == null) return false;
      return Number(roomId) === Number(chatRoomId);
    });
    if (!room) return;
    setContextMenu({
      x: x ?? window.innerWidth / 2,
      y: y ?? window.innerHeight / 2,
      chatRoom: room,
      roomId: normalizeChatRoomId(resolveRoomId(room))
    });
  };


  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleTogglePin = async (chatRoomId) => {
    const id = normalizeChatRoomId(chatRoomId);
    if (!id) return;
    const room = chatRooms.find((r) => normalizeChatRoomId(resolveRoomId(r)) === id);
    const nextPinned = !(room?.isPinned ?? false);
    try {
      await chatApi.togglePinChatRoom(id, nextPinned);
      refetch();
      closeContextMenu();
    } catch (error) {
      console.error('고정 토글 실패:', error);
      alert('고정 상태 변경에 실패했습니다.');
    }
  };

  const handleToggleMute = async (chatRoomId) => {
    const id = normalizeChatRoomId(chatRoomId);
    if (!id) return;
    const room = chatRooms.find((r) => normalizeChatRoomId(resolveRoomId(r)) === id);
    const nextMuted = !(room?.isMuted ?? false);
    try {
      await chatApi.toggleMuteChatRoom(id, nextMuted);
      refetch();
      closeContextMenu();
    } catch (error) {
      console.error('알림 토글 실패:', error);
      alert('알림 설정 변경에 실패했습니다.');
    }
  };

  const handleDeleteChat = async (chatRoomId) => {
    const id = normalizeChatRoomId(chatRoomId);
    if (!id) return;
    if (window.confirm('정말로 이 채팅방을 삭제하시겠습니까?')) {
      try {
        // useChatRooms의 leaveChatRoom mutation 사용 (낙관적 업데이트 포함)
        await leaveChatRoom(id);
        // refetch()는 필요 없음 (낙관적 업데이트로 즉시 반영됨)
        closeContextMenu();
      } catch (error) {
        console.error('채팅방 삭제 실패:', error);
        alert(error.message || '채팅방 삭제에 실패했습니다.');
      }
    }
  };


  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-gray-500">채팅방 목록을 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️</div>
            <div className="text-red-500 mb-4">채팅방 목록을 불러올 수 없습니다.</div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SideNavbar />
      <div className="flex flex-col h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/products')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">채팅</h1>
            </div>
          </div>

        </div>

        {/* 채팅방 목록 */}
      <div className="flex-1 overflow-y-auto">
        {chatRooms.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {chatRooms.map((chatRoom) => {
              // 백엔드 응답 형식에 맞게 ID 추출
              const roomId = normalizeChatRoomId(resolveRoomId(chatRoom));
              return (
                <div key={roomId}>
                  <ChatRoomListItem
                    chatRoom={chatRoom}
                    onClick={() => handleChatRoomClick(roomId)}
                    onContextMenuOpen={handleOpenContextById}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">채팅방이 없습니다</h3>
            <p className="text-gray-500 mb-4">
              아직 대화한 채팅방이 없습니다.
            </p>
            <button
              onClick={() => navigate('/products')}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              상품 둘러보기
            </button>
          </div>
        )}
        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={closeContextMenu}>
          <div 
            className="absolute bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-2 animate-in zoom-in-95 duration-200"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 200)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <button
                onClick={() => handleTogglePin(contextMenu.roomId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100/50 rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium">
                  {contextMenu.chatRoom.isPinned ? '고정 해제' : '고정하기'}
                </span>
              </button>
              
              <button
                onClick={() => handleToggleMute(contextMenu.roomId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100/50 rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">
                  {contextMenu.chatRoom.isMuted ? '알림 켜기' : '알림 끄기'}
                </span>
              </button>
              
              <div className="border-t border-gray-200/50 my-1"></div>
              
              <button
                onClick={() => handleDeleteChat(contextMenu.roomId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50/50 rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="font-medium">채팅방 나가기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatListPage;
