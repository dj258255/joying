/**
 * Chat API functions
 * 채팅방 CRUD 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 채팅방 관련 API
 */
export const chatApi = {
  /**
   * 채팅방 생성
   * @param {Object} data
   * @param {string[]} data.participantIds - 참가자 ID 목록
   * @param {string} data.type - 채팅방 타입 ('direct' | 'group')
   * @returns {Promise<Object>}
   */
  createChatRoom: async (data) => {
    return await axiosInstance.post('/chat-rooms', data);
  },

  /**
   * 내 채팅방 목록 조회
   * @param {Object} [params]
   * @param {number} [params.page=1] - 페이지 번호
   * @param {number} [params.size=20] - 페이지 크기
   * @returns {Promise<{items: Array, total: number, page: number}>}
   */
  getChatRooms: async (params = {}) => {
    return await axiosInstance.get('/chat-rooms', {
      params: {
        member: 'me',
        page: params.page || 1,
        size: params.size || 20
      }
    });
  },

  /**
   * 채팅방 상세 조회
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise<Object>}
   */
  getChatRoomDetail: async (chatRoomId) => {
    return await axiosInstance.get(`/chat-rooms/${chatRoomId}`);
  },

  /**
   * 채팅방 고정/해제
   * @param {string} chatRoomId - 채팅방 ID
   * @param {string} memberId - 멤버 ID
   * @returns {Promise<{pinned: boolean}>}
   */
  togglePinChatRoom: async (chatRoomId, memberId) => {
    return await axiosInstance.patch(`/chat-rooms/${chatRoomId}/members/${memberId}/pin`);
  },

  /**
   * 채팅방 알림 설정 (뮤트)
   * @param {string} chatRoomId - 채팅방 ID
   * @param {string} memberId - 멤버 ID
   * @returns {Promise<{muted: boolean}>}
   */
  toggleMuteChatRoom: async (chatRoomId, memberId) => {
    return await axiosInstance.patch(`/chat-rooms/${chatRoomId}/members/${memberId}/mute`);
  },

  /**
   * 채팅방 나가기
   * @param {string} chatRoomId - 채팅방 ID
   * @param {string} memberId - 멤버 ID
   * @returns {Promise<void>}
   */
  leaveChatRoom: async (chatRoomId, memberId) => {
    return await axiosInstance.post(`/chat-rooms/${chatRoomId}/members/${memberId}`);
  }
};
