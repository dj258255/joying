/**
 * Message API functions
 * 메시지 조회, 수정, 삭제 관련 API (백엔드 연동)
 * 메시지 전송은 WebSocket을 통해 처리됩니다.
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

const findFirstArray = (value, depth = 0) => {
  if (!value || depth > 6) return null;
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const found = findFirstArray(value[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
};

/**
 * 메시지 관련 API
 */
export const messageApi = {
  /**
   * 메시지 목록 조회 및 검색
   * GET /api/v1/chat-rooms/{chatRoomId}/messages
   * 
   * 백엔드 스펙:
   * - Query Parameters:
   *   - keyword (optional): 검색 키워드 (있으면 검색 모드)
   *   - before (optional): ISO8601 형식 - 이 시간 이전의 메시지 조회 (과거 방향, 최신순)
   *   - after (optional): ISO8601 형식 - 이 시간 이후의 메시지 조회 (놓친 메시지, 오래된 순)
   *   - page (optional, default: 0): 페이지 번호 (검색 모드에서만 사용)
   *   - size (optional, default: 20): 가져올 개수
   * - 응답: ApiResponse.SuccessBody<List<ChatMessageResponse>>
   * 
   * @param {string|number} chatRoomId - 채팅방 ID
   * @param {Object} [params] - 조회 파라미터
   * @param {string} [params.keyword] - 검색 키워드 (있으면 검색 모드)
   * @param {string|Date} [params.before] - 이 시간 이전의 메시지 조회 (ISO8601 형식, 과거 방향)
   * @param {string|Date} [params.after] - 이 시간 이후의 메시지 조회 (ISO8601 형식, 놓친 메시지)
   * @param {number} [params.page=0] - 페이지 번호 (검색 모드에서만 사용)
   * @param {number} [params.size=20] - 가져올 개수
   * @returns {Promise<Array>} 메시지 목록
   */
  getMessages: async (chatRoomId, params = {}) => {
    // chatRoomId를 숫자로 변환 (백엔드는 Long 타입을 기대)
    const chatRoomIdNum = Number(chatRoomId);
    if (!chatRoomIdNum || isNaN(chatRoomIdNum) || chatRoomIdNum <= 0) {
      console.error('[messageApi] 유효하지 않은 채팅방 ID:', chatRoomId);
      return [];
    }
    
    try {
      const { keyword, before, after, page = 0, size = 20 } = params;
      
      const queryParams = {};
      
      if (keyword) {
        // 검색 모드
        queryParams.keyword = keyword;
        queryParams.page = page;
        queryParams.size = size;
      } else {
        // 일반 조회 모드
        if (before) {
          // ISO8601 형식으로 변환
          const beforeDate = before instanceof Date ? before.toISOString() : before;
          queryParams.before = beforeDate;
        }
        if (after) {
          // ISO8601 형식으로 변환
          const afterDate = after instanceof Date ? after.toISOString() : after;
          queryParams.after = afterDate;
        }
        queryParams.size = size;
      }
      
      console.log('[messageApi] 메시지 목록 조회 요청:', { chatRoomId: chatRoomIdNum, queryParams });
      
      const response = await axiosInstance.get(`/chat-rooms/${chatRoomIdNum}/messages`, {
        params: queryParams
      });
      
      console.log('[messageApi] 메시지 목록 조회 응답:', {
        status: response.status,
        messageCount: Array.isArray(response.data?.data) ? response.data.data.length : Array.isArray(response.data?.data?.content) ? response.data.data.content.length : Array.isArray(response.data?.body?.data) ? response.data.body.data.length : Array.isArray(response.data?.body?.data?.content) ? response.data.body.data.content.length : 0
      });
      console.log('[messageApi] 메시지 목록 응답 원본:', response.data);

      let rawMessages = null;

      if (Array.isArray(response.data?.data)) {
        rawMessages = response.data.data;
      } else if (Array.isArray(response.data?.data?.content)) {
        rawMessages = response.data.data.content;
      } else if (Array.isArray(response.data?.body?.data)) {
        rawMessages = response.data.body.data;
      } else if (Array.isArray(response.data?.body?.data?.content)) {
        rawMessages = response.data.body.data.content;
      }

      if (!rawMessages) {
        rawMessages = findFirstArray(response.data);
      }

      if (rawMessages) {
        return rawMessages;
      }
      
      // 응답이 배열 형식이 아닌 경우 빈 배열 반환
      console.warn('[messageApi] 메시지 목록 응답 형식이 예상과 다릅니다:', response.data);
      return [];
    } catch (error) {
      console.error('[messageApi] 메시지 목록 조회 실패:', {
        chatRoomId: chatRoomIdNum,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // 404 에러는 빈 배열 반환 (채팅방에 메시지가 없는 경우)
      if (error.response?.status === 404) {
        console.warn('[messageApi] 메시지를 찾을 수 없습니다. 빈 배열 반환.');
        return [];
      }
      
      // 401 에러는 인증 문제
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다. 먼저 로그인해주세요.');
      }
      
      // 기타 에러는 빈 배열 반환하여 UI가 깨지지 않도록 함
      console.warn('[messageApi] 메시지 목록 조회 실패. 빈 배열 반환.');
      return [];
    }
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
    const sender = data.sender || {
      id: DUMMY_USERS.currentUser.id,
      username: DUMMY_USERS.currentUser.username,
      profileImageUrl: DUMMY_USERS.currentUser.profileImageUrl
    };

    const newMessage = {
      id: `msg_${Date.now()}`,
      content: data.content,
      sender: sender,
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
      // 읽지 않은 메시지 수 업데이트 (본인이 보낸 메시지가 아닌 경우)
      if (newMessage.sender?.id !== DUMMY_USERS.currentUser.id) {
        chatRoom.unreadCount = (chatRoom.unreadCount || 0) + 1;
      }
      localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
      
      // 커스텀 이벤트 발생 (같은 탭 내 실시간 업데이트)
      window.dispatchEvent(new Event('chatRoomsUpdated'));
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
      
      // 커스텀 이벤트 발생
      window.dispatchEvent(new Event('chatRoomsUpdated'));
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
    const sender = data.sender || {
      id: DUMMY_USERS.currentUser.id,
      username: DUMMY_USERS.currentUser.username,
      profileImageUrl: DUMMY_USERS.currentUser.profileImageUrl
    };

    const rentalMessage = {
      id: `msg_${Date.now()}`,
      content: `${data.rentalInfo.productTitle} 대여를 요청합니다.`,
      sender: sender,
      timestamp: new Date().toISOString(),
      type: 'rental_request',
      productId: data.productId,
      startDate: data.startDate,
      endDate: data.endDate,
      rentalInfo: data.rentalInfo,
      status: 'pending', // 'pending', 'approved', 'rejected'
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
      // 읽지 않은 메시지 수는 채팅방을 열었을 때만 증가 (로컬 스토리지에서는 제한적)
      localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
      
      // 커스텀 이벤트 발생 (같은 탭 내 실시간 업데이트)
      window.dispatchEvent(new Event('chatRoomsUpdated'));
    }

    return rentalMessage;
  },

  /**
   * 메시지 삭제
   * DELETE /api/v1/chat-rooms/{chatRoomId}/messages/{messageId}
   * 
   * @param {string|number} chatRoomId - 채팅방 ID
   * @param {string} messageId - 메시지 ID (MongoDB ObjectId)
   * @returns {Promise<void>}
   */
  deleteMessage: async (chatRoomId, messageId) => {
    const chatRoomIdNum = Number(chatRoomId);
    if (!chatRoomIdNum || isNaN(chatRoomIdNum) || chatRoomIdNum <= 0) {
      throw new Error('유효하지 않은 채팅방 ID입니다.');
    }
    if (!messageId) {
      throw new Error('메시지 ID가 필요합니다.');
    }

    try {
      console.log('[messageApi] 메시지 삭제 요청:', { chatRoomId: chatRoomIdNum, messageId });
      
      const response = await axiosInstance.delete(`/chat-rooms/${chatRoomIdNum}/messages/${messageId}`);
      
      console.log('[messageApi] 메시지 삭제 완료:', { status: response.status });
      
      // 204 No Content 응답
      return;
    } catch (error) {
      console.error('[messageApi] 메시지 삭제 실패:', {
        chatRoomId: chatRoomIdNum,
        messageId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      if (error.response?.status === 403) {
        throw new Error('본인의 메시지만 삭제할 수 있습니다.');
      }
      if (error.response?.status === 404) {
        throw new Error('메시지를 찾을 수 없습니다.');
      }

      throw new Error(error.response?.data?.message || error.message || '메시지 삭제에 실패했습니다.');
    }
  },

  /**
   * 메시지 수정
   * PATCH /api/v1/chat-rooms/{chatRoomId}/messages/{messageId}
   * 
   * @param {string|number} chatRoomId - 채팅방 ID
   * @param {string} messageId - 메시지 ID (MongoDB ObjectId)
   * @param {string} content - 수정할 메시지 내용
   * @returns {Promise<Object>} 수정된 메시지
   */
  updateMessage: async (chatRoomId, messageId, content) => {
    const chatRoomIdNum = Number(chatRoomId);
    if (!chatRoomIdNum || isNaN(chatRoomIdNum) || chatRoomIdNum <= 0) {
      throw new Error('유효하지 않은 채팅방 ID입니다.');
    }
    if (!messageId) {
      throw new Error('메시지 ID가 필요합니다.');
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('메시지 내용이 필요합니다.');
    }

    try {
      console.log('[messageApi] 메시지 수정 요청:', { chatRoomId: chatRoomIdNum, messageId, content: content.substring(0, 50) });
      
      const response = await axiosInstance.patch(
        `/chat-rooms/${chatRoomIdNum}/messages/${messageId}`,
        { content: content.trim() }
      );
      
      console.log('[messageApi] 메시지 수정 완료:', { status: response.status });

      // 응답 데이터 추출
      let updatedMessage = null;
      if (response.data?.data) {
        updatedMessage = response.data.data;
      } else if (response.data) {
        updatedMessage = response.data;
      }

      if (!updatedMessage) {
        throw new Error('수정된 메시지 데이터를 받지 못했습니다.');
      }

      return updatedMessage;
    } catch (error) {
      console.error('[messageApi] 메시지 수정 실패:', {
        chatRoomId: chatRoomIdNum,
        messageId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || '메시지 수정에 실패했습니다. (TEXT 타입만 수정 가능)');
      }
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      if (error.response?.status === 403) {
        throw new Error('본인의 메시지만 수정할 수 있습니다.');
      }
      if (error.response?.status === 404) {
        throw new Error('메시지를 찾을 수 없습니다.');
      }

      throw new Error(error.response?.data?.message || error.message || '메시지 수정에 실패했습니다.');
    }
  },

  /**
   * 파일 업로드
   * POST /api/v1/chat-rooms/{chatRoomId}/upload
   * 
   * @param {string|number} chatRoomId - 채팅방 ID
   * @param {File} file - 업로드할 파일
   * @returns {Promise<Object>} { fileId, url, fileName, fileSize, fileType }
   */
  uploadFile: async (chatRoomId, file) => {
    const chatRoomIdNum = Number(chatRoomId);
    if (!chatRoomIdNum || isNaN(chatRoomIdNum) || chatRoomIdNum <= 0) {
      throw new Error('유효하지 않은 채팅방 ID입니다.');
    }
    if (!file || !(file instanceof File)) {
      throw new Error('파일이 필요합니다.');
    }

    try {
      console.log('[messageApi] 파일 업로드 요청:', { 
        chatRoomId: chatRoomIdNum, 
        fileName: file.name, 
        fileSize: file.size, 
        fileType: file.type 
      });

      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosInstance.post(
        `/chat-rooms/${chatRoomIdNum}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('[messageApi] 파일 업로드 완료:', { status: response.status });

      // 응답 데이터 추출
      let fileData = null;
      if (response.data?.data) {
        fileData = response.data.data;
      } else if (response.data) {
        fileData = response.data;
      }

      if (!fileData) {
        throw new Error('파일 업로드 응답 데이터를 받지 못했습니다.');
      }

      return fileData;
    } catch (error) {
      console.error('[messageApi] 파일 업로드 실패:', {
        chatRoomId: chatRoomIdNum,
        fileName: file.name,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || '파일 업로드에 실패했습니다.');
      }
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      if (error.response?.status === 403) {
        throw new Error('채팅방 참여자만 파일을 업로드할 수 있습니다.');
      }
      if (error.response?.status === 413) {
        throw new Error('파일 크기가 너무 큽니다. (이미지: 10MB, 일반 파일: 50MB)');
      }

      throw new Error(error.response?.data?.message || error.message || '파일 업로드에 실패했습니다.');
    }
  },

  /**
   * 메시지 업데이트 (대여 요청 승인/거절 등 - 기존 호환성 유지)
   * @param {string} chatRoomId - 채팅방 ID
   * @param {string} messageId - 메시지 ID
   * @param {Object} updates - 업데이트할 내용
   * @returns {Promise<Object>}
   * @deprecated 대여 요청 승인/거절용. 일반 메시지 수정은 updateMessage 사용
   */
  updateMessageStatus: async (chatRoomId, messageId, updates) => {
    // 대여 요청 승인/거절 등은 별도 API가 없으므로 기존 로직 유지
    // 실제로는 WebSocket으로 처리되거나 별도 API가 필요할 수 있음
    console.warn('[messageApi] updateMessageStatus는 deprecated입니다. updateMessage를 사용하세요.');
    return messageApi.updateMessage(chatRoomId, messageId, updates.content || '');
  }
};
