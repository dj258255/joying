/**
 * Chat API functions
 * 채팅방 CRUD 관련 API (백엔드 연동)
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 채팅방 관련 API
 */
export const chatApi = {
  /**
   * 채팅방 생성 또는 조회
   * POST /chat-rooms
   * @param {number|string} productId - 상품 ID
   * @returns {Promise<Object>} 채팅방 정보 { chatRoomId, productId, ... }
   */
  createChatRoom: async (productId) => {
    try {
      console.log('[chatApi] 채팅방 생성 요청:', { productId });
      
      let response;
      try {
        response = await axiosInstance.post('/chat-rooms', {
          productId: Number(productId)
        });
      } catch (firstError) {
        const status = firstError.response?.status;
        // 경로 차이 또는 메서드 제한 가능성: 404/405면 슬래시 버전으로 재시도
        if (status === 404 || status === 405) {
          console.log('[chatApi] /chat-rooms 실패, /chat-rooms/ 재시도');
          response = await axiosInstance.post('/chat-rooms/', {
            productId: Number(productId)
          });
        } else {
          throw firstError;
        }
      }
      
      console.log('[chatApi] 채팅방 생성 응답:', response.data);
      
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('채팅방 생성 응답 형식이 올바르지 않습니다.');
    } catch (error) {
      console.error('[chatApi] 채팅방 생성 실패:', error);
      
      if (error.response) {
        const status = error.response.status;
        // 인증 필요
        if (status === 401) {
          throw new Error('로그인이 필요합니다. 먼저 로그인해주세요.');
        }
        // 존재하지 않거나 메서드 불가
        if (status === 404 || status === 405) {
          throw new Error('채팅방 생성 API를 찾을 수 없습니다. 서버 엔드포인트를 확인해주세요.');
        }
        // 서버 오류는 사용자 친화 메시지
        if (status === 500) {
          throw new Error('서버 내부 오류로 채팅방을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
        
        const errorMessage = error.response.data?.message || error.response.data?.error || '채팅방 생성에 실패했습니다.';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  },

  /**
   * 내 채팅방 목록 조회
   * GET /chat-rooms/ (또는 /chat-rooms)
   * @returns {Promise<Object>} { chatRooms: Array, totalUnreadCount: number }
   */
  getChatRooms: async () => {
    try {
      console.log('[chatApi] 채팅방 목록 조회 요청');
      
      // 슬래시 없이도 시도
      let response;
      try {
        response = await axiosInstance.get('/chat-rooms/');
      } catch (firstError) {
        // 404 에러이고 슬래시가 있는 경우 슬래시 없이 재시도
        if (firstError.response?.status === 404) {
          console.log('[chatApi] /chat-rooms/ 실패, /chat-rooms 재시도');
          try {
            response = await axiosInstance.get('/chat-rooms');
          } catch (secondError) {
            // 두 경로 모두 실패하면 404를 빈 배열로 처리
            if (secondError.response?.status === 404) {
              console.warn('[chatApi] 채팅방 목록 API가 아직 구현되지 않았습니다. 빈 배열 반환.');
              return {
                chatRooms: [],
                totalUnreadCount: 0
              };
            }
            throw secondError;
          }
        } else {
          throw firstError;
        }
      }
      
      console.log('[chatApi] 채팅방 목록 조회 응답:', response.data);
      
      // 응답 헤더에서 총 안읽은 메시지 개수 추출
      const totalUnreadCount = Number(response.headers['x-total-unread-count']) || 0;
      
      if (response.data && Array.isArray(response.data.data)) {
        return {
          chatRooms: response.data.data,
          totalUnreadCount
        };
      }
      
      // 응답 형식이 다를 경우 빈 배열 반환
      return {
        chatRooms: [],
        totalUnreadCount: 0
      };
    } catch (error) {
      console.error('[chatApi] 채팅방 목록 조회 실패:', error);

      // 404 또는 500은 빈 목록으로 graceful degrade
      const status = error.response?.status;
      if (status === 404 || status === 500) {
        console.warn(`[chatApi] 채팅방 목록 API ${status} 응답. 빈 배열 반환.`);
        return {
          chatRooms: [],
          totalUnreadCount: 0
        };
      }

      if (error.response) {
        // 그 외 에러는 메시지 전달
        const errorMessage = error.response.data?.message || error.response.data?.error || '채팅방 목록을 불러올 수 없습니다.';
        throw new Error(errorMessage);
      }

      throw error;
    }
  },

  /**
   * 채팅방 상세 조회
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise<Object>}
   */
  getChatRoomDetail: async (chatRoomId) => {
    const chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');
    const chatRoom = chatRooms.find(room => room.id === chatRoomId);
    
    if (!chatRoom) {
      throw new Error('채팅방을 찾을 수 없습니다.');
    }

    return chatRoom;
  },

  /**
   * 채팅방 고정/해제
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise<{pinned: boolean}>}
   */
  togglePinChatRoom: async (chatRoomId) => {
    const chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');
    const chatRoom = chatRooms.find(room => room.id === chatRoomId);
    
    if (chatRoom) {
      chatRoom.isPinned = !chatRoom.isPinned;
      localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
      
      // 커스텀 이벤트 발생
      window.dispatchEvent(new Event('chatRoomsUpdated'));
      
      return { pinned: chatRoom.isPinned };
    }
    
    throw new Error('채팅방을 찾을 수 없습니다.');
  },

  /**
   * 채팅방 알림 설정 (뮤트)
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise<{muted: boolean}>}
   */
  toggleMuteChatRoom: async (chatRoomId) => {
    const chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');
    const chatRoom = chatRooms.find(room => room.id === chatRoomId);
    
    if (chatRoom) {
      chatRoom.isMuted = !chatRoom.isMuted;
      localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
      
      // 커스텀 이벤트 발생
      window.dispatchEvent(new Event('chatRoomsUpdated'));
      
      return { muted: chatRoom.isMuted };
    }
    
    throw new Error('채팅방을 찾을 수 없습니다.');
  },

  /**
   * 채팅방 나가기
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise<void>}
   */
  leaveChatRoom: async (chatRoomId) => {
    const chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');
    const filteredRooms = chatRooms.filter(room => room.id !== chatRoomId);
    localStorage.setItem('chatRooms', JSON.stringify(filteredRooms));
    
    // 커스텀 이벤트 발생
    window.dispatchEvent(new Event('chatRoomsUpdated'));
  }
};
