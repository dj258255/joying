/**
 * Chat API functions
 * 채팅방 CRUD 관련 API (더미 데이터 사용)
 */

import { DUMMY_CHAT_ROOMS, DUMMY_MESSAGES, DUMMY_USERS } from '@/shared/constants/dummyData';

/**
 * 채팅방 관련 API
 */
export const chatApi = {
  /**
   * 채팅방 생성
   * @param {string} sellerId - 판매자 ID
   * @returns {Promise<string>} 채팅방 ID
   */
  createChatRoom: async (sellerId) => {
    // 로컬 스토리지에서 기존 채팅방 목록 가져오기
    const chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');
    
    // 로컬 스토리지가 비어있으면 더미 데이터 사용
    if (chatRooms.length === 0) {
      chatRooms.push(...DUMMY_CHAT_ROOMS);
      localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
    }

    // 같은 사람과의 기존 채팅방이 있는지 확인
    const existingChatRoom = chatRooms.find(room => {
      const participantIds = room.participants.map(p => p.id);
      return participantIds.includes(101) && 
             participantIds.includes(sellerId) &&
             participantIds.length === 2;
    });

    // 기존 채팅방이 있으면 해당 채팅방 ID 반환
    if (existingChatRoom) {
      return existingChatRoom.id;
    }

    // 새로운 채팅방 생성
    const newChatRoomId = `chat_${Date.now()}`;
    const seller = DUMMY_USERS.others.find(user => user.userId === sellerId) || DUMMY_USERS.currentUser;
    
    if (!seller) {
      throw new Error('판매자를 찾을 수 없습니다.');
    }

    const newChatRoom = {
      id: newChatRoomId,
      name: seller.username,
      participants: [
        { id: 101, profileImage: null },
        { id: sellerId, profileImage: null }
      ],
      lastMessage: null,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    chatRooms.unshift(newChatRoom);
    localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
    
    return newChatRoomId;
  },

  /**
   * 내 채팅방 목록 조회
   * @param {Object} [params]
   * @param {number} [params.page=1] - 페이지 번호
   * @param {number} [params.size=20] - 페이지 크기
   * @param {string} [params.search] - 검색어
   * @returns {Promise<Array>}
   */
  getChatRooms: async (params = {}) => {
    // 로컬 스토리지 초기화 (테스트용)
    localStorage.removeItem('chatRooms');
    
    // 로컬 스토리지에서 채팅방 목록 가져오기
    let chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');
    
    // 로컬 스토리지가 비어있으면 더미 데이터 사용
    if (chatRooms.length === 0) {
      chatRooms = [...DUMMY_CHAT_ROOMS];
      localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
      console.log('더미 채팅방 데이터 로드:', chatRooms);
    }

    // 고정된 채팅방을 먼저 정렬
    chatRooms.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    // 페이지네이션 적용
    const page = params.page || 1;
    const size = params.size || 20;
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;

    return chatRooms.slice(startIndex, endIndex);
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
  }
};
