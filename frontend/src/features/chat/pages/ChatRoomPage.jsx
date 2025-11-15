/**
 * ChatRoomPage Component
 * 채팅방 페이지 컴포넌트 (카카오톡 스타일)
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useChatContext } from '../contexts/ChatContext';
import MessageBubble from '../components/MessageBubble';
import ShippingMessageCard, { parseShippingMessage } from '../components/ShippingMessageCard';
import ReceiveMessageCard, { parseReceiveMessage } from '../components/ReceiveMessageCard';
import ReturnMessageCard, { parseReturnMessage } from '../components/ReturnMessageCard';
import RentalRequestMessageCard, { parseRentalRequestMessage } from '../components/RentalRequestMessageCard';
import TransactionCreatedMessageCard, { parseTransactionCreatedMessage } from '../components/TransactionCreatedMessageCard';
import PaymentCompleteMessageCard, { parsePaymentCompleteMessage } from '../components/PaymentCompleteMessageCard';
import TransactionCompleteMessageCard, { parseTransactionCompleteMessage } from '../components/TransactionCompleteMessageCard';
import ProfileImage from '../../../shared/components/ProfileImage';
import MessageInput from '../components/MessageInput';
import ChatSettingsModal from '../components/ChatSettingsModal';
import RentalRequestCard from '../components/RentalRequestCard';
import RentalRequestModal from '../components/RentalRequestModal';
import TransactionProcessModal from '../components/TransactionProcessModal';
import TransactionActionButton from '../components/TransactionActionButton';
import PaymentModal from '../../../features/payment/components/PaymentModal';
import ShippingModal from '../../../features/rental/components/ShippingModal';
import ReceiveModal from '../../../features/rental/components/ReceiveModal';
import ReturnModal from '../../../features/rental/components/ReturnModal';
import ReturnReceiveModal from '../../../features/rental/components/ReturnReceiveModal';
import CancelDetailModal from '../../../features/rental/components/CancelDetailModal';
import Modal from '../../../shared/components/Modal/Modal';
import { rentalApi } from '../../../features/rental/api/rentalApi';
import { paymentApi } from '../../../features/payment/api/paymentApi';
import { accountApi } from '../../../features/user/api/accountApi';
import { messageApi } from '../api/messageApi';
import { useUnavailableDates } from '../../../features/product/hooks/useUnavailableDates';
import { useProductDetail } from '../../../features/product/hooks/useProductDetail';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import { chatApi } from '../api/chatApi';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';


// ddd
const SEARCH_PAGE_SIZE = 20;

// 거래 내역 조회 폼 컴포넌트
const TransactionCheckForm = ({ rentalData, onCheck, transactionData, isLoading, onReset }) => {
  const [accountNo, setAccountNo] = useState('');
  const [transactionUniqueNo, setTransactionUniqueNo] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accountNo || !transactionUniqueNo) {
      alert('계좌번호와 거래 고유번호를 모두 입력해주세요.');
      return;
    }
    onCheck(accountNo, transactionUniqueNo);
  };

  return (
    <div className="space-y-4">
      {!transactionData ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 SSAFY 금융망 API를 통해 실시간으로 거래 내역을 조회합니다.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              계좌번호와 거래 고유번호를 입력하고 조회 버튼을 눌러주세요.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              계좌번호 (16자리) *
            </label>
            <input
              type="text"
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, '').slice(0, 16))}
              placeholder="예: 0041234567890123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              maxLength={16}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              거래 고유번호 *
            </label>
            <input
              type="text"
              value={transactionUniqueNo}
              onChange={(e) => setTransactionUniqueNo(e.target.value.replace(/\D/g, ''))}
              placeholder="예: 7"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !accountNo || !transactionUniqueNo}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '조회 중...' : '거래 내역 조회'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800 mb-2">✅ 거래 내역 조회 완료</p>
            <button
              type="button"
              onClick={() => {
                setAccountNo('');
                setTransactionUniqueNo('');
                if (onReset) {
                  onReset();
                }
              }}
              className="text-xs text-green-600 hover:text-green-800 underline"
            >
              다시 조회하기
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">거래 고유번호</div>
              <div className="text-sm font-medium text-gray-900">{transactionData.transactionUniqueNo}</div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">거래 일시</div>
              <div className="text-sm font-medium text-gray-900">
                {transactionData.transactionDate} {transactionData.transactionTime}
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">거래 구분</div>
              <div className="text-sm font-medium text-gray-900">{transactionData.transactionTypeName}</div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">거래 금액</div>
              <div className="text-sm font-medium text-gray-900">
                {transactionData.transactionBalance?.toLocaleString()}원
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">거래 후 잔액</div>
              <div className="text-sm font-medium text-gray-900">
                {transactionData.transactionAfterBalance?.toLocaleString()}원
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-500 mb-1">거래 요약 (입금자명)</div>
              <div className="text-sm font-medium text-blue-900">{transactionData.transactionSummary}</div>
            </div>

            {transactionData.authCode && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-xs text-yellow-500 mb-1">인증 코드</div>
                <div className="text-lg font-bold text-yellow-900">{transactionData.authCode}</div>
              </div>
            )}

            {transactionData.transactionMemo && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">거래 메모</div>
                <div className="text-sm text-gray-700">{transactionData.transactionMemo}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 커스텀 날짜 선택 컴포넌트
const DatePicker = ({ selectedDate, onSelectDate, onClose, messagesWithDates = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 메시지가 있는 날짜 집합 (날짜 문자열로 변환)
  const datesWithMessages = useMemo(() => {
    const dateSet = new Set();
    messagesWithDates.forEach((msg) => {
      if (msg.createdAt || msg.timestamp) {
        const msgDate = new Date(msg.createdAt || msg.timestamp);
        const dateStr = msgDate.toDateString();
        dateSet.add(dateStr);
      }
    });
    return dateSet;
  }, [messagesWithDates]);
  
  const hasMessage = (date) => {
    return datesWithMessages.has(date.toDateString());
  };

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
          const hasMessageOnDate = hasMessage(day.date);
          
          return (
            <button
              key={index}
              onClick={() => handleDateClick(day.date)}
              className={`
                aspect-square text-sm rounded transition-all relative
                ${!day.isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                ${isTodayDate ? 'bg-gray-100 font-bold ring-2 ring-gray-900' : ''}
                ${isSelectedDate ? 'bg-gray-900 text-white font-bold' : ''}
                ${!isTodayDate && !isSelectedDate && day.isCurrentMonth ? 'hover:bg-gray-100' : ''}
              `}
            >
              {day.date.getDate()}
              {/* 메시지가 있는 날짜에 빨간 점 표시 */}
              {hasMessageOnDate && day.isCurrentMonth && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
              )}
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
  const { currentChatRoom, messages, sendMessage, sendTyping, sendReadReceipt, isConnected, setCurrentChatRoom, isLoading, error, loadOlderMessages, hasMorePast, searchMessages, jumpToMessage, deleteMessage, updateMessage, uploadFile, addMessage, setMessages, typingMemberId, updateOpponentOnlineStatus, isChatRoomDisabled } = useChatContext();
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
  const [showNoMessageModal, setShowNoMessageModal] = useState(false);
  const [noMessageDate, setNoMessageDate] = useState(null);
  
  // 메시지 점프 관련 상태 (useEffect보다 먼저 선언되어야 함)
  const [isJumpingToMessage, setIsJumpingToMessage] = useState(false);
  const [pendingScrollMessageId, setPendingScrollMessageId] = useState(null);
  const [isScrollingToMessage, setIsScrollingToMessage] = useState(false); // 스크롤 중 플래그 (자동 스크롤 방지용)
  const lastJumpTimeRef = useRef(0); // 마지막 메시지 점프 시간 (자동 스크롤 방지용)
  
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
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReturnReceiveModal, setShowReturnReceiveModal] = useState(false);
  const [showCancelDetailModal, setShowCancelDetailModal] = useState(false);
  const [cancelDetailInfo, setCancelDetailInfo] = useState(null);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [showTransactionCheckModal, setShowTransactionCheckModal] = useState(false);
  const [transactionCheckData, setTransactionCheckData] = useState(null);
  const [isCheckingTransaction, setIsCheckingTransaction] = useState(false);
  // 운송장 번호가 등록된 거래 ID 목록 (버튼 레이블 변경용)
  const [trackedRentalIds, setTrackedRentalIds] = useState(new Set());
  // 드래그 앤 드롭 상태
  const [isDragging, setIsDragging] = useState(false);

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
  
  // 대여 요청 자동 전송을 위한 정보 (location.state에서 가져옴)
  const shouldSendRentalRequest = location.state?.shouldSendRentalRequest || false;
  const rentalRequestData = location.state?.rentalRequestData || null;
  const hasSentRentalRequestRef = useRef(false); // 대여 요청 메시지 전송 여부 추적
  const hassentPaymentCompleteRef = useRef(false); // 결제 완료 메시지 전송 여부 추적

  // 결제 완료 메시지는 백엔드에서 자동 전송

  useEffect(() => {
    if (!chatRoomId) return;

    const desiredId = Number(chatRoomId);
    if (!desiredId) return;

    const currentId = Number(currentChatRoom?.chatRoomId ?? currentChatRoom?.id ?? 0);
    if (currentId === desiredId) {
      return;
    }

    // async 함수 내부에서 호출하여 에러 처리
    const loadChatRoom = async () => {
      try {
        await setCurrentChatRoom(desiredId, existingChatRoomData);
      } catch (error) {
        console.error('채팅방 로드 실패:', error);
        
        // 나간 채팅방 접근 시도 시 채팅방 목록으로 리다이렉트
        const errorMessage = error.message || '';
        if (
          errorMessage.includes('나간 채팅방') ||
          errorMessage.includes('접근할 권한이 없습니다') ||
          error.response?.status === 403
        ) {
          alert('나간 채팅방입니다.');
          navigate('/chats', { replace: true });
          return;
        }
        
        // 다른 에러는 콘솔에만 로그 (사용자에게는 표시하지 않음)
        // 이미 setCurrentChatRoom 내부에서 에러 처리가 되어 있음
      }
    };

    loadChatRoom();
  }, [chatRoomId, currentChatRoom?.chatRoomId, currentChatRoom?.id, existingChatRoomData, setCurrentChatRoom, navigate]);
  
  // 대여 요청 메시지 자동 전송 (채팅방 로드 후, WebSocket 연결 후)
  useEffect(() => {
    // 이미 전송했으면 중복 전송 방지
    if (hasSentRentalRequestRef.current) {
      return;
    }
    
    // 대여 요청을 전송해야 하는 조건 확인
    if (!shouldSendRentalRequest || !rentalRequestData || !currentChatRoom || !isConnected) {
      return;
    }
    
    // 채팅방이 로드되고 WebSocket이 연결되었을 때만 전송
    const roomId = currentChatRoom?.chatRoomId || currentChatRoom?.id;
    if (!roomId) {
      return;
    }
    
    // 대여 요청 데이터 확인
    const { dateRange, product, rentMethod } = rentalRequestData;
    if (!dateRange || !dateRange.start || !dateRange.end || !product) {
      console.warn('[ChatRoomPage] 대여 요청 데이터가 불완전합니다:', { dateRange, product });
      return;
    }
    
    // 대여 요청 메시지 전송 (약간의 지연을 두어 WebSocket 연결이 완전히 안정화되도록)
    const sendRentalRequest = async () => {
      try {
        hasSentRentalRequestRef.current = true;
        
        console.log('[ChatRoomPage] 대여 요청 메시지 자동 전송 시작:', {
          roomId,
          productId: product.id,
          dateRange,
          rentMethod
        });
        
        // 대여 기간 계산
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // 대여 요청 정보 객체 생성
        const rentalInfo = {
          type: 'RENTAL_REQUEST',
          productId: Number(product.id),
          productTitle: product.title || product.name || '상품',
          productImageUrl: product.imageUrl || product.images?.[0] || product.mainImageUrl || null,
          startDate: new Date(dateRange.start).toISOString(),
          endDate: new Date(dateRange.end).toISOString(),
          days: days,
          rentMethod: rentMethod || 'BOTH',
          dailyPrice: product.price || product.dailyPrice || 0,
          deposit: product.deposit || 0,
          totalPrice: (product.price || product.dailyPrice || 0) * days + (product.deposit || 0),
          requesterId: user?.id || user?.memberId || user?.member_id,
          requesterName: user?.nickname || user?.name || '사용자',
          requesterProfileUrl: user?.profileImage || user?.profileImageUrl || null,
          status: 'pending'
        };
        
        // 대여 요청 메시지 내용 생성 (백엔드가 TEXT 타입만 지원하므로 TEXT로 전송)
        // content에 JSON 문자열로 대여 요청 정보 포함
        const rentalRequestContent = JSON.stringify(rentalInfo);

        console.log('[ChatRoomPage] 대여 요청 메시지 전송:', {
          type: 'TEXT', // 백엔드가 RENTAL_REQUEST 타입을 지원하지 않으므로 TEXT로 전송
          content: rentalRequestContent,
          rentalInfo
        });

        // 대여 요청 메시지를 WebSocket을 통해 전송 (TEXT 타입으로 전송하되 rentalInfo는 별도로 포함)
        // 백엔드가 RENTAL_REQUEST 타입을 지원하지 않으므로 TEXT 타입으로 전송
        await sendMessage({
          type: 'TEXT', // 백엔드가 RENTAL_REQUEST 타입을 지원하지 않으므로 TEXT로 전송
          content: rentalRequestContent,
          productId: Number(product.id),
          rentalInfo: rentalInfo
        });
        
        console.log('[ChatRoomPage] 대여 요청 메시지 자동 전송 완료');
        
        // state에서 대여 요청 정보 제거 (중복 전송 방지)
        navigate(`/chats/${roomId}`, { 
          replace: true,
          state: {
            productId: product.id,
            chatRoomData: existingChatRoomData
          }
        });
      } catch (error) {
        console.error('[ChatRoomPage] 대여 요청 메시지 자동 전송 실패:', error);
        hasSentRentalRequestRef.current = false; // 실패 시 다시 시도할 수 있도록
      }
    };
    
    // WebSocket 연결 후 약간의 지연을 두어 전송
    const timer = setTimeout(() => {
      sendRentalRequest();
    }, 1000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [shouldSendRentalRequest, rentalRequestData, currentChatRoom, isConnected, sendMessage, user, existingChatRoomData, navigate]);

  // 나간 채팅방 접근 차단 (currentChatRoom이 설정된 후 확인)
  useEffect(() => {
    if (!currentChatRoom) return;
    
    // 본인이 나간 채팅방인지 확인 (isLeft는 본인이 나갔는지 여부)
    if (currentChatRoom.isLeft === true) {
      console.warn('[ChatRoomPage] 나간 채팅방 접근 차단:', currentChatRoom.chatRoomId || currentChatRoom.id);
      alert('나간 채팅방입니다.');
      navigate('/chats');
      return;
    }
  }, [currentChatRoom, navigate]);

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

  const scrollToBottom = useCallback((behavior = 'auto', force = false) => {
    // 메시지 점프 후 일정 시간 동안은 자동 스크롤 비활성화 (force가 true가 아닌 경우)
    if (!force) {
      const timeSinceLastJump = Date.now() - lastJumpTimeRef.current;
      if (timeSinceLastJump < 5000) { // 5초 동안 자동 스크롤 방지
        console.log('[scrollToBottom] 메시지 점프 후 자동 스크롤 방지:', timeSinceLastJump);
        return;
      }
    }
    
    // 메시지 점프 중이면 자동 스크롤하지 않음
    if (isJumpingToMessage || pendingScrollMessageId || isScrollingToMessage) {
      console.log('[scrollToBottom] 메시지 점프 중 자동 스크롤 방지');
      return;
    }
    
    if (messagesContainerRef.current) {
      if (behavior === 'smooth') {
        messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
      } else {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, [isJumpingToMessage, pendingScrollMessageId, isScrollingToMessage]);

  useEffect(() => {
    // 메시지 점프 후 일정 시간 동안은 자동 스크롤 완전히 비활성화
    const timeSinceLastJump = Date.now() - lastJumpTimeRef.current;
    if (timeSinceLastJump < 5000) { // 5초 동안 자동 스크롤 방지
      console.log('[useEffect sortedMessages] 메시지 점프 후 자동 스크롤 방지:', timeSinceLastJump);
      return;
    }
    
    // 메시지 점프 중이거나 대기 중이면 자동 스크롤하지 않음
    if (isJumpingToMessage || pendingScrollMessageId || isScrollingToMessage) {
      return;
    }
    if (isNearBottom) {
      scrollToBottom('auto');
    }
  }, [sortedMessages, isNearBottom, scrollToBottom, isJumpingToMessage, pendingScrollMessageId, isScrollingToMessage]);

  useEffect(() => {
    // 메시지 점프 후 일정 시간 동안은 자동 스크롤 완전히 비활성화
    const timeSinceLastJump = Date.now() - lastJumpTimeRef.current;
    if (timeSinceLastJump < 5000) { // 5초 동안 자동 스크롤 방지
      // 읽음 처리만 실행
      if (currentChatRoom?.chatRoomId || currentChatRoom?.id) {
        sendReadReceipt();
      }
      return;
    }
    
    // 메시지 점프 중이거나 대기 중이면 자동 스크롤하지 않음
    if (isJumpingToMessage || pendingScrollMessageId || isScrollingToMessage) {
      // 읽음 처리만 실행
      if (currentChatRoom?.chatRoomId || currentChatRoom?.id) {
        sendReadReceipt();
      }
      return;
    }
    scrollToBottom('auto');
    // 채팅방 진입 시 읽음 처리
    if (currentChatRoom?.chatRoomId || currentChatRoom?.id) {
      sendReadReceipt();
    }
  }, [currentChatRoom?.chatRoomId, scrollToBottom, sendReadReceipt, isJumpingToMessage, pendingScrollMessageId, isScrollingToMessage]);

  // 메시지 전송 시 자동 스크롤 (메시지 점프 중이 아니면)
  useEffect(() => {
    const handleMessageSent = () => {
      // 메시지 점프 후 일정 시간 동안은 자동 스크롤 비활성화
      const timeSinceLastJump = Date.now() - lastJumpTimeRef.current;
      if (timeSinceLastJump < 5000) {
        return;
      }
      scrollToBottom('smooth', true); // 메시지 전송은 강제로 실행
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

    // 메시지 점프 후 일정 시간 동안은 isNearBottom 업데이트를 건너뛰어 자동 스크롤 방지
    const timeSinceLastJump = Date.now() - lastJumpTimeRef.current;
    const shouldIgnoreScrollUpdate = timeSinceLastJump < 5000; // 5초 동안 무시
    
    if (!shouldIgnoreScrollUpdate && !isJumpingToMessage && !pendingScrollMessageId && !isScrollingToMessage) {
    const distanceFromBottom = container.scrollHeight - container.clientHeight - container.scrollTop;
    setIsNearBottom(distanceFromBottom < 80);
    } else {
      // 메시지 점프 후에는 강제로 하단이 아님을 유지 (자동 스크롤 방지)
      if (shouldIgnoreScrollUpdate || isJumpingToMessage || pendingScrollMessageId || isScrollingToMessage) {
        setIsNearBottom(false);
      }
    }
  }, [hasMorePast, isLoadingHistory, loadOlderMessages, isJumpingToMessage, pendingScrollMessageId, isScrollingToMessage]);

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

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 자식 요소로 이동할 때 isDragging이 false가 되는 것을 방지
    if (e.currentTarget.contains(e.relatedTarget)) {
      return;
    }

    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];

    // 파일 타입 검증
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('이미지 또는 영상 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 검증
    const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = isImage ? '10MB' : '50MB';
      alert(`파일 크기가 너무 큽니다. ${isImage ? '이미지' : '영상'}는 최대 ${maxSizeMB}까지 업로드할 수 있습니다.`);
      return;
    }

    await handleSendFile(file);
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

    // 결제 모달 열기 전 환경 변수 확인
    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY?.trim();
    console.log('[ChatRoomPage] 결제 모달 열기 전 VITE_TOSS_CLIENT_KEY 확인:', {
      exists: !!import.meta.env.VITE_TOSS_CLIENT_KEY,
      value: clientKey ? `${clientKey.substring(0, 15)}...` : 'undefined',
      length: clientKey?.length || 0,
      messageId: message.id,
      orderId: message.paymentInfo?.orderId
    });

    setPaymentMessage(message);
    setShowPaymentModal(true);
  };

  // 취소 승인 핸들러
  const handleCancelApprove = async () => {
    if (!cancelDetailInfo || !cancelDetailInfo.cancelId) {
      alert('취소 정보를 찾을 수 없습니다.');
      return;
    }

    if (!window.confirm('거래 취소를 승인하시겠습니까?')) {
      return;
    }

    try {
      setIsProcessingCancel(true);

      console.log('[ChatRoomPage] 취소 승인:', { cancelId: cancelDetailInfo.cancelId });

      // 취소 승인 API 호출
      await rentalApi.approveCancel(cancelDetailInfo.cancelId);

      alert('취소가 승인되었습니다. 보증금이 분배됩니다.');

      // 채팅방에 취소 승인 메시지 전송
      await sendMessage({
        type: 'TEXT',
        content: `✅ 거래 취소가 승인되었습니다.\n\n보증금이 합의된 대로 분배됩니다.`
      });

      setShowCancelDetailModal(false);
      setCancelDetailInfo(null);
    } catch (err) {
      console.error('[ChatRoomPage] 취소 승인 실패:', err);
      alert(err.response?.data?.message || err.message || '취소 승인에 실패했습니다.');
    } finally {
      setIsProcessingCancel(false);
    }
  };

  // 취소 거절 핸들러
  const handleCancelReject = async () => {
    if (!cancelDetailInfo || !cancelDetailInfo.cancelId) {
      alert('취소 정보를 찾을 수 없습니다.');
      return;
    }

    if (!window.confirm('거래 취소를 거절하시겠습니까? 거래가 계속 진행됩니다.')) {
      return;
    }

    try {
      setIsProcessingCancel(true);

      console.log('[ChatRoomPage] 취소 거절:', { cancelId: cancelDetailInfo.cancelId });

      // 취소 거절 API 호출
      await rentalApi.rejectCancel(cancelDetailInfo.cancelId);

      alert('취소가 거절되었습니다. 거래가 계속 진행됩니다.');

      // 채팅방에 취소 거절 메시지 전송
      await sendMessage({
        type: 'TEXT',
        content: `❌ 거래 취소가 거절되었습니다.\n\n거래가 계속 진행됩니다.`
      });

      setShowCancelDetailModal(false);
      setCancelDetailInfo(null);
    } catch (err) {
      console.error('[ChatRoomPage] 취소 거절 실패:', err);
      alert(err.response?.data?.message || err.message || '취소 거절에 실패했습니다.');
    } finally {
      setIsProcessingCancel(false);
    }
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

    // 상품 정보 확인
    if (!productData) {
      alert('상품 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      setIsCreatingRental(true);
      
      // 대여 기간 계산
      const startDate = new Date(rentalData.startRen);
      const endDate = new Date(rentalData.endRen);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // 대여 요청 정보 객체 생성
      const rentalInfo = {
        type: 'RENTAL_REQUEST',
        productId: Number(productId),
        productTitle: productData.title || productData.name || '상품',
        productImageUrl: productData.imageUrl || (productData.images && productData.images.length > 0 ? productData.images[0] : null) || null,
        startDate: rentalData.startRen,
        endDate: rentalData.endRen,
        days: days,
        rentMethod: rentalData.rentMethod,
        dailyPrice: productData.dailyPrice || productData.price || 0,
        deposit: productData.deposit || 0,
        totalPrice: (productData.dailyPrice || productData.price || 0) * days + (productData.deposit || 0),
        requesterId: currentUserId,
        requesterName: user?.nickname || user?.name || '사용자',
        requesterProfileUrl: user?.profileImage || user?.profileImageUrl || null,
        status: 'pending'
      };
      
      // 대여 요청 메시지 내용 생성 (백엔드가 TEXT 타입만 지원하므로 TEXT로 전송)
      // content에 JSON 문자열로 대여 요청 정보 포함
      const rentalRequestContent = JSON.stringify(rentalInfo);

      console.log('[ChatRoomPage] 대여 요청 메시지 전송 (handleCreateRental):', {
        type: 'TEXT', // 백엔드가 RENTAL_REQUEST 타입을 지원하지 않으므로 TEXT로 전송
        content: rentalRequestContent,
        rentalInfo
      });

      // 대여 요청 메시지를 WebSocket을 통해 전송 (TEXT 타입으로 전송하되 rentalInfo는 별도로 포함)
      // 백엔드가 RENTAL_REQUEST 타입을 지원하지 않으므로 TEXT 타입으로 전송
      await sendMessage({
        type: 'TEXT', // 백엔드가 RENTAL_REQUEST 타입을 지원하지 않으므로 TEXT로 전송
        content: rentalRequestContent,
        productId: Number(productId),
        rentalInfo: rentalInfo
      });
      
      console.log('[ChatRoomPage] 대여 요청 메시지 전송 성공:', {
        productId,
        productTitle: productData.title || productData.name,
        startDate: rentalData.startRen,
        endDate: rentalData.endRen,
        days,
        rentMethod: rentalData.rentMethod
      });
      
      // 모달은 TransactionProcessModal이 관리하므로 여기서는 닫지 않음
      
      alert('대여 요청을 전송했습니다. 상대방의 승인을 기다려주세요.');
    } catch (error) {
      console.error('[ChatRoomPage] 대여 요청 전송 실패:', error);
      alert('대여 요청 전송에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
      hasSentRentalRequestRef.current = false; // 실패 시 다시 시도할 수 있도록
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

  // 메시지 점프 및 스크롤 (메시지 점프 API 사용)
  const scrollToMessage = useCallback(async (messageId, options = {}) => {
    if (!messageId || !currentChatRoom) {
      console.warn('[scrollToMessage] 메시지 ID 또는 채팅방이 없습니다:', { messageId, currentChatRoom });
      return false;
    }

    const messageIdStr = String(messageId);
    console.log('[scrollToMessage] 시작:', { messageId: messageIdStr, currentMessagesCount: sortedMessages.length });

    try {
      // 먼저 현재 메시지 목록에서 메시지가 있는지 확인
      const messageExists = sortedMessages.some(msg => {
        const msgId = String(msg.id || '');
        return msgId === messageIdStr;
      });
      
      console.log('[scrollToMessage] 현재 목록에 메시지 존재 여부:', messageExists);

      if (messageExists) {
        // 현재 목록에 있으면 바로 스크롤 (API 호출 없이)
        // 메시지 점프 시작 시간 기록
        lastJumpTimeRef.current = Date.now();
        setPendingScrollMessageId(messageIdStr);
        return true;
      }

      // 현재 목록에 없으면 메시지 점프 API 호출
      console.log('[scrollToMessage] 메시지 점프 API 호출 시작:', messageIdStr);
      setIsJumpingToMessage(true);
      setSearchError('');
      // 메시지 점프 시작 시간 기록
      lastJumpTimeRef.current = Date.now();
      
      const result = await jumpToMessage(messageIdStr, { before: 20, after: 20, ...options });
      
      if (!result || !result.success) {
        console.error('[scrollToMessage] 메시지 점프 API 실패:', result);
        setSearchError('메시지를 찾을 수 없습니다.');
        setIsJumpingToMessage(false);
        return false;
      }

      console.log('[scrollToMessage] 메시지 점프 API 성공:', { 
        messageId: messageIdStr, 
        mergedMessagesCount: result.messages?.length,
        targetMessageIndex: result.targetMessageIndex 
      });

      // 메시지가 업데이트되면 useEffect가 자동으로 스크롤 처리
      // 메시지 점프 시작 시간 기록
      lastJumpTimeRef.current = Date.now();
      setPendingScrollMessageId(messageIdStr);
          return true;
    } catch (error) {
      console.error('[scrollToMessage] 메시지 점프 실패:', error);
      setSearchError(error.message || '메시지 점프에 실패했습니다.');
      setIsJumpingToMessage(false);
      return false;
    }
  }, [currentChatRoom, jumpToMessage, setIsNearBottom, setIsSearchOpen, setSearchError, sortedMessages]);

  // 날짜로 검색 (해당 날짜의 첫 메시지로 이동)
  const handleDateSearch = useCallback(async (date) => {
    if (!date || !currentChatRoom) return;
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    try {
      setSearchError('');
      console.log('[handleDateSearch] 날짜 검색 시작:', { date, targetDate: targetDate.toISOString(), nextDay: nextDay.toISOString() });
      
      const roomId = currentChatRoom.chatRoomId || currentChatRoom.id;
      if (!roomId) {
        setSearchError('채팅방 ID를 확인할 수 없습니다.');
        return;
      }

      console.log('[handleDateSearch] API로 메시지 조회 시작:', roomId);
      
      // 날짜 시작 시간 이후의 메시지 조회 (더 많은 메시지를 가져와서 해당 날짜의 메시지를 찾을 수 있도록)
      const dateMessages = await messageApi.getMessages(roomId, {
        after: targetDate.toISOString(),
        size: 200 // 더 많은 메시지를 가져와서 해당 날짜의 메시지를 찾을 수 있도록
      });

      console.log('[handleDateSearch] API로 조회한 메시지 수:', dateMessages.length);

      // 해당 날짜의 메시지 필터링 (다음 날 이전)
      const messagesOnTargetDate = dateMessages.filter((msg) => {
        if (!msg.createdAt && !msg.timestamp) return false;
        const msgDate = new Date(msg.createdAt || msg.timestamp);
        return msgDate >= targetDate && msgDate < nextDay;
      });
      
      console.log('[handleDateSearch] 필터링된 메시지 수:', messagesOnTargetDate.length);
      
      if (messagesOnTargetDate.length > 0) {
        // 시간순으로 정렬하여 가장 첫 메시지 찾기
        const sortedMessagesOnTargetDate = messagesOnTargetDate.sort((a, b) => {
          const aTime = new Date(a.createdAt || a.timestamp).getTime();
          const bTime = new Date(b.createdAt || b.timestamp).getTime();
          return aTime - bTime;
        });
        const firstMessage = sortedMessagesOnTargetDate[0];
        console.log('[handleDateSearch] API에서 첫 메시지 찾음:', firstMessage.id || firstMessage._id);
        
        // 메시지 ID 확인 (다양한 형식 지원)
        const messageId = firstMessage.id || firstMessage._id || firstMessage.messageId;
        if (messageId) {
          await scrollToMessage(messageId);
        } else {
          console.error('[handleDateSearch] 메시지 ID를 찾을 수 없음:', firstMessage);
          setSearchError('메시지 ID를 찾을 수 없습니다.');
        }
      } else {
        // 해당 날짜에 메시지가 없으면 모달 표시
        const formattedDate = new Intl.DateTimeFormat('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        }).format(targetDate);
        
        setNoMessageDate(formattedDate);
        setShowNoMessageModal(true);
      }
    } catch (error) {
      console.error('[handleDateSearch] 날짜 검색 실패:', error);
      setSearchError(error.message || '날짜 검색에 실패했습니다.');
    }
  }, [currentChatRoom, scrollToMessage, setSearchError]);

  // 메시지가 업데이트된 후 스크롤 처리
  useEffect(() => {
    if (!pendingScrollMessageId || !messagesContainerRef.current) return;
    
    // 스크롤 시작 플래그 설정
    setIsScrollingToMessage(true);

    // 메시지가 목록에 있는지 확인
    const messageExists = sortedMessages.some(msg => String(msg.id) === String(pendingScrollMessageId));
    if (!messageExists) {
      // 메시지가 아직 목록에 없으면 대기 (다음 업데이트 때 다시 확인)
      console.log('[useEffect scroll] 메시지가 아직 목록에 없음, 대기 중:', pendingScrollMessageId);
      return;
    }

    const scrollToPendingMessage = async () => {
      const messageId = pendingScrollMessageId;
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      
      // DOM 렌더링 대기
        for (let i = 0; i < 5; i++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      await wait(300);

        const container = messagesContainerRef.current;
        if (!container) {
        console.warn('[useEffect scroll] 컨테이너를 찾을 수 없습니다');
        setPendingScrollMessageId(null);
        setIsJumpingToMessage(false);
        return;
      }

      // DOM 요소 찾기
      let element = null;
      for (let attempt = 0; attempt < 100; attempt++) {
        element = document.getElementById(`message-${messageId}`);
          if (element) {
          console.log('[useEffect scroll] DOM 요소 찾음 (시도 횟수):', attempt + 1);
          break;
          }
        await wait(50);
      }
        
          if (element) {
        console.log('[useEffect scroll] DOM 요소 찾음, 스크롤 실행:', messageId);
            setIsNearBottom(false);
            setIsSearchOpen(false);
        
        // 하이라이트 효과 추가
        element.classList.add('ring-2', 'ring-gray-900', 'ring-offset-2', 'rounded-lg', 'transition-all');
        
        // 요소가 컨테이너 내에 있는지 확인
        const isElementInContainer = container.contains(element);
        console.log('[useEffect scroll] 요소가 컨테이너 내에 있음:', isElementInContainer);
        
        if (!isElementInContainer) {
          console.error('[useEffect scroll] 요소가 컨테이너 내에 없습니다!');
          setPendingScrollMessageId(null);
          setIsJumpingToMessage(false);
          return;
        }
        
        // 원본 요소 저장 (루프에서 변경되므로)
        const targetElement = element;
        
        // 방법: getBoundingClientRect 사용 (가장 정확)
        const containerRect = container.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const currentScrollTop = container.scrollTop;
        
        // 요소의 현재 위치 (컨테이너 기준)
        // 요소의 상대 위치 = 요소의 뷰포트 상대 위치 + 현재 스크롤 위치
        const elementTopFromContainer = elementRect.top - containerRect.top + currentScrollTop;
        
        // 요소를 컨테이너 상단에 위치시키기 (약간의 여백 포함)
        const targetScrollTop = Math.max(0, elementTopFromContainer - 20);
        
        // 컨테이너의 최대 스크롤 위치 확인
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        const finalScrollTop = Math.min(targetScrollTop, maxScrollTop);
        
        console.log('[useEffect scroll] 스크롤 위치 계산:', { 
          elementTopFromContainer,
          targetScrollTop,
          finalScrollTop,
          currentScrollTop: container.scrollTop,
          maxScrollTop,
          containerHeight: container.clientHeight,
          scrollHeight: container.scrollHeight,
          elementHeight: targetElement.offsetHeight,
          elementRectTop: elementRect.top,
          containerRectTop: containerRect.top,
          elementId: targetElement.id
        });
        
        // 스크롤 실행
        console.log('[useEffect scroll] 스크롤 실행 전:', {
          currentScrollTop: container.scrollTop,
          targetScrollTop: finalScrollTop,
          scrollDifference: finalScrollTop - container.scrollTop
        });
        
        // 먼저 즉시 스크롤 (사용자가 즉시 볼 수 있도록)
        container.scrollTop = finalScrollTop;
        
        // 강제로 리플로우 발생 (스크롤이 즉시 적용되도록)
        void container.offsetHeight;
        
        console.log('[useEffect scroll] 즉시 스크롤 실행 후:', {
          scrollTop: container.scrollTop,
          expected: finalScrollTop,
          matched: Math.abs(container.scrollTop - finalScrollTop) < 1
        });
        
        // 추가 확인: 만약 스크롤이 적용되지 않았다면 다시 시도
        requestAnimationFrame(() => {
          const actualScroll = container.scrollTop;
          if (Math.abs(actualScroll - finalScrollTop) > 5) {
            console.warn('[useEffect scroll] 스크롤이 적용되지 않음, 재시도');
            container.scrollTop = finalScrollTop;
          }
        });
        
        // 스크롤이 제대로 되었는지 확인
            setTimeout(() => {
          const actualScrollTop = container.scrollTop;
          const elementRectAfter = targetElement.getBoundingClientRect();
          const containerRectAfter = container.getBoundingClientRect();
          const elementTopRelative = elementRectAfter.top - containerRectAfter.top;
          
          console.log('[useEffect scroll] 스크롤 후 확인:', {
            actualScrollTop,
            finalScrollTop,
            diff: Math.abs(actualScrollTop - finalScrollTop),
            elementTopRelative,
            isVisible: elementTopRelative >= -10 && elementTopRelative < containerRectAfter.height + 10,
            containerScrollTop: container.scrollTop,
            containerScrollHeight: container.scrollHeight
          });
          
          // 요소가 여전히 보이지 않으면 다시 시도
          if (elementTopRelative < -100 || elementTopRelative > containerRectAfter.height + 100) {
            console.warn('[useEffect scroll] 요소가 여전히 보이지 않음, 재시도');
            const newElementRect = targetElement.getBoundingClientRect();
            const newContainerRect = container.getBoundingClientRect();
            const newRelativeTop = newElementRect.top - newContainerRect.top + container.scrollTop;
            container.scrollTop = Math.max(0, newRelativeTop - 20);
          }
        }, 300);
        
        // 2초 후 하이라이트 제거
        setTimeout(() => {
          targetElement.classList.remove('ring-2', 'ring-gray-900', 'ring-offset-2', 'rounded-lg', 'transition-all');
        }, 2000);
      } else {
        // 디버깅을 위해 모든 메시지 ID 출력
        const allMessageElements = document.querySelectorAll('[id^="message-"]');
        const allMessageIds = Array.from(allMessageElements).map(el => el.id);
        console.error('[useEffect scroll] DOM 요소를 찾을 수 없음:', {
          messageId,
          totalElements: allMessageIds.length,
          sampleIds: allMessageIds.slice(0, 10)
        });
      }

      // 메시지 점프 완료 시간 기록
      lastJumpTimeRef.current = Date.now();
      
      setPendingScrollMessageId(null);
      setIsJumpingToMessage(false);
      
      // isNearBottom을 false로 유지하여 자동 스크롤 방지
      setIsNearBottom(false);
      
      // 스크롤 완료 후 플래그 해제 (더 긴 지연을 두어 자동 스크롤이 발생하지 않도록)
      // 주의: lastJumpTimeRef는 이미 업데이트되었으므로 handleScroll에서도 자동 스크롤이 방지됨
      setTimeout(() => {
        setIsScrollingToMessage(false);
      }, 2000); // 2초 후 플래그 해제 (lastJumpTimeRef는 5초 동안 유지)
    };

    scrollToPendingMessage();
  }, [pendingScrollMessageId, sortedMessages, setIsNearBottom, setIsSearchOpen]);

  const handleResultClick = useCallback(async (message) => {
    if (!message || !message.id) {
      setSearchError('메시지 정보가 없습니다.');
      return;
    }

    try {
      const messageId = String(message.id);
      console.log('[handleResultClick] 검색 결과 클릭:', messageId);
      
      // 먼저 현재 목록에서 확인
      const messageExists = sortedMessages.some(msg => String(msg.id) === messageId);
      
      if (messageExists) {
        // 현재 목록에 있으면 바로 스크롤
        // 메시지 점프 시작 시간 기록
        lastJumpTimeRef.current = Date.now();
        setPendingScrollMessageId(messageId);
      } else {
        // 현재 목록에 없으면 메시지 점프 API 호출
    setIsJumpingToMessage(true);
    setSearchError('');
        // 메시지 점프 시작 시간 기록
        lastJumpTimeRef.current = Date.now();
        
        try {
          const result = await jumpToMessage(messageId, { before: 20, after: 20 });
          
          if (result && result.success) {
            // 메시지가 업데이트되면 useEffect가 자동으로 스크롤 처리
            setPendingScrollMessageId(messageId);
          } else {
            setSearchError('메시지를 찾을 수 없습니다.');
            setIsJumpingToMessage(false);
          }
        } catch (error) {
          console.error('[handleResultClick] 메시지 점프 실패:', error);
          setSearchError(error.message || '메시지로 이동하는데 실패했습니다.');
      setIsJumpingToMessage(false);
    }
      }
    } catch (error) {
      console.error('[handleResultClick] 검색 결과 클릭 실패:', error);
      setSearchError(error.message || '메시지로 이동하는데 실패했습니다.');
      setIsJumpingToMessage(false);
    }
  }, [sortedMessages, jumpToMessage, setIsSearchOpen, setSearchError]);

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
              onClick={() => navigate('/chats')}
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
            {/* 거래/결제 버튼 (모듈화) */}
            <TransactionActionButton
              productId={productId}
              currentRentalData={currentRentalData}
              productData={productData}
              user={user}
              onCreateTransaction={() => setShowTransactionModal(true)}
              onRentalRequest={() => setShowTransactionModal(true)}
              onTransactionProcess={() => setShowTransactionModal(true)}
              onShipping={() => setShowShippingModal(true)}
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
            {/* 날짜 검색 버튼 (캘린더 아이콘) */}
            <button
              onClick={() => setShowDatePicker(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="날짜로 검색"
              title="날짜로 검색"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide flex flex-col relative ${isDragging ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
      >
        {/* 드래그 앤 드롭 오버레이 */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">이미지/영상 업로드</p>
              <p className="text-sm text-gray-600">
                파일을 여기에 놓아주세요
              </p>
            </div>
          </div>
        )}

        {isLoadingHistory && (
          <div className="flex justify-center py-2 text-xs text-gray-500">
            이전 메시지를 불러오는 중...
          </div>
        )}
        {sortedMessages.length > 0 ? (
          sortedMessages.map((message, index) => {
            const key = message.id || `${message.timestamp || 'message'}-${index}`;
            const anchorId = message.id ? `message-${message.id}` : undefined;
            
            // 날짜 구분선 표시 (이전 메시지와 날짜가 다를 때)
            const showDateDivider = (() => {
              if (index === 0) return true; // 첫 메시지는 항상 날짜 표시
              
              const currentDate = new Date(message.timestamp || message.createdAt);
              const prevMessage = sortedMessages[index - 1];
              if (!prevMessage) return false;
              
              const prevDate = new Date(prevMessage.timestamp || prevMessage.createdAt);
              
              // 날짜가 다르면 구분선 표시
              return (
                currentDate.getFullYear() !== prevDate.getFullYear() ||
                currentDate.getMonth() !== prevDate.getMonth() ||
                currentDate.getDate() !== prevDate.getDate()
              );
            })();
            
            // 날짜 포맷 함수
            const formatDate = (date) => {
              const d = new Date(date);
              const year = d.getFullYear();
              const month = d.getMonth() + 1;
              const day = d.getDate();
              const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
              const weekday = weekdays[d.getDay()];
              return `${year}년 ${month}월 ${day}일 ${weekday}`;
            };
            
            // 날짜 구분선 컴포넌트
            const DateDivider = () => (
              <div className="flex items-center justify-center my-4 px-4">
                <div className="flex items-center gap-2 w-full max-w-md mx-auto">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-xs text-gray-600 px-4 py-2 bg-blue-100 rounded-full whitespace-nowrap font-medium">
                    {formatDate(message.timestamp || message.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
              </div>
            );
            
            // 모든 메시지는 MessageBubble을 통해 렌더링
            const currentUserId = user?.id || user?.memberId;
            const senderId = message.sender?.id;
            const isOwn = Number(currentUserId) === Number(senderId);
            
            // 대여 요청 메시지의 경우 판매자 여부 확인 (승인/거절 버튼 표시용)
            let isSeller = false;
            if (message.type === 'rental_request' && !isOwn && message.status === 'pending') {
              const sellerId = productData?.sellerId 
                || productData?.writer?.memberId 
                || productData?.writer?.member_id
                || productData?.seller?.id 
                || productData?.seller?.memberId
                || productData?.seller?.member_id;
              isSeller = sellerId && Number(sellerId) === Number(currentUserId);
            }

            // 메시지 내용에 따라 액션 버튼 생성 (MessageBubble에서 사용)
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
                      setRequestedDateRange({
                        start: startDate,
                        end: endDate,
                        rentMethod
                      });

                      setCurrentRentalData(null);
                      setTimeout(() => {
                        setShowTransactionModal(true);
                      }, 50);
                    }
                  });
                }

                return buttons;
              }

              // 결제 대기 메시지 (거래는 생성되었지만 결제가 안 됨)
              if (content.includes('💳 결제 대기') || content.includes('결제하러 가기')) {
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

                      // 순서 중요: requestedDateRange를 먼저 초기화한 후 rentalData 설정
                      setRequestedDateRange(null);
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

              // 취소 요청 메시지 - MESSAGE_TYPE 마커로 확인 (type은 소문자로 정규화됨)
              const isCancelRequest = message.type === 'cancel_request' || (message.type === 'text' && content?.includes('MESSAGE_TYPE:CANCEL_REQUEST'));
              if (isCancelRequest) {
                console.log('[ChatRoomPage] 취소 요청 메시지 감지:', {
                  messageType: message.type,
                  content: content.substring(0, 100),
                  currentUserId,
                  senderId: message.sender?.id
                });

                const buttons = [];

                // rentalHisId와 cancelId 추출
                const rentalHisIdMatch = content.match(/rentalHisId:(\d+)/);
                const cancelIdMatch = content.match(/cancelId:(\d+)/);
                const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;
                const cancelId = cancelIdMatch ? Number(cancelIdMatch[1]) : null;

                console.log('[ChatRoomPage] 추출된 ID:', { rentalHisId, cancelId });

                // 취소 사유 및 보증금 정보 추출
                const reasonMatch = content.match(/취소 사유: (.*?)\n/);
                const buyerRefundMatch = content.match(/구매자 환불: ([\d,]+)원/);
                const sellerRefundMatch = content.match(/판매자 환불: ([\d,]+)원/);

                const reason = reasonMatch ? reasonMatch[1] : '';
                const buyerRefund = buyerRefundMatch ? Number(buyerRefundMatch[1].replace(/,/g, '')) : 0;
                const sellerRefund = sellerRefundMatch ? Number(sellerRefundMatch[1].replace(/,/g, '')) : 0;

                // 메시지 발신자가 아닌 사람에게만 버튼 표시
                const senderId = message.sender?.id;
                const isOwn = Number(currentUserId) === Number(senderId);

                console.log('[ChatRoomPage] 버튼 표시 조건 체크:', {
                  isOwn,
                  rentalHisId,
                  cancelId,
                  shouldShowButton: !isOwn && rentalHisId && cancelId
                });

                if (!isOwn && rentalHisId && cancelId) {
                  buttons.push({
                    label: '📋 취소 사유 보기',
                    className: 'bg-orange-600 text-white hover:bg-orange-700',
                    onClick: async () => {
                      try {
                        console.log('[ChatRoomPage] 취소 사유 보기 클릭:', { rentalHisId, cancelId });

                        // 취소 상세 모달 열기
                        setShowCancelDetailModal(true);
                        setCancelDetailInfo({
                          cancelId,
                          rentalHisId,
                          reason,
                          buyerRefund,
                          sellerRefund,
                          requesterName: message.sender?.username || message.sender?.name || '상대방'
                        });
                      } catch (err) {
                        console.error('[ChatRoomPage] 취소 정보 표시 실패:', err);
                        alert('취소 정보를 불러올 수 없습니다.');
                      }
                    }
                  });
                }

                console.log('[ChatRoomPage] 반환할 버튼:', buttons);
                return buttons.length > 0 ? buttons : null;
              }

              // 결제 완료 메시지 - MESSAGE_TYPE 마커로 확인 (type은 소문자로 정규화됨)
              const isPaymentComplete = message.type === 'payment_complete'
                || (message.type === 'text' && content?.includes('MESSAGE_TYPE:PAYMENT_COMPLETE'))
                || (message.type === 'system' && content?.includes('MESSAGE_TYPE:PAYMENT_COMPLETE'));
              if (isPaymentComplete) {
                const buttons = [];

                // rentalHisId 추출
                const rentalHisIdMatch = content.match(/rentalHisId:(\d+)/);
                const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;

                // 판매자 확인
                const sellerId = productData?.sellerId
                  || productData?.writer?.memberId
                  || productData?.writer?.member_id
                  || productData?.seller?.id
                  || productData?.seller?.memberId
                  || productData?.seller?.member_id;
                const isSeller = sellerId && Number(sellerId) === Number(currentUserId);

                console.log('[ChatRoomPage] 결제 완료 메시지 감지:', {
                  rentalHisId,
                  sellerId,
                  currentUserId,
                  isSeller,
                  productData
                });

                // 판매자/구매자 모두 배송 조회 버튼 처리
                if (rentalHisId) {
                  // 운송장 번호가 등록되었는지 확인
                  const hasTracking = trackedRentalIds.has(rentalHisId);
                  
                  buttons.push({
                    label: hasTracking ? '🚚 배송 조회' : (isSeller ? '📦 물품 보내기' : '📋 거래 확인'),
                    className: hasTracking 
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : (isSeller ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'),
                    onClick: async () => {
                      try {
                        console.log('[ChatRoomPage] 버튼 클릭:', { isSeller, rentalHisId, hasTracking });

                        // rentalHisId로 거래 상세 조회
                        const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const rentalData = rentalResponse.data || rentalResponse;

                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);

                        setCurrentRentalData(rentalData);

                        // 운송장 번호 확인
                        const trackingNumber = rentalData?.trackingNo || rentalData?.trackingNumber;
                        const courier = rentalData?.carrierCode || rentalData?.courier;

                        if (trackingNumber && courier) {
                          // 운송장 번호가 있으면 버튼 레이블만 변경 (배송 조회는 ShippingMessageCard에서 처리)
                          setTrackedRentalIds(prev => new Set([...prev, rentalHisId]));
                        } else {
                          // 운송장 번호가 없으면 기존 동작
                          if (isSeller) {
                            // 판매자: 발송 모달 열기
                            setTimeout(() => {
                              setShowShippingModal(true);
                            }, 50);
                          } else {
                            // 구매자: 거래 내역 조회 모달 열기
                            setShowTransactionCheckModal(true);
                          }
                        }
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                        alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                      }
                    }
                  });
                }

                return buttons.length > 0 ? buttons : null;
              }

              // 물품 발송 완료 메시지
              if (content.includes('📦 물품을 발송했습니다')) {
                const buttons = [];

                // rentalHisId 추출
                const rentalHisIdMatch = content.match(/rentalHisId:(\d+)/);
                const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;

                // 판매자 확인
                const sellerId = productData?.sellerId
                  || productData?.writer?.memberId
                  || productData?.writer?.member_id
                  || productData?.seller?.id
                  || productData?.seller?.memberId
                  || productData?.seller?.member_id;
                const isSeller = sellerId && Number(sellerId) === Number(currentUserId);

                // 구매자에게만 "물품 수령 확인하기" 버튼 표시
                if (!isSeller && rentalHisId) {
                  buttons.push({
                    text: '✅ 물품 수령 확인하기',
                    style: 'primary',
                    onClick: async () => {
                      try {
                        console.log('[ChatRoomPage] 물품 수령 확인하기 클릭:', rentalHisId);

                        // rentalHisId로 거래 상세 조회
                        const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const rentalData = rentalResponse.data;

                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);

                        setCurrentRentalData(rentalData);

                        // 수령 모달 열기
                        setTimeout(() => {
                          setShowReceiveModal(true);
                        }, 50);
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                        alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                      }
                    }
                  });
                }

                return buttons.length > 0 ? buttons : null;
              }

              // 물품 수령 완료 메시지
              if (content.includes('✅ 물품을 수령했습니다')) {
                const buttons = [];

                // 판매자 확인
                const sellerId = productData?.sellerId
                  || productData?.writer?.memberId
                  || productData?.writer?.member_id
                  || productData?.seller?.id
                  || productData?.seller?.memberId
                  || productData?.seller?.member_id;
                const isSeller = sellerId && Number(sellerId) === Number(currentUserId);

                // 구매자에게만 "반납하기", "거래 중단하기" 버튼 표시
                if (!isSeller && currentRentalData?.rentalHisId) {
                  buttons.push(
                    {
                      text: '📦 반납하기',
                      style: 'primary',
                      onClick: () => {
                        setShowTransactionModal(true);
                      }
                    },
                    {
                      text: '🚫 거래 중단하기',
                      style: 'danger',
                      onClick: () => {
                        // 취소 모달 열기 (TransactionProcessModal 내부에 있음)
                        setShowTransactionModal(true);
                      }
                    }
                  );
                }

                return buttons.length > 0 ? buttons : null;
              }

              // 반납 완료 메시지 - 판매자에게 "반납 수령 확인하기" 버튼 표시
              if (content.includes('📦 반납을 완료했습니다')) {
                const buttons = [];
                const rentalHisIdMatch = content.match(/rentalHisId:(\d+)/);
                const rentalHisId = rentalHisIdMatch ? parseInt(rentalHisIdMatch[1]) : null;

                // 판매자 확인
                const sellerId = productData?.sellerId
                  || productData?.writer?.memberId
                  || productData?.writer?.member_id
                  || productData?.seller?.id
                  || productData?.seller?.memberId
                  || productData?.seller?.member_id;
                const isSeller = sellerId && Number(sellerId) === Number(currentUserId);

                // 판매자에게만 "반납 수령 확인하기" 버튼 표시
                if (isSeller && rentalHisId) {
                  buttons.push({
                    text: '✅ 반납 수령 확인하기',
                    style: 'primary',
                    onClick: async () => {
                      try {
                        console.log('[ChatRoomPage] 반납 수령 확인하기 클릭:', rentalHisId);

                        // rentalHisId로 거래 상세 조회
                        const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const rentalData = rentalResponse.data;

                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);

                        setCurrentRentalData(rentalData);

                        // 반납 수령 모달 열기
                        setTimeout(() => {
                          setShowReturnReceiveModal(true);
                        }, 50);
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                        alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                      }
                    }
                  });
                }

                return buttons.length > 0 ? buttons : null;
              }

              return null;
            };

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
                  <React.Fragment key={key}>
                    {showDateDivider && <DateDivider />}
                    <div id={anchorId} className="mb-4">
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
                  </React.Fragment>
                );
              }
              
              // 승인된 요청이고 요청자(isOwn)이면 결제 승인 버튼 표시
              if (isOwn && message.status === 'approved' && message.orderId && !message.paymentConfirmed) {
                return (
                  <React.Fragment key={key}>
                    {showDateDivider && <DateDivider />}
                    <div id={anchorId} className="mb-4">
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
                  </React.Fragment>
                );
              }

            // 대여 요청 메시지 감지 (카드로 렌더링)
            const rentalRequestInfo = parseRentalRequestMessage(message.content);
            if (rentalRequestInfo) {
              // 요청자 확인
              const senderId = message.sender?.id || message.sender?.memberId;
              const currentUserId = user?.id || user?.memberId;
              const isRequester = senderId && Number(senderId) === Number(currentUserId);

              // 판매자 확인
              const sellerId = productData?.sellerId
                || productData?.writer?.memberId
                || productData?.writer?.member_id
                || productData?.seller?.id
                || productData?.seller?.memberId
                || productData?.seller?.member_id;
              const isSeller = sellerId && Number(sellerId) === Number(currentUserId);

              return (
                <React.Fragment key={key}>
                  {showDateDivider && <DateDivider />}
                  <RentalRequestMessageCard
                    message={message}
                    isOwn={isOwn}
                    isRequester={isRequester}
                    isSeller={isSeller}
                    onRentalRequestAgain={() => {
                      setShowRentalRequestModal(true);
                    }}
                    onCreateTransaction={async ({ startDate, endDate, rentMethod }) => {
                      // 상품 ID 추출
                      const productIdToUse = productId || productData?.productId || productData?.product_id;
                      if (!productIdToUse) {
                        alert('상품 정보를 찾을 수 없습니다.');
                        return;
                      }

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
                      setRequestedDateRange({
                        start: startDate,
                        end: endDate,
                        rentMethod
                      });

                      setCurrentRentalData(null);
                      setTimeout(() => {
                        setShowTransactionModal(true);
                      }, 50);
                    }}
                  />
                </React.Fragment>
              );
            }

            // 거래 생성 완료 메시지 감지 (카드로 렌더링)
            const transactionInfo = parseTransactionCreatedMessage(message.content);
            if (transactionInfo) {
              return (
                <React.Fragment key={key}>
                  {showDateDivider && <DateDivider />}
                  <TransactionCreatedMessageCard
                    message={message}
                    isOwn={isOwn}
                    onPaymentClick={async (rentalHisId) => {
                      try {
                        // rentalHisId로 거래 상세 조회
                        const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const rentalData = rentalResponse.data;

                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);

                        // requestedDateRange를 먼저 초기화한 후 rentalData 설정
                        setRequestedDateRange(null);
                        setCurrentRentalData(rentalData);

                        // 약간의 지연 후 모달 열기
                        setTimeout(() => {
                          setShowTransactionModal(true);
                        }, 50);
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                        alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                      }
                    }}
                  />
                </React.Fragment>
              );
            }

            // 결제 완료 메시지 감지 (카드로 렌더링)
            const paymentInfo = parsePaymentCompleteMessage(message.content);
            if (paymentInfo) {
              // 판매자 확인
              const sellerId = productData?.sellerId
                || productData?.writer?.memberId
                || productData?.writer?.member_id
                || productData?.seller?.id
                || productData?.seller?.memberId
                || productData?.seller?.member_id;
              const currentUserId = user?.id || user?.memberId;
              const isSeller = sellerId && Number(sellerId) === Number(currentUserId);

              return (
                <React.Fragment key={key}>
                  {showDateDivider && <DateDivider />}
                  <PaymentCompleteMessageCard
                    message={message}
                    isOwn={isOwn}
                    isSeller={isSeller}
                    onShippingClick={async (rentalHisId) => {
                      try {
                        // rentalHisId로 거래 상세 조회
                        const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const rentalData = rentalResponse.data || rentalResponse;

                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);

                        setCurrentRentalData(rentalData);

                        // 약간의 지연 후 발송 모달 열기
                        setTimeout(() => {
                          setShowShippingModal(true);
                        }, 50);
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                        alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                      }
                    }}
                  />
                </React.Fragment>
              );
            }

            // 발송 메시지 감지 (카드로 렌더링)
            const shippingInfo = parseShippingMessage(message.content);
            if (shippingInfo) {
              return (
                <React.Fragment key={key}>
                  {showDateDivider && <DateDivider />}
                  <ShippingMessageCard
                    message={message}
                    isOwn={isOwn}
                    onReceiveClick={async (rentalHisId) => {
                      try {
                        console.log('[ChatRoomPage] 물품 수령 확인하기 클릭:', rentalHisId);
                        
                        // rentalHisId로 거래 상세 조회
                        const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const rentalData = rentalResponse.data || rentalResponse;
                        
                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);
                        
                        setCurrentRentalData(rentalData);
                        
                        // 수령 모달 열기
                        setTimeout(() => {
                          setShowReceiveModal(true);
                        }, 50);
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                        alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                      }
                    }}
                  />
                </React.Fragment>
              );
            }

            // 수령 확인 메시지 감지 (카드로 렌더링)
            const receiveInfo = parseReceiveMessage(message.content);
            if (receiveInfo) {
              // 현재 사용자 ID 확인
              const currentUserIdForCheck = user?.id || user?.memberId || user?.member_id;
              
              // 판매자 확인
              const sellerId = productData?.sellerId
                || productData?.writer?.memberId
                || productData?.writer?.member_id
                || productData?.seller?.id
                || productData?.seller?.memberId
                || productData?.seller?.member_id;
              const isSeller = sellerId && currentUserIdForCheck && Number(sellerId) === Number(currentUserIdForCheck);
              const isBuyer = !isSeller; // 판매자가 아니면 구매자

              return (
                <React.Fragment key={key}>
                  {showDateDivider && <DateDivider />}
                  <ReceiveMessageCard
                    message={message}
                    isOwn={isOwn}
                    isBuyer={isBuyer}
                    onReturnClick={async (rentalHisId) => {
                      try {
                        console.log('[ChatRoomPage] 반납하기 클릭:', rentalHisId);
                        
                        // rentalHisId로 거래 상세 조회
                        const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const rentalData = rentalResponse.data || rentalResponse;
                        
                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);
                        
                        setCurrentRentalData(rentalData);
                        
                        // 반납 모달 열기
                        setTimeout(() => {
                          setShowReturnModal(true);
                        }, 50);
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                        alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                      }
                    }}
                    onCancelClick={async (rentalHisId) => {
                      try {
                        console.log('[ChatRoomPage] 거래 중단하기 클릭:', rentalHisId);
                        
                        // rentalHisId로 거래 상세 조회
                        const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const rentalData = rentalResponse.data || rentalResponse;
                        
                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);
                        
                        setCurrentRentalData(rentalData);
                        
                        // 거래 프로세스 모달 열기 (거래 취소 기능 사용)
                        setTimeout(() => {
                          setShowTransactionModal(true);
                        }, 50);
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                        alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                      }
                    }}
                  />
                </React.Fragment>
              );
            }

            // 반납 완료 메시지 감지 (카드로 렌더링)
            const returnInfo = parseReturnMessage(message.content);
            if (returnInfo) {
              // 판매자 확인
              const sellerId = productData?.sellerId
                || productData?.writer?.memberId
                || productData?.writer?.member_id
                || productData?.seller?.id
                || productData?.seller?.memberId
                || productData?.seller?.member_id;
              const isSeller = sellerId && Number(sellerId) === Number(currentUserId);

              return (
                <React.Fragment key={key}>
                  {showDateDivider && <DateDivider />}
                  <ReturnMessageCard
                    message={message}
                    isOwn={isOwn}
                    onReceiveConfirmClick={!isOwn && isSeller ? async (rentalHisId) => {
                      try {
                        console.log('[ChatRoomPage] 반납 수령 확인하기 클릭:', rentalHisId);
                        
                        // rentalHisId로 거래 상세 조회
                        const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const rentalData = rentalResponse.data || rentalResponse;
                        
                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);
                        
                        setCurrentRentalData(rentalData);
                        
                        // 반납 수령 모달 열기
                        setTimeout(() => {
                          setShowReturnReceiveModal(true);
                        }, 50);
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                        alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                      }
                    } : undefined}
                  />
                </React.Fragment>
              );
            }

            // 거래 완료 메시지 감지 (카드로 렌더링)
            const completeInfo = parseTransactionCompleteMessage(message.content);
            if (completeInfo) {
              // 현재 사용자 ID 확인
              const currentUserIdForCheck = user?.id || user?.memberId || user?.member_id;
              
              // 판매자 확인
              const sellerId = productData?.sellerId
                || productData?.writer?.memberId
                || productData?.writer?.member_id
                || productData?.seller?.id
                || productData?.seller?.memberId
                || productData?.seller?.member_id;
              const isSeller = sellerId && currentUserIdForCheck && Number(sellerId) === Number(currentUserIdForCheck);
              const isBuyer = !isSeller; // 판매자가 아니면 구매자

              return (
                <React.Fragment key={key}>
                  {showDateDivider && <DateDivider />}
                  <TransactionCompleteMessageCard
                    message={message}
                    isOwn={isOwn}
                    isSeller={isSeller}
                    isBuyer={isBuyer}
                  />
                </React.Fragment>
              );
            }

            // MessageBubble 렌더링
            return (
              <React.Fragment key={key}>
                {showDateDivider && <DateDivider />}
                <MessageBubble
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
                  onRentalAccept={message.type === 'rental_request' && isSeller && message.status === 'pending' ? handleRentalAccept : undefined}
                  onRentalReject={message.type === 'rental_request' && isSeller && message.status === 'pending' ? handleRentalReject : undefined}
                  actionButtons={getActionButtons()}
                />
              </React.Fragment>
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
              {currentChatRoom?.otherMember?.nickname || currentChatRoom?.otherMember?.name || '상대방'}님이 입력 중입니다...
            </span>
          </div>
        )}
      </div>

      {/* 메시지 입력 */}
      <MessageInput
        previewMessage={lastOpponentMessage}
        onPreviewClick={() => {
          if (lastOpponentMessage) {
            scrollToBottom('smooth', true); // 사용자 클릭은 강제로 실행
            setIsNearBottom(true);
          }
        }}
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        onTyping={sendTyping}
        disabled={
          isChatRoomDisabled || 
          isConfirmingPayment || 
          currentChatRoom?.status === 'AUTO_CLOSED' ||
          currentChatRoom?.otherMember?.isLeft === true ||
          currentChatRoom?.otherMemberIsLeft === true
        }
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

      {/* 날짜 검색 모달 (캘린더) */}
      {showDatePicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-xl p-6 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setShowDatePicker(false)}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100"
              aria-label="날짜 검색 닫기"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">날짜로 검색</h2>
            </div>

            <DatePicker
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setShowDatePicker(false);
                handleDateSearch(date);
              }}
              onClose={() => setShowDatePicker(false)}
              messagesWithDates={sortedMessages}
            />
          </div>
        </div>
      )}

      {/* 메시지 없음 모달 */}
      <Modal
        isOpen={showNoMessageModal}
        onClose={() => {
          setShowNoMessageModal(false);
          setNoMessageDate(null);
        }}
        title="메시지 없음"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium mb-2">
            {noMessageDate}에는 채팅이 없습니다.
          </p>
          <p className="text-gray-500 text-sm">
            다른 날짜를 선택해주세요.
          </p>
          <button
            onClick={() => {
              setShowNoMessageModal(false);
              setNoMessageDate(null);
            }}
            className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            확인
          </button>
        </div>
      </Modal>

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
        chatRoomId={chatRoomId}
      />


      {/* 발송 모달 */}
      {showShippingModal && currentRentalData && (
        <ShippingModal
          isOpen={showShippingModal}
          onClose={() => setShowShippingModal(false)}
          rentalHisId={currentRentalData.rentalHisId}
          onShippingComplete={async ({ videoUrl, trackingNo, courier }) => {
            console.log('[ChatRoomPage] 발송 완료:', { videoUrl, trackingNo, courier });

            // 채팅방에 발송 완료 메시지 전송
            const messageContent = `📦 물품을 발송했습니다!\n\n택배사: ${courier}\n운송장 번호: ${trackingNo}\n\n${videoUrl ? `[동영상 보기](${videoUrl})` : ''}\nrentalHisId:${currentRentalData.rentalHisId}`;

            await sendMessage({
              type: 'TEXT',
              content: messageContent
            });

            // 모달 닫기
            setShowShippingModal(false);

            // 거래 상태 업데이트
            if (currentRentalData) {
              const updatedData = {
                ...currentRentalData,
                status: 'SHIPPED',
                trackingNo: trackingNo,
                courier: courier
              };
              setCurrentRentalData(updatedData);
              // 운송장 번호 등록 상태 업데이트 (버튼 레이블 변경용)
              setTrackedRentalIds(prev => new Set([...prev, currentRentalData.rentalHisId]));
            }

            alert('물품 발송이 완료되었습니다!');
          }}
        />
      )}

      {/* 수령 확인 모달 */}
      {showReceiveModal && currentRentalData && (
        <ReceiveModal
          isOpen={showReceiveModal}
          onClose={() => setShowReceiveModal(false)}
          rentalHisId={currentRentalData.rentalHisId}
          onReceiveComplete={async ({ videoUrl }) => {
            console.log('[ChatRoomPage] 수령 완료:', { videoUrl });

            // 채팅방에 수령 완료 메시지 전송
            const messageContent = `✅ 물품을 수령했습니다!\n\n${videoUrl ? `[개봉 영상 보기](${videoUrl})` : ''}\n\nrentalHisId:${currentRentalData.rentalHisId}`;

            await sendMessage({
              type: 'TEXT',
              content: messageContent
            });

            // 모달 닫기
            setShowReceiveModal(false);

            // 거래 상태 업데이트
            if (currentRentalData) {
              const updatedData = {
                ...currentRentalData,
                status: 'RENTING'
              };
              setCurrentRentalData(updatedData);
            }

            alert('물품 수령이 완료되었습니다!');
          }}
        />
      )}

      {/* 반납 모달 */}
      {showReturnModal && currentRentalData && (
        <ReturnModal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          rentalHisId={currentRentalData.rentalHisId}
          onReturnComplete={async ({ videoUrl, trackingNo, courier }) => {
            console.log('[ChatRoomPage] 반납 완료:', { videoUrl, trackingNo, courier });

            // 채팅방에 반납 완료 메시지 전송
            const messageContent = `📦 반납을 완료했습니다!\n\n택배사: ${courier}\n운송장 번호: ${trackingNo}\n\n${videoUrl ? `[동영상 보기](${videoUrl})` : ''}\n\nrentalHisId:${currentRentalData.rentalHisId}`;

            await sendMessage({
              type: 'TEXT',
              content: messageContent
            });

            // 모달 닫기
            setShowReturnModal(false);

            // 거래 상태 업데이트
            if (currentRentalData) {
              const updatedData = {
                ...currentRentalData,
                status: 'RETURN_REQUESTED'
              };
              setCurrentRentalData(updatedData);
            }

            alert('반납이 완료되었습니다!');
          }}
        />
      )}

      {/* 반납 수령 확인 모달 */}
      {showReturnReceiveModal && currentRentalData && (
        <ReturnReceiveModal
          isOpen={showReturnReceiveModal}
          onClose={() => setShowReturnReceiveModal(false)}
          rentalHisId={currentRentalData.rentalHisId}
          onConfirmComplete={async ({ videoUrl }) => {
            console.log('[ChatRoomPage] 반납 수령 확인 완료:', { videoUrl });

            // 채팅방에 반납 수령 확인 완료 메시지 전송
            const messageContent = `✅ 반납 수령을 확인했습니다!\n\n${videoUrl ? `[회수 영상 보기](${videoUrl})` : ''}\n\n거래가 완료되었습니다. 정산이 진행됩니다.\n\nrentalHisId:${currentRentalData.rentalHisId}`;

            await sendMessage({
              type: 'TEXT',
              content: messageContent
            });

            // 모달 닫기
            setShowReturnReceiveModal(false);

            // 거래 상태 업데이트
            if (currentRentalData) {
              const updatedData = {
                ...currentRentalData,
                status: 'COMPLETED'
              };
              setCurrentRentalData(updatedData);
            }

            alert('반납 수령 확인이 완료되었습니다! 정산이 진행됩니다.');
          }}
          onCancelRequest={() => {
            // 취소 모달 열기
            setShowReturnReceiveModal(false);
            setShowTransactionModal(true);
          }}
        />
      )}

      {/* 거래 내역 조회 모달 */}
      <Modal
        isOpen={showTransactionCheckModal}
        onClose={() => {
          setShowTransactionCheckModal(false);
          setTransactionCheckData(null);
        }}
        title="거래 내역 조회"
        className="max-w-md"
      >
        <TransactionCheckForm
          rentalData={currentRentalData}
          onCheck={async (accountNo, transactionUniqueNo) => {
            if (!accountNo || !transactionUniqueNo) {
              // 리셋 요청
              setTransactionCheckData(null);
              return;
            }
            
            try {
              setIsCheckingTransaction(true);
              console.log('[ChatRoomPage] 거래 내역 조회 시작:', { accountNo, transactionUniqueNo });
              
              // 외부 API 호출 (SSAFY 금융망)
              const response = await accountApi.getTransactionHistory({
                accountNo,
                transactionUniqueNo
              });
              
              console.log('[ChatRoomPage] 거래 내역 조회 성공:', response);
              setTransactionCheckData(response.data || response);
            } catch (err) {
              console.error('[ChatRoomPage] 거래 내역 조회 실패:', err);
              alert(err.response?.data?.message || '거래 내역을 조회할 수 없습니다. 계좌번호와 거래 고유번호를 확인해주세요.');
            } finally {
              setIsCheckingTransaction(false);
            }
          }}
          transactionData={transactionCheckData}
          isLoading={isCheckingTransaction}
          onReset={() => setTransactionCheckData(null)}
        />
      </Modal>

      {/* 취소 상세 모달 */}
      <CancelDetailModal
        isOpen={showCancelDetailModal}
        onClose={() => {
          setShowCancelDetailModal(false);
          setCancelDetailInfo(null);
        }}
        cancelInfo={cancelDetailInfo}
        onApprove={handleCancelApprove}
        onReject={handleCancelReject}
        isProcessing={isProcessingCancel}
      />
    </div>
    </>
  );
};

export default ChatRoomPage;
