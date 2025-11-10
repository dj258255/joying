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
   * POST /api/v1/chat-rooms
   * 
   * 백엔드 스펙:
   * - 요청: { productId: Long }
   * - 응답: ApiResponse.SuccessBody<ChatRoomResponse>
   *   {
   *     status: 200,
   *     message: "채팅방이 생성되었습니다",
   *     data: {
   *       chatRoomId: Long,
   *       productId: Long,
   *       productTitle: String,
   *       productImageUrl: String?,
   *       otherMemberId: Long,
   *       otherMemberNickname: String,
   *       otherMemberProfileUrl: String?,
   *       lastMessage: String?,
   *       lastMessageAt: Instant?,
   *       unreadCount: Long,
   *       status: ChatRoomStatus,
   *       isPinned: Boolean,
   *       isMuted: Boolean,
   *       member: MemberInfo? (선택적)
   *     },
   *     timestamp: String
   *   }
   * 
   * @param {number|string} productId - 상품 ID
   * @returns {Promise<Object>} ChatRoomResponse 객체
   */
  createChatRoom: async (productId) => {
    try {
      // productId 검증
      const productIdNum = Number(productId);
      if (!productIdNum || isNaN(productIdNum) || productIdNum <= 0) {
        throw new Error('유효하지 않은 상품 ID입니다.');
      }

      console.log('[chatApi] 채팅방 생성 요청:', { productId: productIdNum });
      
      // 백엔드 API 호출
      const response = await axiosInstance.post('/chat-rooms', {
        productId: productIdNum
      });
      
      console.log('[chatApi] 채팅방 생성 응답:', response.data);
      
      // 백엔드 응답 형식: ApiResponse.SuccessBody<ChatRoomResponse>
      // { status, message, data: ChatRoomResponse, timestamp }
      if (response.data && response.data.data) {
        const chatRoomData = response.data.data;
        
        // 필수 필드 검증
        if (!chatRoomData.chatRoomId) {
          throw new Error('채팅방 ID가 응답에 없습니다.');
        }
        
        console.log('[chatApi] 채팅방 생성 성공:', {
          chatRoomId: chatRoomData.chatRoomId,
          productId: chatRoomData.productId,
          productTitle: chatRoomData.productTitle
        });
        
        return chatRoomData;
      }
      
      throw new Error('채팅방 생성 응답 형식이 올바르지 않습니다. 응답 데이터가 없습니다.');
    } catch (error) {
      console.error('[chatApi] 채팅방 생성 실패:', {
        productId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // HTTP 에러 응답 처리
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        // 401: 인증 실패
        if (status === 401) {
          throw new Error('로그인이 필요합니다. 먼저 로그인해주세요.');
        }
        
        // 400: 잘못된 요청 (productId 누락 등)
        if (status === 400) {
          const errorMessage = errorData?.message || '잘못된 요청입니다. 상품 ID를 확인해주세요.';
          throw new Error(errorMessage);
        }
        
        // 404: API 엔드포인트 없음
        if (status === 404) {
          throw new Error('채팅방 생성 API를 찾을 수 없습니다. 서버 엔드포인트를 확인해주세요.');
        }
        
        // 500: 서버 오류
        if (status === 500) {
          throw new Error('서버 내부 오류로 채팅방을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
        
        // 기타 에러: 백엔드 에러 메시지 사용
        const errorMessage = errorData?.message || errorData?.error || '채팅방 생성에 실패했습니다.';
        throw new Error(errorMessage);
      }
      
      // 네트워크 에러 또는 기타 에러
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
      
      const response = await axiosInstance.get('/chat-rooms');
      
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
   * GET /api/v1/chat-rooms/{chatRoomId}
   * 
   * 백엔드 스펙:
   * - Query Parameter: include (optional, 예: "member" - 참여자 온라인 상태 포함)
   * - 응답: ApiResponse.SuccessBody<ChatRoomResponse>
   *   {
   *     status: 200,
   *     message: "채팅방 상세 조회 완료",
   *     data: ChatRoomResponse,
   *     timestamp: String
   *   }
   * 
   * @param {number|string} chatRoomId - 채팅방 ID
   * @param {Object} [options] - 옵션
   * @param {string} [options.include] - 포함할 추가 정보 (예: "member")
   * @returns {Promise<Object>} ChatRoomResponse 객체
   */
  getChatRoomDetail: async (chatRoomId, options = {}) => {
    try {
      // chatRoomId 검증
      const chatRoomIdNum = Number(chatRoomId);
      if (!chatRoomIdNum || isNaN(chatRoomIdNum) || chatRoomIdNum <= 0) {
        throw new Error('유효하지 않은 채팅방 ID입니다.');
      }

      console.log('[chatApi] 채팅방 상세 조회 요청:', { chatRoomId: chatRoomIdNum, include: options.include });
      
      // Query Parameter 설정
      const params = {};
      if (options.include) {
        params.include = options.include;
      }
      
      // 백엔드 API 호출
      const response = await axiosInstance.get(`/chat-rooms/${chatRoomIdNum}`, {
        params
      });
      
      console.log('[chatApi] 채팅방 상세 조회 응답:', response.data);
      
      // 백엔드 응답 형식: ApiResponse.SuccessBody<ChatRoomResponse>
      if (response.data && response.data.data) {
        const chatRoomData = response.data.data;
        
        // 필수 필드 검증
        if (!chatRoomData.chatRoomId) {
          throw new Error('채팅방 ID가 응답에 없습니다.');
        }
        
        console.log('[chatApi] 채팅방 상세 조회 성공:', {
          chatRoomId: chatRoomData.chatRoomId,
          productId: chatRoomData.productId,
          productTitle: chatRoomData.productTitle
        });
        
        return chatRoomData;
      }
      
      throw new Error('채팅방 상세 조회 응답 형식이 올바르지 않습니다. 응답 데이터가 없습니다.');
    } catch (error) {
      console.error('[chatApi] 채팅방 상세 조회 실패:', {
        chatRoomId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // HTTP 에러 응답 처리
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        // 401: 인증 실패
        if (status === 401) {
          throw new Error('로그인이 필요합니다. 먼저 로그인해주세요.');
        }
        
        // 403: 권한 없음
        if (status === 403) {
          throw new Error('이 채팅방에 접근할 권한이 없습니다.');
        }
        
        // 404: 채팅방 없음
        if (status === 404) {
          throw new Error('채팅방을 찾을 수 없습니다.');
        }
        
        // 500: 서버 오류
        if (status === 500) {
          throw new Error('서버 내부 오류로 채팅방 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
        
        // 기타 에러: 백엔드 에러 메시지 사용
        const errorMessage = errorData?.message || errorData?.error || '채팅방 상세 조회에 실패했습니다.';
        throw new Error(errorMessage);
      }
      
      // 네트워크 에러 또는 기타 에러
      throw error;
    }
  },

  /**
   * 채팅방 설정 업데이트 (고정/알림)
   * PATCH /chat-rooms/{chatRoomId}/settings
   * @param {number|string} chatRoomId
   * @param {{ isPinned?: boolean|null, isMuted?: boolean|null }} settings
   * @returns {Promise<{isPinned?: boolean, isMuted?: boolean}>}
   */
  updateChatRoomSettings: async (chatRoomId, settings = {}) => {
    const chatRoomIdNum = Number(chatRoomId);
    if (!chatRoomIdNum || Number.isNaN(chatRoomIdNum) || chatRoomIdNum <= 0) {
      throw new Error('유효하지 않은 채팅방 ID입니다.');
    }

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(settings, 'isPinned')) {
      payload.isPinned = settings.isPinned;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'isMuted')) {
      payload.isMuted = settings.isMuted;
    }

    if (Object.keys(payload).length === 0) {
      return {};
    }

    try {
      console.log('[chatApi] 채팅방 설정 업데이트 요청:', { chatRoomId: chatRoomIdNum, payload });

      const response = await axiosInstance.patch(`/chat-rooms/${chatRoomIdNum}/settings`, payload);

      console.log('[chatApi] 채팅방 설정 업데이트 응답:', response.data);

      if (response.data?.data) {
        return response.data.data;
      }

      return {
        isPinned: payload.isPinned,
        isMuted: payload.isMuted
      };
    } catch (error) {
      console.error('[chatApi] 채팅방 설정 업데이트 실패:', {
        chatRoomId: chatRoomIdNum,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다. 먼저 로그인해주세요.');
      }

      if (error.response?.status === 403) {
        throw new Error('이 채팅방에 대한 설정을 수정할 권한이 없습니다.');
      }

      if (error.response?.status === 404) {
        throw new Error('채팅방을 찾을 수 없습니다.');
      }

      throw error;
    }
  },

  /**
   * 채팅방 고정/해제
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise<{pinned: boolean}>}
   */
  togglePinChatRoom: async (chatRoomId, nextPinned) => {
    if (typeof nextPinned !== 'boolean') {
      throw new Error('새로운 고정 상태가 필요합니다.');
    }

    const result = await chatApi.updateChatRoomSettings(chatRoomId, { isPinned: nextPinned });
    return {
      pinned: result?.isPinned ?? nextPinned
    };
  },

  /**
   * 채팅방 알림 설정 (뮤트)
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise<{muted: boolean}>}
   */
  toggleMuteChatRoom: async (chatRoomId, nextMuted) => {
    if (typeof nextMuted !== 'boolean') {
      throw new Error('새로운 알림 설정 상태가 필요합니다.');
    }

    const result = await chatApi.updateChatRoomSettings(chatRoomId, { isMuted: nextMuted });
    return {
      muted: result?.isMuted ?? nextMuted
    };
  },

  /**
   * 채팅방 나가기
   * @param {string} chatRoomId - 채팅방 ID
   * @returns {Promise<void>}
   */
  leaveChatRoom: async (chatRoomId) => {
    const chatRoomIdNum = Number(chatRoomId);
    if (!chatRoomIdNum || isNaN(chatRoomIdNum) || chatRoomIdNum <= 0) {
      throw new Error('유효하지 않은 채팅방 ID입니다.');
    }

    try {
      console.log('[chatApi] 채팅방 나가기 요청:', chatRoomIdNum);

      await axiosInstance.delete(`/chat-rooms/${chatRoomIdNum}`);

      console.log('[chatApi] 채팅방 나가기 성공:', chatRoomIdNum);

      // 캐시/스토리지 정리 (로컬 스토리지에 남아있을 수 있는 기존 데이터 제거)
    const chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');
      const filteredRooms = chatRooms.filter(room => Number(room.id) !== chatRoomIdNum && Number(room.chatRoomId) !== chatRoomIdNum);
    localStorage.setItem('chatRooms', JSON.stringify(filteredRooms));
    
    // 커스텀 이벤트 발생
    window.dispatchEvent(new Event('chatRoomsUpdated'));
    } catch (error) {
      console.error('[chatApi] 채팅방 나가기 실패:', {
        chatRoomId: chatRoomIdNum,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다. 먼저 로그인해주세요.');
      }

      if (error.response?.status === 403) {
        throw new Error('이 채팅방에서 나갈 권한이 없습니다.');
      }

      if (error.response?.status === 404) {
        throw new Error('채팅방을 찾을 수 없습니다.');
      }

      throw error;
    }
  }
};
