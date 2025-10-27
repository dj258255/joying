/**
 * Message API functions
 * 메시지 송수신 관련 API (더미 데이터 사용)
 */

import { DUMMY_MESSAGES, DUMMY_USERS } from '@/shared/constants/dummyData';

/**
 * 메시지 관련 API
 */
export const messageApi = {
  /**
   * 메시지 목록 조회 (채팅 내역)
   * @param {string} chatRoomId - 채팅방 ID
   * @param {Object} [params]
   * @param {number} [params.page=1] - 페이지 번호
   * @param {number} [params.size=50] - 페이지 크기
   * @param {string} [params.before_message_id] - 커서 (이전 메시지 ID)
   * @returns {Promise<Array>}
   */
  getMessages: async (chatRoomId, params = {}) => {
    // 로컬 스토리지에서 메시지 가져오기
    let messages = JSON.parse(localStorage.getItem(`messages_${chatRoomId}`) || '[]');
    
    // 로컬 스토리지가 비어있으면 더미 데이터 사용
    if (messages.length === 0 && DUMMY_MESSAGES[chatRoomId]) {
      messages = [...DUMMY_MESSAGES[chatRoomId]];
      localStorage.setItem(`messages_${chatRoomId}`, JSON.stringify(messages));
    }

    // before_message_id가 있으면 해당 메시지 이전의 메시지들만 반환
    if (params.before_message_id) {
      const beforeIndex = messages.findIndex(msg => msg.id === params.before_message_id);
      if (beforeIndex !== -1) {
        messages = messages.slice(0, beforeIndex);
      }
    }

    // 페이지네이션 적용
    const page = params.page || 1;
    const size = params.size || 50;
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;

    return messages.slice(startIndex, endIndex);
  },

  /**
   * 메시지 전송 (텍스트, 이미지, 대여 요청 등)
   * @param {string} chatRoomId - 채팅방 ID
   * @param {Object} data
   * @param {string} data.content - 메시지 내용
   * @param {string} data.type - 메시지 타입 ('text', 'image', 'rental_request')
   * @param {string} [data.replyTo] - 답장할 메시지 ID
   * @param {Object} [data.rentalInfo] - 대여 요청 정보
   * @returns {Promise<Object>}
   */
  sendMessage: async (chatRoomId, data) => {
    const newMessage = {
      id: `msg_${Date.now()}`,
      content: data.content,
      sender: DUMMY_USERS.currentUser,
      timestamp: new Date().toISOString(),
      type: data.type || 'text',
      replyTo: data.replyTo ? await messageApi.getMessageById(chatRoomId, data.replyTo) : null,
      rentalInfo: data.rentalInfo || null,
      isRead: false
    };

    // 로컬 스토리지에 메시지 저장
    const messages = JSON.parse(localStorage.getItem(`messages_${chatRoomId}`) || '[]');
    messages.push(newMessage);
    localStorage.setItem(`messages_${chatRoomId}`, JSON.stringify(messages));

    // 채팅방 목록의 마지막 메시지 업데이트
    const chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');
    const chatRoom = chatRooms.find(room => room.id === chatRoomId);
    if (chatRoom) {
      chatRoom.lastMessage = {
        id: newMessage.id,
        content: newMessage.type === 'rental_request' ? '대여 요청' : newMessage.content,
        sender: newMessage.sender,
        timestamp: newMessage.timestamp,
        type: newMessage.type
      };
      chatRoom.updatedAt = newMessage.timestamp;
      localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
    }

    return newMessage;
  },

  /**
   * 메시지 ID로 메시지 조회
   * @param {string} chatRoomId - 채팅방 ID
   * @param {string} messageId - 메시지 ID
   * @returns {Promise<Object>}
   */
  getMessageById: async (chatRoomId, messageId) => {
    const messages = JSON.parse(localStorage.getItem(`messages_${chatRoomId}`) || '[]');
    return messages.find(msg => msg.id === messageId);
  },

  /**
   * 메시지 읽음 처리
   * @param {string} chatRoomId - 채팅방 ID
   * @param {string} messageId - 메시지 ID
   * @returns {Promise<void>}
   */
  markAsRead: async (chatRoomId, messageId) => {
    const messages = JSON.parse(localStorage.getItem(`messages_${chatRoomId}`) || '[]');
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      message.isRead = true;
      localStorage.setItem(`messages_${chatRoomId}`, JSON.stringify(messages));
    }
  },

  /**
   * 채팅방의 모든 메시지 읽음 처리
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise<void>}
   */
  markAllAsRead: async (chatRoomId) => {
    const messages = JSON.parse(localStorage.getItem(`messages_${chatRoomId}`) || '[]');
    messages.forEach(msg => {
      if (msg.sender.id !== DUMMY_USERS.currentUser.id) {
        msg.isRead = true;
      }
    });
    localStorage.setItem(`messages_${chatRoomId}`, JSON.stringify(messages));

    // 채팅방 목록의 읽지 않은 메시지 수 초기화
    const chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');
    const chatRoom = chatRooms.find(room => room.id === chatRoomId);
    if (chatRoom) {
      chatRoom.unreadCount = 0;
      localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
    }
  },

  /**
   * 대여 요청 메시지 전송
   * @param {string} chatRoomId - 채팅방 ID
   * @param {Object} data
   * @param {string} data.productId - 상품 ID
   * @param {string} data.startDate - 시작일
   * @param {string} data.endDate - 종료일
   * @param {Object} data.rentalInfo - 대여 정보
   * @returns {Promise<Object>}
   */
  sendRentalRequest: async (chatRoomId, data) => {
    const rentalMessage = {
      id: `msg_${Date.now()}`,
      content: `${data.rentalInfo.productTitle} 대여를 요청합니다.`,
      sender: DUMMY_USERS.currentUser,
      timestamp: new Date().toISOString(),
      type: 'rental_request',
      rentalInfo: data.rentalInfo,
      isRead: false
    };

    // 로컬 스토리지에 메시지 저장
    const messages = JSON.parse(localStorage.getItem(`messages_${chatRoomId}`) || '[]');
    messages.push(rentalMessage);
    localStorage.setItem(`messages_${chatRoomId}`, JSON.stringify(messages));

    // 채팅방 목록의 마지막 메시지 업데이트
    const chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');
    const chatRoom = chatRooms.find(room => room.id === chatRoomId);
    if (chatRoom) {
      chatRoom.lastMessage = {
        id: rentalMessage.id,
        content: '대여 요청',
        sender: rentalMessage.sender,
        timestamp: rentalMessage.timestamp,
        type: rentalMessage.type
      };
      chatRoom.updatedAt = rentalMessage.timestamp;
      localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
    }

    return rentalMessage;
  }
};
