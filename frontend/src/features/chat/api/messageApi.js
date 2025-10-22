/**
 * Message API functions
 * 메시지 송수신 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 메시지 관련 API
 */
export const messageApi = {
  /**
   * 메시지 목록 조회 (채팅 내역)
   * @param {string} chatRoomId - 채팅방 ID
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.size=50]
   * @param {string} [params.before_message_id] - 커서 (이전 메시지 ID)
   * @returns {Promise<{messages: Array, hasNext: boolean}>}
   */
  getMessages: async (chatRoomId, params = {}) => {
    return await axiosInstance.get(`/chat-rooms/${chatRoomId}/messages`, {
      params: {
        page: params.page || 1,
        size: params.size || 50,
        before_message_id: params.before_message_id
      }
    });
  },

  /**
   * 텍스트 메시지 전송
   * @param {string} chatRoomId - 채팅방 ID
   * @param {Object} data
   * @param {string} data.content - 메시지 내용
   * @param {string} [data.replyTo] - 답장할 메시지 ID
   * @returns {Promise<Object>}
   */
  sendTextMessage: async (chatRoomId, data) => {
    return await axiosInstance.post(`/chat-rooms/${chatRoomId}/messages`, {
      type: 'text',
      content: data.content,
      replyTo: data.replyTo
    });
  },

  /**
   * 파일/이미지 전송
   * @param {string} chatRoomId - 채팅방 ID
   * @param {File} file - 파일
   * @param {string} [replyTo] - 답장할 메시지 ID
   * @returns {Promise<Object>}
   */
  sendFileMessage: async (chatRoomId, file, replyTo = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (replyTo) formData.append('replyTo', replyTo);
    
    return await axiosInstance.post(`/chat-rooms/${chatRoomId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * 메시지 읽음 처리
   * @param {string} messageId - 메시지 ID
   * @returns {Promise<void>}
   */
  markAsRead: async (messageId) => {
    return await axiosInstance.post(`/messages/${messageId}/read`);
  },

  /**
   * 대여 요청 (시스템 메시지)
   * @param {string} chatRoomId - 채팅방 ID
   * @param {Object} data
   * @param {string} data.productId - 상품 ID
   * @param {string} data.startDate - 시작일
   * @param {string} data.endDate - 종료일
   * @returns {Promise<Object>}
   */
  sendRentalRequest: async (chatRoomId, data) => {
    return await axiosInstance.post(`/chat-rooms/${chatRoomId}/rental-request`, data);
  }
};
