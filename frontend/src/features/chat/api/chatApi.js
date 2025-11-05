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
      
      const response = await axiosInstance.post('/chat-rooms', {
        productId: Number(productId)
      });
      
      console.log('[chatApi] 채팅방 생성 응답:', response.data);
      
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('채팅방 생성 응답 형식이 올바르지 않습니다.');
    } catch (error) {
      console.error('[chatApi] 채팅방 생성 실패:', error);
      
      if (error.response) {
        // 백엔드에서 반환한 에러 메시지
        const errorMessage = error.response.data?.message || error.response.data?.error || '채팅방 생성에 실패했습니다.';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  },

  /**
   * 내 채팅방 목록 조회
   * GET /chat-rooms/
   * @returns {Promise<Object>} { chatRooms: Array, totalUnreadCount: number }
   */
  getChatRooms: async () => {
    try {
      console.log('[chatApi] 채팅방 목록 조회 요청');
      
      const response = await axiosInstance.get('/chat-rooms/');
      
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
      
      if (error.response) {
        // 백엔드에서 반환한 에러 메시지
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
