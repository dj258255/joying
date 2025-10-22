/**
 * Chat API functions
 * 채팅방 CRUD 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const chatApi = {
  /**
   * 채팅방 목록 조회
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise} 채팅방 목록
   */
  getChatRooms: (params) => 
    axiosInstance.get('/chats', { params }),

  /**
   * 채팅방 생성
   * @param {Object} chatRoomData - 채팅방 데이터
   * @returns {Promise} 생성된 채팅방
   */
  createChatRoom: (chatRoomData) => 
    axiosInstance.post('/chats', chatRoomData),

  /**
   * 채팅방 상세 조회
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise} 채팅방 상세 정보
   */
  getChatRoom: (chatRoomId) => 
    axiosInstance.get(`/chats/${chatRoomId}`),

  /**
   * 채팅방 수정
   * @param {string} chatRoomId - 채팅방 ID
   * @param {Object} chatRoomData - 수정할 채팅방 데이터
   * @returns {Promise} 수정된 채팅방
   */
  updateChatRoom: (chatRoomId, chatRoomData) => 
    axiosInstance.put(`/chats/${chatRoomId}`, chatRoomData),

  /**
   * 채팅방 삭제
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise} 삭제 응답
   */
  deleteChatRoom: (chatRoomId) => 
    axiosInstance.delete(`/chats/${chatRoomId}`)
};
