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
import RentalRequestModal from '../components/RentalRequestModal';
import TransactionProcessModal from '../components/TransactionProcessModal';
import TransactionActionButton from '../components/TransactionActionButton';
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

// 커스텀 날짜 선택 컴포넌트
const DatePicker = ({ selectedDate, onSelectDate, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // 이전 달의 마지막 날들
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }
    
    // 현재 달의 날들
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // 다음 달의 첫 날들 (42개 셀 채우기)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const isToday = (date) => {
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!selectedDate) return false;
    return date.toDateString() === new Date(selectedDate).toDateString();
  };

  const handleDateClick = (date) => {
    onSelectDate(date);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="w-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-sm font-semibold text-gray-900">
          {currentMonth.getFullYear()}년 {monthNames[currentMonth.getMonth()]}
        </div>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-gray-900' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const dateStr = day.date.toDateString();
          const isTodayDate = isToday(day.date);
          const isSelectedDate = isSelected(day.date);
          
          return (
            <button
              key={index}
              onClick={() => handleDateClick(day.date)}
              className={`
                aspect-square text-sm rounded transition-all
                ${!day.isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                ${isTodayDate ? 'bg-gray-100 font-bold ring-2 ring-gray-900' : ''}
                ${isSelectedDate ? 'bg-gray-900 text-white font-bold' : ''}
                ${!isTodayDate && !isSelectedDate && day.isCurrentMonth ? 'hover:bg-gray-100' : ''}
              `}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ChatRoomPage = () => {
  const { chatRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentChatRoom, messages, sendMessage, sendTyping, sendReadReceipt, isConnected, setCurrentChatRoom, isLoading, error, loadOlderMessages, hasMorePast, searchMessages, jumpToMessage, deleteMessage, updateMessage, uploadFile, addMessage, setMessages, typingMemberId, updateOpponentOnlineStatus } = useChatContext();
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // 상태 관리
  const [rentalRequestMessage, setRentalRequestMessage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRentalRequestModal, setShowRentalRequestModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [currentRentalData, setCurrentRentalData] = useState(null);
  const [requestedDateRange, setRequestedDateRange] = useState(null);
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

  // 주기적으로 채팅방 정보 갱신 (온라인 상태 실시간 반영)
  useEffect(() => {
    if (!currentChatRoom?.chatRoomId || !updateOpponentOnlineStatus) return;

    const updateOnlineStatus = async () => {
      try {
        const chatRoom = await chatApi.getChatRoomDetail(currentChatRoom.chatRoomId, { include: 'member' });
        if (chatRoom?.member) {
          const { isOnline, lastSeenAt } = chatRoom.member;
          updateOpponentOnlineStatus(isOnline, lastSeenAt);
        }
      } catch (error) {
        console.error('온라인 상태 갱신 실패:', error);
      }
    };

    // 즉시 한 번 실행
    updateOnlineStatus();

    // 30초마다 갱신
    const interval = setInterval(updateOnlineStatus, 30000);

    return () => clearInterval(interval);
  }, [currentChatRoom?.chatRoomId, updateOpponentOnlineStatus]);
  // }, [chatRoomId, currentChatRoom?.chatRoomId, currentChatRoom?.id, existingChatRoomData, setCurrentChatRoom]);

  
  // 자동 대여 요청 메시지 전송 (ProductDetailPage에서 온 경우)
  useEffect(() => {
    const autoSendRentalRequest = location.state?.autoSendRentalRequest;
    const rentalRequestData = location.state?.rentalRequestData;

    if (autoSendRentalRequest && rentalRequestData && isConnected && currentChatRoom) {
      // WebSocket 연결이 확립되고 채팅방이 로드되면 메시지 전송
      const sendRentalRequestMessage = async () => {
        try {
          const rentMethodText = 
            rentalRequestData.rentMethod === 'ONLY_ONLINE' ? '택배거래' :
            rentalRequestData.rentMethod === 'ONLY_OFFLINE' ? '직거래' : '둘 다 가능';

          const messageContent = `📦 대여를 요청했습니다\n\n상품: ${rentalRequestData.productTitle}\n날짜: ${new Date(rentalRequestData.startDate).toLocaleDateString('ko-KR')} ~ ${new Date(rentalRequestData.endDate).toLocaleDateString('ko-KR')}\n거래 방법: ${rentMethodText}`;

          await sendMessage({
            type: 'TEXT',
            content: messageContent
          });

          console.log('[ChatRoomPage] 자동 대여 요청 메시지 전송 성공');
          
          // 상태 초기화 (중복 전송 방지)
          navigate(location.pathname, { 
            replace: true,
            state: { 
              ...location.state, 
              autoSendRentalRequest: false,
              rentalRequestData: null 
            } 
          });
        } catch (error) {
          console.error('[ChatRoomPage] 자동 대여 요청 메시지 전송 실패:', error);
        }
      };

      sendRentalRequestMessage();
    }
  }, [location.state, isConnected, currentChatRoom, sendMessage, navigate, location.pathname]);

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

  // 거래 데이터는 버튼 클릭 시 메시지에서 rentalHisId를 추출하여 조회합니다

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

  // 타이핑 중 표시는 표시만 하고 자동 스크롤하지 않음

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

  const handleRentalAccept = async (message, modifiedPricing = null) => {
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

    const renterId =
      message.senderId ||
      message.sender?.id ||
      message.sender?.memberId ||
      message.rentalInfo?.renterId;

    if (!renterId) {
      console.error('[handleRentalAccept] 대여자 ID를 찾을 수 없습니다.', message);
      alert('대여자 정보를 찾을 수 없습니다.');
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
        rentMethod: message.rentalInfo?.rentMethod || message.rentMethod || 'BOTH',
        renterId
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
    // 채팅방 상단으로 이동
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
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

  // 메시지 점프 및 스크롤 (메시지 점프 API 사용)
  const scrollToMessage = useCallback(async (messageId, options = {}) => {
    if (!messageId || !currentChatRoom) {
      return false;
    }

    try {
      setIsJumpingToMessage(true);
      setSearchError('');

      // 메시지 점프 API 호출
      const result = await jumpToMessage(messageId, { before: 20, after: 20, ...options });
      
      if (!result || !result.success) {
        setSearchError('메시지를 찾을 수 없습니다.');
        return false;
      }

      // DOM 업데이트 대기 후 스크롤
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      await wait(100);

      const container = messagesContainerRef.current;
      if (!container) {
        setSearchError('메시지 컨테이너를 찾을 수 없습니다.');
        return false;
      }

      // DOM 요소를 찾을 때까지 여러 번 시도
      let element = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        await wait(100);
        element = document.getElementById(`message-${messageId}`);
        if (element) break;
      }

      if (element) {
        setIsNearBottom(false);
        setIsSearchOpen(false);
        
        // 하이라이트 효과 추가
        element.classList.add('ring-2', 'ring-gray-900', 'ring-offset-2', 'rounded-lg', 'transition-all');
        
        // 스크롤 컨테이너 내에서 요소의 위치 계산
        const elementTop = element.offsetTop;
        const elementHeight = element.offsetHeight;
        const containerHeight = container.clientHeight;
        
        // 요소를 컨테이너 중앙에 위치시키기
        const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
        
        // 스크롤 실행
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
        
        // 2초 후 하이라이트 제거
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-gray-900', 'ring-offset-2', 'rounded-lg', 'transition-all');
        }, 2000);
        
        return true;
      } else {
        console.warn('[scrollToMessage] DOM 요소를 찾을 수 없음:', messageId);
        setSearchError('메시지 요소를 찾을 수 없습니다.');
        return false;
      }
    } catch (error) {
      console.error('[scrollToMessage] 메시지 점프 실패:', error);
      setSearchError(error.message || '메시지 점프에 실패했습니다.');
      return false;
    } finally {
      setIsJumpingToMessage(false);
    }
  }, [currentChatRoom, jumpToMessage, setIsNearBottom, setIsSearchOpen, setSearchError]);

  // 날짜로 검색 (해당 날짜의 첫 메시지로 이동)
  const handleDateSearch = useCallback(async (date) => {
    if (!date || !currentChatRoom) return;
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    try {
      // 먼저 현재 메시지 목록에서 해당 날짜의 메시지 찾기
      const messagesOnDate = messagesRef.current.filter((msg) => {
        if (!msg.timestamp) return false;
        const msgDate = new Date(msg.timestamp);
        return msgDate >= targetDate && msgDate < nextDay;
      });
      
      if (messagesOnDate.length > 0) {
        // 가장 첫 메시지로 이동 (메시지 점프 API 사용)
        const firstMessage = messagesOnDate[0];
        await scrollToMessage(firstMessage.id);
        return;
      }

      // 현재 목록에 없으면 해당 날짜의 첫 메시지를 찾기 위해
      // 날짜 시작 시간 이후의 메시지를 조회 (after 파라미터 사용)
      const roomId = currentChatRoom.chatRoomId || currentChatRoom.id;
      if (!roomId) {
        setSearchError('채팅방 ID를 확인할 수 없습니다.');
        return;
      }

      // 날짜 시작 시간 이후의 메시지 조회
      const dateMessages = await messageApi.getMessages(roomId, {
        after: targetDate.toISOString(),
        size: 100
      });

      // 해당 날짜의 메시지 필터링 (다음 날 이전)
      const messagesOnTargetDate = dateMessages.filter((msg) => {
        if (!msg.createdAt && !msg.timestamp) return false;
        const msgDate = new Date(msg.createdAt || msg.timestamp);
        return msgDate >= targetDate && msgDate < nextDay;
      });
      
      if (messagesOnTargetDate.length > 0) {
        // 가장 첫 메시지로 이동 (메시지 점프 API 사용)
        const firstMessage = messagesOnTargetDate[0];
        await scrollToMessage(firstMessage.id);
      } else {
        setSearchError('해당 날짜에 메시지가 없습니다.');
      }
    } catch (error) {
      console.error('[handleDateSearch] 날짜 검색 실패:', error);
      setSearchError('날짜 검색에 실패했습니다.');
    }
  }, [currentChatRoom, messagesRef, scrollToMessage, setSearchError]);

  const [isJumpingToMessage, setIsJumpingToMessage] = useState(false);

  const handleResultClick = useCallback(async (message) => {
    if (!message || !message.id) {
      setSearchError('메시지 정보가 없습니다.');
      return;
    }

    try {
      const success = await scrollToMessage(message.id);
      if (success) {
        setIsSearchOpen(false);
      }
    } catch (error) {
      console.error('[handleResultClick] 검색 결과 클릭 실패:', error);
      setSearchError(error.message || '메시지로 이동하는데 실패했습니다.');
    }
  }, [scrollToMessage, setIsSearchOpen, setSearchError]);

  // 하단이 아닐 때 상대방의 마지막 메시지 찾기 (Hook은 early return 이전에 호출되어야 함)
  const lastOpponentMessage = useMemo(() => {
    if (isNearBottom || !currentChatRoom || sortedMessages.length === 0) return null;
    const currentUserId = user?.id || user?.memberId;
    
    // 실제 마지막 메시지가 내 메시지인 경우 미리보기 표시하지 않음
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    const lastMessageSenderId = lastMessage?.senderId || lastMessage?.sender?.id;
    if (lastMessageSenderId && Number(lastMessageSenderId) === Number(currentUserId)) {
      return null;
    }
    
    // 상대방 메시지만 필터링해서 가장 최근 메시지 찾기
    const opponentMessages = sortedMessages
      .filter((msg) => {
        const msgSenderId = msg.senderId || msg.sender?.id;
        return msgSenderId && Number(msgSenderId) !== Number(currentUserId);
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return opponentMessages[0] || null;
  }, [sortedMessages, isNearBottom, user, currentChatRoom]);

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
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
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

  // 상대방 온라인 상태 확인 (백엔드에서 제공하는 isOnline 사용)
  const opponentOnline = currentChatRoom?.otherMember?.isOnline ?? false;
  const lastSeenAt = currentChatRoom?.otherMember?.lastSeenAt;

  // 마지막 접속 시간 포맷팅 (1분 전 ~ 59분 전, 1시간 전 ~ 23시간 전, 그 이상은 시간 단위)
  const formatLastSeen = (dateString) => {
    if (!dateString) return '오프라인';
    
    const lastSeen = new Date(dateString);
    const now = new Date();
    const diffInMs = now - lastSeen;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInMinutes < 1) {
      return '방금 전';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else {
      return lastSeen.toLocaleDateString('ko-KR', { 
        month: '2-digit', 
        day: '2-digit' 
      });
    }
  };

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
                    {opponentOnline ? '온라인' : (lastSeenAt ? formatLastSeen(lastSeenAt) : '오프라인')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 거래 시작하기 버튼 */}
            {productId && (
              <button
                onClick={() => setShowTransactionModal(true)}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                거래 시작하기
              </button>
            )}
            {/* 거래/결제 버튼 (모듈화) */}
            <TransactionActionButton
              productId={productId}
              currentRentalData={currentRentalData}
              productData={productData}
              user={user}
              onCreateTransaction={() => setShowTransactionModal(true)}
              onRentalRequest={() => setShowRentalCreateModal(true)}
              onTransactionProcess={() => setShowTransactionModal(true)}
            />
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
                          onAccept={(modifiedPricing) => handleRentalAccept(message, modifiedPricing)}
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

            // 메시지 내용에 따라 액션 버튼 생성
            const getActionButtons = () => {
              const content = message.content || '';

              // 대여 요청 메시지 - 두 가지 버튼 추가
              if (content.includes('📦 대여를 요청했습니다') || content.includes('📦 대여 요청')) {
                const senderId = message.sender?.id;
                const isRequester = Number(currentUserId) === Number(senderId);
                
                // 판매자 확인
                const sellerId = productData?.sellerId 
                  || productData?.writer?.memberId 
                  || productData?.writer?.member_id
                  || productData?.seller?.id 
                  || productData?.seller?.memberId
                  || productData?.seller?.member_id;
                const isSeller = sellerId && Number(sellerId) === Number(currentUserId);
                
                const buttons = [];
                
                // 요청자에게는 '대여 다시 요청하기' 버튼
                if (isRequester) {
                  buttons.push({
                    text: '🔄 대여 다시 요청하기',
                    style: 'secondary',
                    onClick: () => {
                      setShowRentalRequestModal(true);
                    }
                  });
                }
                
                // 판매자에게는 '거래 생성하기' 버튼
                if (isSeller) {
                  buttons.push({
                    text: '✅ 거래 생성하기',
                    style: 'primary',
                    onClick: async () => {
                      // 메시지에서 대여 정보 추출
                      const content = message.content || '';
                      
                      // 상품 ID 추출
                      const productIdToUse = productId || productData?.productId || productData?.product_id;
                      if (!productIdToUse) {
                        alert('상품 정보를 찾을 수 없습니다.');
                        return;
                      }

                      // 날짜 정보 추출 (메시지 내용에서 파싱)
                      // 형식: "날짜: 2025년 1월 11일 ~ 2025년 1월 15일"
                      const dateMatch = content.match(/날짜:\s*([0-9.\s년월일]+)\s*~\s*([0-9.\s년월일]+)/);
                      if (!dateMatch) {
                        alert('대여 기간 정보를 찾을 수 없습니다.');
                        return;
                      }

                      // 한글 날짜를 Date 객체로 변환
                      const parseKoreanDate = (dateStr) => {
                      if (!dateStr) return null;

                      //  "2025년 11월 12일" 형식
                      let match = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
                      if (match) return new Date(+match[1], +match[2] - 1, +match[3]);

                      // "2025. 11. 12." 또는 "2025.11.12" 형식
                      match = dateStr.match(/(\d{4})[.\s]*(\d{1,2})[.\s]*(\d{1,2})/);
                      if (match) return new Date(+match[1], +match[2] - 1, +match[3]);

                      // "2025-11-12" 형식 (ISO fallback)
                      match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                      if (match) return new Date(+match[1], +match[2] - 1, +match[3]);

                      return null;
                    };


                      const startDate = parseKoreanDate(dateMatch[1]);
                      const endDate = parseKoreanDate(dateMatch[2]);

                      if (!startDate || !endDate) {
                        alert('날짜 형식을 파싱할 수 없습니다.');
                        return;
                      }

                      // 거래 방법 추출
                      let rentMethod = 'BOTH';
                      if (content.includes('택배거래')) rentMethod = 'ONLY_ONLINE';
                      else if (content.includes('직거래')) rentMethod = 'ONLY_OFFLINE';

                      // 기간 계산
                      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

                      console.log('[ChatRoomPage] 거래 생성하기 버튼 클릭:', {
                        productId: productIdToUse,
                        startDate,
                        endDate,
                        rentMethod,
                        days
                      });

                      // rentalData를 null로 설정하고, requestedDateRange만 전달
                      // 이렇게 하면 TransactionProcessModal이 새 거래 생성 모드로 작동함
                      setCurrentRentalData(null);

                      // requestedDateRange를 state로 관리하거나, 직접 설정
                      // 여기서는 간단하게 바로 모달을 열고, productData에 날짜 정보를 임시로 저장
                      setRequestedDateRange({
                        start: startDate,
                        end: endDate
                      });

                      setShowTransactionModal(true);
                      
                    }
                  });
                }
                
                return buttons.length > 0 ? buttons : null;
              }

              // 거래 생성 완료 메시지 (구매자에게만 버튼 표시)
              if (content.includes('✅ 거래 생성 완료') && !isOwn) {
                return [{
                  text: '💳 결제하러 가기',
                  style: 'primary',
                  onClick: async () => {
                    try {
                      // 메시지 내용에서 rentalHisId 추출
                      const rentalHisIdMatch = content.match(/rentalHisId:(\d+)/);
                      if (!rentalHisIdMatch) {
                        alert('거래 정보를 찾을 수 없습니다.');
                        return;
                      }

                      const rentalHisId = Number(rentalHisIdMatch[1]);
                      console.log('[ChatRoomPage] rentalHisId 추출:', rentalHisId);

                      // rentalHisId로 거래 상세 조회
                      const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                      const rentalData = rentalResponse.data;

                      console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);

                      setCurrentRentalData(rentalData);

                      // setState는 비동기이므로 약간의 지연 후 모달 열기
                      setTimeout(() => {
                        setShowTransactionModal(true);
                      }, 50);
                    } catch (err) {
                      console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                      alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                    }
                  }
                }];
              }

              // 결제 완료 메시지 (판매자에게만 버튼 표시)
              if (content.includes('✅ 결제 완료') && !isOwn) {
                return [{
                  text: '📦 발송 처리',
                  style: 'success',
                  onClick: async () => {
                    try {
                      // 메시지 내용에서 rentalHisId 추출
                      const rentalHisIdMatch = content.match(/rentalHisId:(\d+)/);
                      if (!rentalHisIdMatch) {
                        alert('거래 정보를 찾을 수 없습니다.');
                        return;
                      }

                      const rentalHisId = Number(rentalHisIdMatch[1]);
                      console.log('[ChatRoomPage] rentalHisId 추출:', rentalHisId);

                      // rentalHisId로 거래 상세 조회
                      const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                      const rentalData = rentalResponse.data;

                      console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);

                      setCurrentRentalData(rentalData);

                      // setState는 비동기이므로 약간의 지연 후 모달 열기
                      setTimeout(() => {
                        setShowTransactionModal(true);
                      }, 50);
                    } catch (err) {
                      console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                      alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                    }
                  }
                }];
              }

              return null;
            };

            return (
              <MessageBubble
                key={key}
                message={message}
                messageId={message.id}
                isOwn={isOwn}
                onReply={handleReply}
                onDelete={handleDeleteMessage}
                onEdit={handleEditMessage}
                onReplyClick={async (replyMessageId) => {
                  if (replyMessageId) {
                    await scrollToMessage(replyMessageId);
                  }
                }}
                actionButtons={getActionButtons()}
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
        previewMessage={lastOpponentMessage}
        onPreviewClick={() => {
          if (lastOpponentMessage) {
            scrollToBottom('smooth');
            setIsNearBottom(true);
          }
        }}
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

      {/* 대여 다시 요청하기 모달 */}
      <RentalRequestModal
        isOpen={showRentalRequestModal}
        onClose={() => setShowRentalRequestModal(false)}
        productData={productData}
        unavailableDates={unavailableDates}
        isLoading={isCreatingRental}
        onSubmit={async (rentalInfo, rentMethodText) => {
          try {
            setIsCreatingRental(true);
            
            const messageContent = `📦 대여를 요청했습니다\n\n상품: ${rentalInfo.productTitle}\n날짜: ${new Date(rentalInfo.startDate).toLocaleDateString('ko-KR')} ~ ${new Date(rentalInfo.endDate).toLocaleDateString('ko-KR')}\n거래 방법: ${rentMethodText}`;

            await sendMessage({
              type: 'TEXT',
              content: messageContent
            });

            console.log('대여 요청 메시지 전송 성공');
          } catch (error) {
            console.error('대여 요청 전송 실패:', error);
            throw error;
          } finally {
            setIsCreatingRental(false);
          }
        }}
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
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">메시지 검색</h2>
            </div>

            <div className="mb-4 space-y-2">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
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
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchKeyword.trim()}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? '검색 중...' : '검색'}
                </button>
              </form>
              
              {/* 날짜 선택 버튼 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {selectedDate ? new Date(selectedDate).toLocaleDateString('ko-KR') : '날짜로 검색'}
                </button>
                
                {/* 캘린더 */}
                {showDatePicker && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
                    <DatePicker
                      selectedDate={selectedDate}
                      onSelectDate={(date) => {
                        setSelectedDate(date);
                        setShowDatePicker(false);
                        handleDateSearch(date);
                      }}
                      onClose={() => setShowDatePicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>

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
                className="mt-4 w-full py-2 text-sm font-medium text-gray-900 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* 통합 거래 프로세스 모달 */}
      <TransactionProcessModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setRequestedDateRange(null); // 모달 닫을 때 초기화
        }}
        productData={productData}
        rentalData={currentRentalData}
        unavailableDates={unavailableDates || []}
        userRole={(() => {
          const currentUserId = user?.id || user?.memberId;
          const sellerId = productData?.sellerId
            || productData?.writer?.memberId
            || productData?.writer?.member_id
            || productData?.seller?.id
            || productData?.seller?.memberId
            || productData?.seller?.member_id;
          return sellerId && Number(sellerId) === Number(currentUserId) ? 'seller' : 'buyer';
        })()}
        requestedDateRange={requestedDateRange || (() => {
          // state에 requestedDateRange가 없으면 최근 대여 요청 메시지에서 날짜 가져오기
          if (messages && messages.length > 0) {
            const rentalRequests = messages
              .filter(msg => msg.type === 'rental_request')
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            if (rentalRequests.length > 0) {
              const latestRequest = rentalRequests[0];
              return {
                start: latestRequest.startDate || latestRequest.rentalInfo?.startDate,
                end: latestRequest.endDate || latestRequest.rentalInfo?.endDate
              };
            }
          }
          return null;
        })()}
        onTransactionCreated={(newRentalData) => {
          console.log('[ChatRoomPage] 거래 생성됨:', newRentalData);
          setCurrentRentalData(newRentalData);
        }}
        sendMessage={sendMessage}
        otherMemberId={currentChatRoom?.otherMember?.id || currentChatRoom?.otherMember?.memberId}
      />
    </div>
    </>
  );
};

export default ChatRoomPage;
