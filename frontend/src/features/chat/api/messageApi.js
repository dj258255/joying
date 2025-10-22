/**
 * Message API functions
 * 메시지 송수신 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const messageApi = {
  /**
   * 메시지 목록 조회
   * @param {string} chatRoomId - 채팅방 ID
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise} 메시지 목록
   */
  getMessages: (chatRoomId, params) => 
    axiosInstance.get(`/chats/${chatRoomId}/messages`, { params }),

  /**
   * 메시지 전송
   * @param {string} chatRoomId - 채팅방 ID
   * @param {Object} messageData - 메시지 데이터
   * @returns {Promise} 전송된 메시지
   */
  sendMessage: (chatRoomId, messageData) => 
    axiosInstance.post(`/chats/${chatRoomId}/messages`, messageData),

  /**
   * 메시지 수정
   * @param {string} messageId - 메시지 ID
   * @param {Object} messageData - 수정할 메시지 데이터
   * @returns {Promise} 수정된 메시지
   */
  updateMessage: (messageId, messageData) => 
    axiosInstance.put(`/messages/${messageId}`, messageData),

  /**
   * 메시지 삭제
   * @param {string} messageId - 메시지 ID
   * @returns {Promise} 삭제 응답
   */
  deleteMessage: (messageId) => 
    axiosInstance.delete(`/messages/${messageId}`)
};
