/**
 * ChatRoomPage Component
 * 채팅방 페이지 컴포넌트 (카카오톡 스타일)
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useChatContext } from '../contexts/ChatContext';
import MessageBubble from '../components/MessageBubble';
import ProfileImage from '../../../shared/components/ProfileImage';
import MessageInput from '../components/MessageInput';
import ChatSettingsModal from '../components/ChatSettingsModal';
import RentalRequestCard from '../components/RentalRequestCard';
import RentalCreateModal from '../components/RentalCreateModal';
import PaymentModal from '../../../features/payment/components/PaymentModal';
import { rentalApi } from '../../../features/rental/api/rentalApi';
import { paymentApi } from '../../../features/payment/api/paymentApi';
import { messageApi } from '../api/messageApi';
import { useUnavailableDates } from '../../../features/product/hooks/useUnavailableDates';
import { useProductDetail } from '../../../features/product/hooks/useProductDetail';
import { DUMMY_USERS } from '../../../shared/constants/dummyData';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import { chatApi } from '../api/chatApi';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

const SEARCH_PAGE_SIZE = 20;

const ChatRoomPage = () => {
  const { chatRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentChatRoom, messages, sendMessage, sendTyping, sendReadReceipt, isConnected, setCurrentChatRoom, isLoading, error, loadOlderMessages, hasMorePast, searchMessages, deleteMessage, updateMessage, uploadFile, addMessage, setMessages, typingMemberId } = useChatContext();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const queryClient = useQueryClient();
  const sortedMessages = useMemo(() => [...messages], [messages]);
  const messagesRef = useRef(sortedMessages);
  useEffect(() => {
    messagesRef.current = sortedMessages;
  }, [sortedMessages]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // 상태 관리
  const [rentalRequestMessage, setRentalRequestMessage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRentalCreateModal, setShowRentalCreateModal] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isCreatingRental, setIsCreatingRental] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState(null);
  
  // productId는 여러 경로에서 가져오기: URL 쿼리 파라미터 > location.state > 채팅방 정보 > 메시지에서
  const productIdFromUrl = searchParams.get('productId') || location.state?.productId || currentChatRoom?.productId || null;
  const productIdFromMessage = rentalRequestMessage?.productId;
  const productId = productIdFromUrl || productIdFromMessage || null;
  
  // 상품 정보 조회 (판매자 확인용)
  const { product: productData } = useProductDetail(productId);
  
  // 대여 불가 날짜 조회 (404 에러는 hook 내부에서 처리됨)
  const { unavailableDates } = useUnavailableDates(productId);

  // 생성된 채팅방 데이터 (location.state에서 가져옴)
  const existingChatRoomData = location.state?.chatRoomData || null;
  
  useEffect(() => {
    if (!chatRoomId) return;

    const desiredId = Number(chatRoomId);
    if (!desiredId) return;

    const currentId = Number(currentChatRoom?.chatRoomId ?? currentChatRoom?.id ?? 0);
    if (currentId === desiredId) {
      return;
    }

    try {
      setCurrentChatRoom(desiredId, existingChatRoomData);
    } catch (error) {
      console.error('채팅방 로드 실패:', error);
      // 나간 채팅방 접근 시도 시 채팅방 목록으로 리다이렉트
      if (error.message?.includes('나간 채팅방')) {
        alert('나간 채팅방입니다.');
        navigate('/chats');
      }
    }
  }, [chatRoomId, currentChatRoom?.chatRoomId, currentChatRoom?.id, existingChatRoomData, setCurrentChatRoom, navigate]);

  // 대여 요청 메시지 찾기
  useEffect(() => {
    if (messages && messages.length > 0) {
      // 가장 최근의 대기 중인 대여 요청 메시지 찾기
      const pendingRentalRequest = messages
        .filter(msg => msg.type === 'rental_request' && msg.status === 'pending')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      
      setRentalRequestMessage(pendingRentalRequest || null);
    } else {
      setRentalRequestMessage(null);
    }
  }, [messages]);

  const scrollToBottom = useCallback((behavior = 'auto') => {
    if (messagesContainerRef.current) {
      if (behavior === 'smooth') {
        messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
      } else {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom('auto');
    }
  }, [sortedMessages, isNearBottom, scrollToBottom]);

  useEffect(() => {
    scrollToBottom('auto');
    // 채팅방 진입 시 읽음 처리
    if (currentChatRoom?.chatRoomId || currentChatRoom?.id) {
      sendReadReceipt();
    }
  }, [currentChatRoom?.chatRoomId, scrollToBottom, sendReadReceipt]);

  // 메시지 전송 시 자동 스크롤
  useEffect(() => {
    const handleMessageSent = () => {
      scrollToBottom('smooth');
    };
    window.addEventListener('chat:message-sent', handleMessageSent);
    return () => {
      window.removeEventListener('chat:message-sent', handleMessageSent);
    };
  }, [scrollToBottom]);

  // 타이핑 중 표시가 나타날 때 하단으로 스크롤
  useEffect(() => {
    if (typingMemberId) {
      // 타이핑 표시가 나타나면 약간의 지연 후 스크롤 (DOM 렌더링 대기)
      const timer = setTimeout(() => {
        scrollToBottom('smooth');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [typingMemberId, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const nearTop = container.scrollTop <= 80;
    if (nearTop && hasMorePast && !isLoadingHistory) {
      const previousScrollHeight = container.scrollHeight;
      const previousScrollTop = container.scrollTop;
      setIsLoadingHistory(true);
      loadOlderMessages()
        .then((added) => {
          if (added) {
            requestAnimationFrame(() => {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
            });
          }
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    }

    const distanceFromBottom = container.scrollHeight - container.clientHeight - container.scrollTop;
    setIsNearBottom(distanceFromBottom < 80);
  }, [hasMorePast, isLoadingHistory, loadOlderMessages]);

  const handleSendMessage = async (messageData) => {
    if (!messageData || !messageData.content) return;
 
    try {
      const payload = {
        ...messageData,
        type: (messageData.type || 'TEXT').toUpperCase()
      };

      await sendMessage(payload);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다.');
    }
  };

  const handleSendFile = async (file) => {
    try {
      await uploadFile(file);
    } catch (error) {
      console.error('파일 전송 실패:', error);
      throw error;
    }
  };

  const handleReply = (message) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      throw error;
    }
  };

  const handleEditMessage = async (messageId, content) => {
    try {
      await updateMessage(messageId, content);
    } catch (error) {
      console.error('메시지 수정 실패:', error);
      throw error;
    }
  };

  const applySettingsUpdate = async (partialSettings) => {
    const roomId = currentChatRoom?.chatRoomId || currentChatRoom?.id;
    if (!roomId) {
      throw new Error('채팅방 정보를 확인할 수 없습니다.');
    }

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(partialSettings, 'isPinned')) {
      payload.isPinned = partialSettings.isPinned;
    }
    if (Object.prototype.hasOwnProperty.call(partialSettings, 'isMuted')) {
      payload.isMuted = partialSettings.isMuted;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    const updated = await chatApi.updateChatRoomSettings(roomId, payload);

    const mergedRoom = {
      ...currentChatRoom,
      isPinned: updated?.isPinned ?? payload.isPinned ?? currentChatRoom?.isPinned,
      isMuted: updated?.isMuted ?? payload.isMuted ?? currentChatRoom?.isMuted
    };

    await setCurrentChatRoom(roomId, mergedRoom);
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHATS, 'rooms'] });
  };

  const handleUpdateSettings = async (settings) => {
    try {
      await applySettingsUpdate(settings);
    } catch (updateError) {
      console.error('설정 업데이트 실패:', updateError);
      alert(updateError.message || '채팅방 설정 업데이트에 실패했습니다.');
    }
  };

  const handleRentalAccept = async (message) => {
    if (!message) {
      alert('대여 요청 정보를 찾을 수 없습니다.');
      return;
    }

    // 사용자 정보 확인 (여러 경로에서 시도)
    const currentUserId = user?.id || user?.memberId || user?.member_id;
    if (!currentUserId) {
      console.error('[handleRentalAccept] 사용자 정보 없음:', { user });
      alert('로그인이 필요합니다. 사용자 정보를 확인할 수 없습니다.');
      return;
    }

    // productId 추출
    const productId = message.productId || message.rentalInfo?.productId;
    if (!productId) {
      alert('상품 ID를 찾을 수 없습니다.');
      return;
    }

    // 날짜 추출
    const startDate = message.startDate || message.rentalInfo?.startDate;
    const endDate = message.endDate || message.rentalInfo?.endDate;
    
    if (!startDate || !endDate) {
      alert('대여 기간 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setIsCreatingRental(true);

      // 날짜를 ISO 문자열로 변환 (Swagger와 동일한 형식)
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      // 유효한 날짜인지 확인
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        alert('올바르지 않은 날짜 형식입니다.');
        return;
      }

      // 대여 거래 생성 API 호출 (승인 시에만 호출)
      // Swagger 형식과 동일: "2025-11-06T17:14:00.000Z"
      const rentalData = {
        startRen: startDateObj.toISOString(),
        endRen: endDateObj.toISOString(),
        rentMethod: message.rentalInfo?.rentMethod || message.rentMethod || 'BOTH'
      };

      console.log('[handleRentalAccept] API 호출 전:', {
        productId,
        rentalData,
        'rentalData (stringified)': JSON.stringify(rentalData)
      });

      // 1. 대여 거래 생성 (예약)
      const rentalResult = await rentalApi.createRentalReservation(productId, rentalData);
      
      console.log('[handleRentalAccept] 대여 거래 생성 성공:', rentalResult);

      // 2. 결제 생성 (OrderId 발급)
      const productTitle = productData?.title || productData?.name || '상품';
      const orderName = `${productTitle} 대여(보증금 포함)`;
      
      const paymentData = {
        rentalHisId: rentalResult.data.rentalHisId,
        productId: Number(productId),
        totalAmount: rentalResult.data.totalAmount,
        orderName: orderName
      };

      console.log('[handleRentalAccept] 결제 생성 요청:', paymentData);

      const paymentResult = await paymentApi.createPayment(paymentData);
      
      console.log('[handleRentalAccept] 결제 생성 성공:', paymentResult);

      // 현재 사용자 정보 (이미 위에서 확인된 currentUserId 사용)
      const currentUserInfo = {
        id: currentUserId,
        username: user?.nickname || user?.name || '사용자',
        profileImageUrl: user?.profileImage || user?.profileImageUrl || null
      };

      // 메시지 상태 업데이트 (승인됨) - 결제 정보도 함께 저장
      await messageApi.updateMessage(chatRoomId, message.id, {
        status: 'approved',
        rentalReservationId: rentalResult.data.rentalHisId,
        paymentId: paymentResult.data.paymentId,
        orderId: paymentResult.data.orderId,
        totalAmount: paymentResult.data.totalAmount,
        sender: currentUserInfo
      });

      // 메시지 새로고침을 위해 채팅방 다시 로드
      setCurrentChatRoom(chatRoomId);

      alert(`대여 요청을 승인했습니다. 결제가 생성되었습니다.\n주문번호: ${paymentResult.data.orderId}\n결제 금액: ${paymentResult.data.totalAmount.toLocaleString()}원`);
    } catch (error) {
      console.error('대여 승인 실패:', error);
      alert(`대여 승인에 실패했습니다: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsCreatingRental(false);
    }
  };

  // 결제 승인 버튼 클릭 핸들러 (토스 결제 모달 열기)
  const handlePaymentConfirmClick = (message) => {
    if (!message || !message.paymentId || !message.orderId) {
      alert('결제 정보를 찾을 수 없습니다.');
      return;
    }

    // 사용자 정보 확인
    const currentUserId = user?.id || user?.memberId || user?.member_id;
    if (!currentUserId) {
      console.error('[handlePaymentConfirmClick] 사용자 정보 없음:', { 
        user, 
        isAuthenticated: user !== null,
        userKeys: user ? Object.keys(user) : []
      });
      alert('로그인이 필요합니다. 사용자 정보를 확인할 수 없습니다.');
      return;
    }

    setPaymentMessage(message);
    setShowPaymentModal(true);
  };

  // 토스 결제 성공 콜백 (결제 모달에서 호출)
  const handlePaymentSuccess = async (paymentKey, orderId, amount) => {
    if (!paymentMessage) {
      return;
    }

    try {
      setIsConfirmingPayment(true);

      // 결제 승인 API 호출 (토스에서 받은 paymentKey 포함)
      const confirmData = {
        orderId: orderId,
        paymentId: paymentMessage.paymentId,
        paymentKey: paymentKey,
        amount: amount
      };

      console.log('[handlePaymentSuccess] 결제 승인 요청:', confirmData);

      const result = await paymentApi.confirmPayment(confirmData);
      
      console.log('[handlePaymentSuccess] 결제 승인 성공:', result);

      // 현재 사용자 정보
      const currentUserId = user?.id || user?.memberId || user?.member_id;
      const currentUserInfo = {
        id: currentUserId,
        username: user?.nickname || user?.name || user?.username || '사용자',
        profileImageUrl: user?.profileImage || user?.profileImageUrl || null
      };

      // 메시지 상태 업데이트 (결제 완료)
      await messageApi.updateMessage(chatRoomId, paymentMessage.id, {
        status: 'payment_completed',
        paymentConfirmed: true,
        paymentKey: paymentKey,
        sender: currentUserInfo
      });

      // 메시지 새로고침을 위해 채팅방 다시 로드
      setCurrentChatRoom(chatRoomId);

      setShowPaymentModal(false);
      setPaymentMessage(null);
      alert('결제가 완료되었습니다.');
    } catch (error) {
      console.error('결제 승인 실패:', error);
      alert(`결제 승인에 실패했습니다: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  // 결제 모달 닫기 핸들러
  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setPaymentMessage(null);
  };

  const handleRentalReject = async (message) => {
    if (!message) {
      alert('대여 요청 정보를 찾을 수 없습니다.');
      return;
    }

    // 사용자 정보 확인 (여러 경로에서 시도)
    const currentUserId = user?.id || user?.memberId || user?.member_id;
    if (!currentUserId) {
      console.error('[handleRentalReject] 사용자 정보 없음:', { user });
      alert('로그인이 필요합니다. 사용자 정보를 확인할 수 없습니다.');
      return;
    }

    try {
      // 현재 사용자 정보
      const currentUserInfo = {
        id: currentUserId,
        username: user?.nickname || user?.name || '사용자',
        profileImageUrl: user?.profileImage || user?.profileImageUrl || null
      };

      // 메시지 상태 업데이트 (거절됨)
      await messageApi.updateMessage(chatRoomId, message.id, {
        status: 'rejected',
        sender: currentUserInfo
      });

      // 메시지 새로고침을 위해 채팅방 다시 로드
      setCurrentChatRoom(chatRoomId);

      alert('대여 요청을 거절했습니다.');
    } catch (error) {
      console.error('대여 거절 실패:', error);
      alert('대여 거절에 실패했습니다.');
    }
  };

  // 대여 거래 요청 메시지 전송 핸들러 (거래 시작하기 모달에서 호출)
  const handleCreateRental = async (productId, rentalData) => {
    if (!productId) {
      alert('상품 정보를 찾을 수 없습니다.');
      return;
    }

    if (!chatRoomId) {
      alert('채팅방 정보를 찾을 수 없습니다.');
      return;
    }

    // 사용자 정보 확인 (여러 경로에서 시도)
    const currentUserId = user?.id || user?.memberId || user?.member_id;
    if (!currentUserId) {
      console.error('[handleCreateRental] 사용자 정보 없음:', { 
        user, 
        isAuthenticated: user !== null,
        userKeys: user ? Object.keys(user) : []
      });
      alert('로그인이 필요합니다. 사용자 정보를 확인할 수 없습니다.');
      return;
    }

    try {
      setIsCreatingRental(true);
      
      // 현재 사용자 정보 (이미 위에서 확인된 currentUserId 사용)
      const currentUserInfo = {
        id: currentUserId,
        username: user?.nickname || user?.name || '사용자',
        profileImageUrl: user?.profileImage || user?.profileImageUrl || null
      };

      // 대여 요청 메시지 전송 (API 호출이 아닌 채팅 메시지로 전송)
      const rentalRequestData = {
        productId: productId,
        startDate: rentalData.startRen,
        endDate: rentalData.endRen,
        rentMethod: rentalData.rentMethod,
        rentalInfo: {
          productTitle: productData?.title || productData?.name || '상품',
          startDate: rentalData.startRen,
          endDate: rentalData.endRen,
          rentMethod: rentalData.rentMethod,
          productId: productId
        },
        sender: currentUserInfo
      };

      await messageApi.sendRentalRequest(chatRoomId, rentalRequestData);
      
      console.log('대여 요청 메시지 전송 성공');
      
      // 모달 닫기
      setShowRentalCreateModal(false);
      
      // 채팅방 새로고침하여 메시지 반영
      setCurrentChatRoom(chatRoomId);
      
      alert('대여 요청을 전송했습니다. 상대방의 승인을 기다려주세요.');
    } catch (error) {
      console.error('대여 요청 전송 실패:', error);
      alert('대여 요청 전송에 실패했습니다.');
    } finally {
      setIsCreatingRental(false);
    }
  };

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
    setSearchKeyword('');
    setSearchResults([]);
    setSearchError('');
    setHasMoreSearch(false);
    setSearchPage(0);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchKeyword('');
    setSearchResults([]);
    setSearchError('');
    setHasMoreSearch(false);
    setSearchPage(0);
  }, []);

  const executeSearch = useCallback(async ({ page = 0, append = false } = {}) => {
    if (!currentChatRoom) return;
    const keyword = searchKeyword.trim();
    if (!keyword) {
      setSearchResults([]);
      setHasMoreSearch(false);
      setSearchError('');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const { results, hasMore } = await searchMessages({ keyword, page, size: SEARCH_PAGE_SIZE });
      setSearchResults((prev) => (append ? [...prev, ...results] : results));
      setHasMoreSearch(hasMore);
      setSearchPage(page);
    } catch (err) {
      console.error('메시지 검색 실패:', err);
      setSearchError(err.message || '메시지 검색에 실패했습니다.');
    } finally {
      setIsSearching(false);
    }
  }, [currentChatRoom, searchKeyword, searchMessages]);

  const handleSearchSubmit = useCallback((event) => {
    event?.preventDefault();
    executeSearch({ page: 0, append: false });
  }, [executeSearch]);

  const handleSearchMore = useCallback(() => {
    if (!hasMoreSearch || isSearching) return;
    executeSearch({ page: searchPage + 1, append: true });
  }, [executeSearch, hasMoreSearch, isSearching, searchPage]);

  const ensureMessageVisible = useCallback(async (targetMessage) => {
    if (!targetMessage || !currentChatRoom || !targetMessage.id) {
      setSearchError('메시지 정보가 없습니다.');
      return false;
    }

    const roomId = currentChatRoom.chatRoomId || currentChatRoom.id;
    if (!roomId) {
      setSearchError('채팅방 ID를 확인할 수 없습니다.');
      return false;
    }

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    
    // 1. 먼저 현재 메시지 목록에서 찾기 (ID 형식 문제 고려)
    let exists = messagesRef.current.some((message) => {
      const msgId = String(message.id || '');
      const targetId = String(targetMessage.id || '');
      return msgId === targetId;
    });
    if (exists) {
      // 약간의 대기 후 스크롤 (DOM 업데이트 대기)
      await wait(200);
      const container = messagesContainerRef.current;
      if (!container) {
        setSearchError('메시지 컨테이너를 찾을 수 없습니다.');
        return false;
      }
      
      // DOM 요소를 찾을 때까지 여러 번 시도
      for (let attempt = 0; attempt < 20; attempt++) {
        await wait(100);
        const element = document.getElementById(`message-${targetMessage.id}`);
        if (element) {
          setIsNearBottom(false);
          setIsSearchOpen(false);
          // 하이라이트 효과를 위해 클래스 추가
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-lg');
          
          // 스크롤 컨테이너 내에서 요소의 위치 계산
          // offsetTop은 스크롤 컨테이너 기준 상대 위치
          const elementTop = element.offsetTop;
          const elementHeight = element.offsetHeight;
          const containerHeight = container.clientHeight;
          
          // 요소를 컨테이너 중앙에 위치시키기 위한 스크롤 위치 계산
          const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
          
          // 스크롤 실행 (항상 컨테이너의 scrollTo 사용)
          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
          });
          
          // 3초 후 하이라이트 제거
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-lg');
          }, 3000);
          return true;
        }
      }
      
      console.warn('[ensureMessageVisible] 현재 목록에 있지만 DOM 요소를 찾을 수 없음:', targetMessage.id);
      return false;
    }

    // 2. 메시지가 현재 목록에 없으면 해당 메시지 주변을 로드
    try {
      setIsJumpingToMessage(true);
      const targetTimestamp = targetMessage.timestamp || targetMessage.createdAt;
      
      if (!targetTimestamp) {
        setSearchError('메시지 시간 정보가 없습니다.');
        return false;
      }

      // 검색 결과에서 받은 타겟 메시지를 정규화하여 메시지 목록에 추가
      // 시간 기반으로 주변 메시지를 로드하지 않고, 타겟 메시지만 추가
      if (setMessages) {
        // 타겟 메시지가 포함된 메시지들을 ChatContext에 추가
        // normalizeMessage와 유사한 로직으로 정규화
        const currentUserId = user?.id || user?.memberId;
        
        // resolveSenderInfo와 유사한 로직
        const resolveSender = (senderId) => {
          if (!senderId) {
            return { id: null, nickname: '알 수 없음', profileImageUrl: null };
          }
          if (currentUserId != null && Number(senderId) === Number(currentUserId)) {
            return {
              id: senderId,
              nickname: user?.nickname || user?.name || '나',
              profileImageUrl: user?.profileImage || user?.profileImageUrl || null
            };
          }
          const other = currentChatRoom?.otherMember;
          if (other && Number(other.id) === Number(senderId)) {
            return {
              id: senderId,
              nickname: other.nickname || other.name || other.username || '상대방',
              profileImageUrl: other.profileImageUrl || other.profileImage || null
            };
          }
          return {
            id: senderId,
            nickname: '알 수 없음',
            profileImageUrl: null
          };
        };
        
        // 각 raw 메시지를 정규화하여 추가
        const currentMessages = messagesRef.current || [];
        const messageMap = new Map();
        
        // 현재 메시지들을 맵에 추가
        currentMessages.forEach((msg) => {
          if (msg && msg.id) {
            messageMap.set(String(msg.id), msg);
          }
        });
        
        // 타겟 메시지만 정규화하여 맵에 추가
        const rawMsg = targetMessage;
        if (rawMsg && rawMsg.id) {
          const msgId = String(rawMsg.id);
          if (!messageMap.has(msgId)) { // 이미 있으면 스킵하지 않고 추가
          
          const type = (rawMsg.type || 'TEXT').toString().toLowerCase();
          const senderId = rawMsg.senderId ?? rawMsg.sender?.id ?? null;
          const sender = resolveSender(senderId);
          const timestamp = rawMsg.createdAt || rawMsg.timestamp || new Date().toISOString();
          
          // 답장 정보 정규화
          let replyTo = null;
          let replyToMessageId = rawMsg.replyToMessageId || null;
          if (rawMsg.replyTo && typeof rawMsg.replyTo === 'object' && rawMsg.replyTo !== null) {
            const replySenderId = rawMsg.replyTo.senderId;
            const replySender = resolveSender(replySenderId);
            replyTo = {
              id: rawMsg.replyTo.id || null,
              senderId: replySenderId,
              sender: replySender,
              content: rawMsg.replyTo.content || (rawMsg.replyTo.isDeleted ? '삭제된 메시지입니다.' : null),
              isDeleted: rawMsg.replyTo.isDeleted || false
            };
            if (!replyToMessageId && replyTo.id) {
              replyToMessageId = replyTo.id;
            }
          }
          
          const normalizedMsg = {
            id: rawMsg.id,
            chatRoomId: roomId,
            type,
            content: type === 'image' ? (rawMsg.imageUrl || rawMsg.content || '') : rawMsg.content || '',
            imageUrl: rawMsg.imageUrl || null,
            fileUrl: rawMsg.fileUrl || null,
            fileName: rawMsg.fileName || null,
            fileSize: rawMsg.fileSize || null,
            replyTo,
            replyToMessageId,
            sender,
            senderId,
            timestamp,
            isRead: rawMsg.isRead ?? false,
            isDeleted: rawMsg.isDeleted ?? false,
            isEdited: rawMsg.isEdited ?? false,
            status: rawMsg.status || null
          };
          
          messageMap.set(msgId, normalizedMsg);
          }
        }
        
        // 맵의 모든 메시지를 배열로 변환하고 정렬
        const allNormalizedMessages = Array.from(messageMap.values()).sort((a, b) => {
          const aTime = new Date(a?.timestamp || 0).getTime();
          const bTime = new Date(b?.timestamp || 0).getTime();
          return aTime - bTime;
        });
        
        // 메시지 설정
        setMessages(allNormalizedMessages);
        
        // React 상태 업데이트와 DOM 렌더링을 기다림
        // messages 상태가 직접 업데이트되므로 messages를 확인
        // 위쪽 먼 메시지도 렌더링되도록 충분히 기다림
        for (let i = 0; i < 20; i++) {
          await wait(300); // 대기 시간 증가
          // messages 상태를 직접 확인 (messagesRef는 useEffect로 업데이트되므로 지연될 수 있음)
          const currentMessages = messages || messagesRef.current || [];
          exists = currentMessages.some((message) => {
            const msgId = String(message.id || '');
            const targetId = String(targetMessage.id || '');
            return msgId === targetId;
          });
          if (exists) {
            // messagesRef도 업데이트
            messagesRef.current = currentMessages;
            // DOM 렌더링을 위해 추가 대기
            await wait(500);
            break;
          }
        }
        
        // 여전히 없으면 로그 출력
        if (!exists) {
          console.warn('[ensureMessageVisible] 타겟 메시지를 찾을 수 없음:', {
            targetId: targetMessage.id,
            loadedMessageIds: messagesRef.current.map(m => m.id).slice(0, 10),
            allMessageCount: allNormalizedMessages.length,
            targetInAll: allNormalizedMessages.some(m => String(m.id) === String(targetMessage.id))
          });
        }
      } else {
        // setMessages가 없으면 채팅방을 다시 로드 (최후의 수단)
        console.warn('[ensureMessageVisible] setMessages가 없어 채팅방을 다시 로드합니다.');
        await setCurrentChatRoom(roomId);
        await wait(1000);
        
        // 타겟 메시지가 로드될 때까지 대기 (최대 5번 시도)
        for (let i = 0; i < 5; i++) {
          exists = messagesRef.current.some((message) => {
            const msgId = String(message.id || '');
            const targetId = String(targetMessage.id || '');
            return msgId === targetId;
          });
          if (exists) break;
          await wait(500);
        }
      }
      
      if (exists) {
        // DOM 업데이트를 기다린 후 스크롤 (여러 번 시도)
        // React가 DOM을 렌더링할 때까지 대기
        const container = messagesContainerRef.current;
        if (!container) {
          setSearchError('메시지 컨테이너를 찾을 수 없습니다.');
          return false;
        }
        
        // DOM 요소가 렌더링될 때까지 기다림 (위쪽 먼 메시지도 포함)
        // MutationObserver를 사용하여 DOM 변경 감지
        let elementFound = false;
        const checkElement = () => {
          const element = document.getElementById(`message-${targetMessage.id}`);
          if (element) {
            elementFound = true;
            return element;
          }
          return null;
        };
        
        // 먼저 여러 번 시도
        for (let attempt = 0; attempt < 50; attempt++) {
          await wait(200);
          const element = checkElement();
          if (element) {
            // 요소를 찾았으면 스크롤 실행
            setIsNearBottom(false);
            setIsSearchOpen(false);
            // 하이라이트 효과를 위해 클래스 추가
            element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-lg');
            
            // 스크롤 컨테이너 내에서 요소의 위치 계산
            // offsetTop은 스크롤 컨테이너 기준 상대 위치
            const elementTop = element.offsetTop;
            const elementHeight = element.offsetHeight;
            const containerHeight = container.clientHeight;
            const containerScrollTop = container.scrollTop;
            
            // 요소를 컨테이너 중앙에 위치시키기 위한 스크롤 위치 계산
            const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
            
            // 스크롤 실행 (항상 컨테이너의 scrollTo 사용)
            container.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });
            
            // 3초 후 하이라이트 제거
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-lg');
            }, 3000);
            return true;
          }
        }
        
        // MutationObserver를 사용하여 DOM 변경 감지 (최후의 수단)
        if (!elementFound) {
          const element = await new Promise((resolve) => {
            const observer = new MutationObserver((mutations, obs) => {
              const foundElement = checkElement();
              if (foundElement) {
                obs.disconnect();
                resolve(foundElement);
              }
            });
            
            observer.observe(container, {
              childList: true,
              subtree: true,
              attributes: false
            });
            
            // 최대 5초 대기
            setTimeout(() => {
              observer.disconnect();
              resolve(null);
            }, 5000);
          });
          
          if (element) {
            setIsNearBottom(false);
            setIsSearchOpen(false);
            element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-lg');
            
            const elementTop = element.offsetTop;
            const elementHeight = element.offsetHeight;
            const containerHeight = container.clientHeight;
            const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
            
            container.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });
            
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-lg');
            }, 3000);
            return true;
          }
        }
        
        // 요소를 찾지 못한 경우
        console.warn('[ensureMessageVisible] DOM 요소를 찾을 수 없음:', targetMessage.id);
        // 모든 메시지 요소를 확인하여 ID 형식 문제 확인
        const allMessageElements = document.querySelectorAll('[id^="message-"]');
        console.log('[ensureMessageVisible] 현재 DOM의 메시지 ID들:', Array.from(allMessageElements).map(el => el.id).slice(0, 20));
        setSearchError('메시지 요소를 찾을 수 없습니다. ID: ' + targetMessage.id);
        return false;
      }
      
      setSearchError('대화에서 해당 메시지를 찾을 수 없습니다. (ID: ' + targetMessage.id + ')');
      return false;
    } catch (error) {
      console.error('메시지 로드 실패:', error);
      setSearchError('메시지를 불러오는 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsJumpingToMessage(false);
    }
  }, [currentChatRoom, messageApi, setCurrentChatRoom, setIsNearBottom, setIsSearchOpen, setSearchError]);

  const [isJumpingToMessage, setIsJumpingToMessage] = useState(false);

  const handleResultClick = useCallback(async (message) => {
    setIsJumpingToMessage(true);
    setSearchError('');
    try {
      const success = await ensureMessageVisible(message);
      if (success) {
        setIsSearchOpen(false);
      }
    } finally {
      setIsJumpingToMessage(false);
    }
  }, [ensureMessageVisible, setIsJumpingToMessage, setIsSearchOpen, setSearchError]);

  if (isLoading) {
    return (
      <>
        <SideNavbar />
        <div className="flex flex-col h-screen bg-gray-50">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <div className="text-gray-500">채팅방을 불러오는 중...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !currentChatRoom) {
    return (
      <>
        <SideNavbar />
        <div className="flex flex-col h-screen bg-gray-50">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <div className="text-red-500 mb-4">채팅방을 불러올 수 없습니다.</div>
              <button
                onClick={() => navigate('/chats')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                채팅 목록으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const opponentProfileImage = currentChatRoom?.otherMember?.profileImageUrl
    || currentChatRoom?.participants?.find((p) => p.id !== 101)?.profileImage
    || currentChatRoom?.productImageUrl
    || null;

  const opponentId = currentChatRoom?.otherMember?.id
    || currentChatRoom?.participants?.find((p) => p.id !== 101)?.id
    || currentChatRoom?.otherMemberId
    || null;

  const opponentNickname = currentChatRoom?.otherMember?.nickname
    || currentChatRoom?.name
    || '채팅방';

  const opponentOnline = typeof isConnected === 'boolean' ? isConnected : false;

  return (
    <>
      <SideNavbar />
      <div className="flex flex-col h-screen bg-gray-50">
      {/* 채팅방 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <ProfileImage 
                src={opponentProfileImage}
                alt={opponentNickname}
                size={40}
                className={`w-10 h-10 ${opponentId ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={() => {
                  if (opponentId) {
                    navigate(`/members/${opponentId}`);
                  }
                }}
              />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {opponentNickname}
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${opponentOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-500">
                    {opponentOnline ? '온라인' : (currentChatRoom?.otherMember?.lastSeenAt ? `마지막 접속: ${new Date(currentChatRoom.otherMember.lastSeenAt).toLocaleString('ko-KR')}` : '오프라인')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 거래 시작하기 버튼 */}
            {productId && (
              <button
                onClick={() => setShowRentalCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                거래 시작하기
              </button>
            )}
            {/* 검색 버튼 (돋보기 아이콘) */}
            <button
              onClick={openSearch}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="메시지 검색"
              title="메시지 검색"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {/* 설정 버튼 */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>


      {/* 메시지 목록 */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide flex flex-col"
      >
        {isLoadingHistory && (
          <div className="flex justify-center py-2 text-xs text-gray-500">
            이전 메시지를 불러오는 중...
          </div>
        )}
        {sortedMessages.length > 0 ? (
          sortedMessages.map((message, index) => {
            const key = message.id || `${message.timestamp || 'message'}-${index}`;
            const anchorId = message.id ? `message-${message.id}` : undefined;
            // 대여 요청 메시지 처리
            if (message.type === 'rental_request') {
              const currentUserId = user?.id || user?.memberId;
              const senderId = message.sender?.id;
              const isOwn = Number(currentUserId) === Number(senderId);
              
              // 판매자 여부 확인
              const sellerId = productData?.sellerId 
                || productData?.writer?.memberId 
                || productData?.writer?.member_id
                || productData?.seller?.id 
                || productData?.seller?.memberId
                || productData?.seller?.member_id;
              const isSeller = sellerId && Number(sellerId) === Number(currentUserId);
              
              // 판매자이고 pending 상태면 RentalRequestCard 표시
              if (isSeller && message.status === 'pending') {
                // rentalRequestMessage에서 rentalInfo 구조 변환
                const rentalInfo = {
                  productTitle: message.rentalInfo?.productTitle || productData?.title || productData?.name || '상품',
                  productImage: message.rentalInfo?.productImage || productData?.images?.[0] || null,
                  startDate: message.startDate || message.rentalInfo?.startDate,
                  endDate: message.endDate || message.rentalInfo?.endDate,
                  days: message.rentalInfo?.days || (() => {
                    if (message.startDate && message.endDate) {
                      const start = new Date(message.startDate);
                      const end = new Date(message.endDate);
                      return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                    }
                    return 0;
                  })(),
                  dailyPrice: message.rentalInfo?.dailyPrice || productData?.price || 0,
                  deposit: message.rentalInfo?.deposit || productData?.deposit || 0,
                  totalPrice: message.rentalInfo?.totalPrice || (() => {
                    const days = message.rentalInfo?.days || (() => {
                      if (message.startDate && message.endDate) {
                        const start = new Date(message.startDate);
                        const end = new Date(message.endDate);
                        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                      }
                      return 0;
                    })();
                    const dailyPrice = message.rentalInfo?.dailyPrice || productData?.price || 0;
                    const deposit = message.rentalInfo?.deposit || productData?.deposit || 0;
                    return (dailyPrice * days) + deposit;
                  })(),
                  requesterName: message.sender?.username || message.sender?.name || '요청자',
                  requesterProfile: message.sender?.profileImageUrl || message.sender?.profileImage || null
                };
                
                return (
                  <div key={key} id={anchorId} className="mb-4">
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[85%]">
                        <RentalRequestCard
                          rentalInfo={rentalInfo}
                          onAccept={() => handleRentalAccept(message)}
                          onReject={() => handleRentalReject(message)}
                        />
                      </div>
                    </div>
                  </div>
                );
              }
              
              // 승인된 요청이고 요청자(isOwn)이면 결제 승인 버튼 표시
              if (isOwn && message.status === 'approved' && message.orderId && !message.paymentConfirmed) {
                return (
                  <div key={key} id={anchorId} className="mb-4">
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[85%]">
                        <div className={`rounded-2xl p-4 ${
                          isOwn
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          <div className="font-medium mb-2">
                            대여 요청이 승인되었습니다
                          </div>
                          <div className="text-sm opacity-90 mb-3">
                            {message.content}
                          </div>
                          <div className="bg-white/10 rounded-lg p-3 mb-3">
                            <div className="text-xs opacity-90 mb-1">주문번호</div>
                            <div className="text-sm font-semibold">{message.orderId}</div>
                            <div className="text-xs opacity-90 mt-2 mb-1">결제 금액</div>
                            <div className="text-lg font-bold">
                              {message.totalAmount?.toLocaleString() || '0'}원
                            </div>
                          </div>
                          <button
                            onClick={() => handlePaymentConfirmClick(message)}
                            disabled={isConfirmingPayment}
                            className="w-full py-2 px-4 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isConfirmingPayment ? '결제 승인 중...' : '결제 승인하기'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // 일반 메시지 버블로 표시 (승인/거절된 요청 또는 요청자 화면)
              return (
                <div key={key} id={anchorId} className="mb-4">
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${
                      isOwn
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      <div className="font-medium mb-2">
                        {isOwn 
                          ? '대여 요청을 보냈습니다' 
                          : '대여 요청을 받았습니다'}
                      </div>
                      <div className="text-sm opacity-90">
                        {message.content}
                      </div>
                      {message.status && (
                        <div className="mt-2 text-xs opacity-75">
                          {message.status === 'pending' && '대기 중'}
                          {message.status === 'approved' && '✓ 승인됨'}
                          {message.status === 'rejected' && '✗ 거절됨'}
                          {message.status === 'payment_completed' && '✓ 결제 완료'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            
            const currentUserId = user?.id || user?.memberId;
            const senderId = message.sender?.id;
            const isOwn = Number(currentUserId) === Number(senderId);
            
            return (
              <MessageBubble
                key={key}
                message={message}
                messageId={message.id}
                isOwn={isOwn}
                onReply={handleReply}
                onDelete={handleDeleteMessage}
                onEdit={handleEditMessage}
              />
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">메시지가 없습니다</h3>
            <p className="text-gray-500">첫 번째 메시지를 보내보세요!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
        
        {/* 타이핑 중 표시 */}
        {typingMemberId && (
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>
              {currentChatRoom?.otherMember?.nickname || currentChatRoom?.otherMember?.name || '상대방'}이 입력 중입니다...
            </span>
          </div>
        )}
      </div>

      {/* 메시지 입력 */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        onTyping={sendTyping}
        disabled={false}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
      />

      {/* 채팅방 설정 모달 */}
      <ChatSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        chatRoom={currentChatRoom}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* 대여 거래 생성 모달 */}
      {/* 결제 모달 */}
      {paymentMessage && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentModalClose}
          orderId={paymentMessage.orderId}
          amount={paymentMessage.totalAmount}
          orderName={paymentMessage.rentalInfo?.productTitle || '상품 대여'}
          onSuccess={handlePaymentSuccess}
          onError={(error) => {
            console.error('결제 오류:', error);
            alert(`결제 처리 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
          }}
        />
      )}

      <RentalCreateModal
        isOpen={showRentalCreateModal}
        onClose={() => setShowRentalCreateModal(false)}
        productId={productId}
        unavailableDates={unavailableDates || []}
        onSubmit={handleCreateRental}
        isLoading={isCreatingRental}
      />

      {/* 검색 모달 */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={closeSearch}
        >
          <div
            className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-xl p-6 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeSearch}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100"
              aria-label="검색 닫기"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">메시지 검색</h2>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  type="text"
                  placeholder="검색어를 입력하세요"
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchKeyword.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? '검색 중...' : '검색'}
              </button>
            </form>

            {searchError && (
              <div className="mb-3 text-sm text-red-500">{searchError}</div>
            )}

            <div className="max-h-80 overflow-y-auto space-y-2">
              {isSearching && searchResults.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">검색 중입니다...</div>
              ) : searchResults.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">검색 결과가 없습니다.</div>
              ) : (
                searchResults.map((result, index) => {
                  const key = result.id || `${result.timestamp}-${index}`;
                  const senderName = result.sender?.nickname || result.senderId || '알 수 없음';
                  const currentUserId = user?.id || user?.memberId;
                  const isOwnResult = Number(result.senderId) === Number(currentUserId);
                  
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-medium text-gray-600">
                          {isOwnResult ? '나' : senderName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {result.timestamp ? new Date(result.timestamp).toLocaleString() : '시간 정보 없음'}
                        </div>
                      </div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-2">
                        {result.type === 'image' ? '[이미지]' : (result.content || '(내용 없음)')}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {hasMoreSearch && (
              <button
                type="button"
                onClick={handleSearchMore}
                disabled={isSearching}
                className="mt-4 w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                더 보기
              </button>
            )}

            {isJumpingToMessage && (
              <div className="mt-3 text-xs text-gray-500 text-center">선택한 메시지 위치로 이동 중...</div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ChatRoomPage;
