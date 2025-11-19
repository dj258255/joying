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
import TrackingNumberCard, { parseTrackingNumberMessage } from '../components/TrackingNumberCard';
import ReturnReceiveConfirmMessageCard, { parseReturnReceiveConfirmMessage } from '../components/ReturnReceiveConfirmMessageCard';
import ProfileImage from '../../../shared/components/ProfileImage';
import MessageInput from '../components/MessageInput';
import ChatSettingsModal from '../components/ChatSettingsModal';
import RentalRequestCard from '../components/RentalRequestCard';
import RentalRequestModal from '../components/RentalRequestModal';
import TransactionProcessModal from '../components/TransactionProcessModal';
import TransactionActionButton from '../components/TransactionActionButton';
import PaymentModal from '../../../features/payment/components/PaymentModal';
import { useReviewWrite } from '../../../features/review/hooks/useReviewWrite';
import ShippingModal from '../../../features/rental/components/ShippingModal';
import ReceiveModal from '../../../features/rental/components/ReceiveModal';
import ReturnModal from '../../../features/rental/components/ReturnModal';
import ReturnReceiveModal from '../../../features/rental/components/ReturnReceiveModal';
import CancelDetailModal from '../../../features/rental/components/CancelDetailModal';
import VideoListModal from '../../../features/rental/components/VideoListModal';
import ExtendRentalModal from '../../../features/rental/components/ExtendRentalModal';
import TransactionFlowModal from '../../../features/rental/components/TransactionFlowModal';
import Modal from '../../../shared/components/Modal/Modal';
import { rentalApi } from '../../../features/rental/api/rentalApi';
import { paymentApi } from '../../../features/payment/api/paymentApi';
import { accountApi } from '../../../features/user/api/accountApi';
import { messageApi } from '../api/messageApi';
import { useProductDetail } from '../../../features/product/hooks/useProductDetail';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import { chatApi } from '../api/chatApi';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';
import { fileApi } from '../../../shared/api/fileApi';


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
  const { currentChatRoom, messages, sendMessage, sendTyping, sendReadReceipt, enterChatRoom, leaveChatRoom, refreshChatRoomActivity, isConnected, setCurrentChatRoom, isLoading, error, loadOlderMessages, hasMorePast, searchMessages, jumpToMessage, deleteMessage, updateMessage, uploadFile, addMessage, setMessages, typingMemberId, updateOpponentOnlineStatus, isChatRoomDisabled } = useChatContext();
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
  const [showTransactionFlowModal, setShowTransactionFlowModal] = useState(false);
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
  const [showExtendRentalModal, setShowExtendRentalModal] = useState(false);
  const [cancelDetailInfo, setCancelDetailInfo] = useState(null);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [showTransactionCheckModal, setShowTransactionCheckModal] = useState(false);
  const [transactionCheckData, setTransactionCheckData] = useState(null);
  const [isCheckingTransaction, setIsCheckingTransaction] = useState(false);
  // 운송장 번호가 등록된 거래 ID 목록 (버튼 레이블 변경용)
  const [trackedRentalIds, setTrackedRentalIds] = useState(new Set());
  // 드래그 앤 드롭 상태
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  // 거래 영상 조회 모달
  const [showVideoListModal, setShowVideoListModal] = useState(false);
  const [videoListModalRentalHisId, setVideoListModalRentalHisId] = useState(null);
  // 리뷰 작성 모달
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRentalHisId, setReviewRentalHisId] = useState(null);
  const [reviewUploadType, setReviewUploadType] = useState('BORROW'); // 'BORROW' 또는 'RENT'
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [reviewFileIds, setReviewFileIds] = useState([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState([]);
  const [reviewUploading, setReviewUploading] = useState(false);
  const reviewFileInputRef = useRef(null);
  
  // 리뷰 작성 훅
  const { createReview, isCreating: isCreatingReview } = useReviewWrite();

  // VideoListModal 열기 이벤트 리스너 (TransactionProcessModal에서 호출)
  useEffect(() => {
    const handleOpenVideoListModal = (e) => {
      const rentalHisId = e.detail?.rentalHisId;
      if (rentalHisId) {
        setVideoListModalRentalHisId(rentalHisId);
        setShowVideoListModal(true);
      }
    };

    window.addEventListener('openVideoListModal', handleOpenVideoListModal);
    return () => {
      window.removeEventListener('openVideoListModal', handleOpenVideoListModal);
    };
  }, []);

  // productId는 여러 경로에서 가져오기: URL 쿼리 파라미터 > location.state > 채팅방 정보 > 메시지에서
  const productIdFromUrl = searchParams.get('productId') || location.state?.productId || currentChatRoom?.productId || null;
  const productIdFromMessage = rentalRequestMessage?.productId;
  const productId = productIdFromUrl || productIdFromMessage || null;
  
  // 상품 정보 조회 (판매자 확인용)
  const { product: productData } = useProductDetail(productId);

  // rentalRefuses를 disabledDates 형식으로 변환 (문자열 배열로 변환)
  const unavailableDates = useMemo(() => {
    if (!productData?.rentalRefuses || !Array.isArray(productData.rentalRefuses)) {
      return [];
    }

    return productData.rentalRefuses.flatMap(refuse => {
      // ISO 문자열을 YYYY-MM-DD 형식으로 직접 추출 (타임존 문제 방지)
      const startDateStr = refuse.startRef.split('T')[0];
      const endDateStr = refuse.endRef.split('T')[0];

      const start = new Date(startDateStr + 'T00:00:00');
      const end = new Date(endDateStr + 'T00:00:00');
      const dates = [];
      const currentDate = new Date(start);

      while (currentDate <= end) {
        // YYYY-MM-DD 형식의 문자열로 저장 (DateRangeCalendar가 문자열 배열을 기대함)
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dates;
    });
  }, [productData?.rentalRefuses]);

  // 생성된 채팅방 데이터 (location.state에서 가져옴)
  const existingChatRoomData = location.state?.chatRoomData || null;
  
  // 대여 요청 자동 전송을 위한 정보 (location.state에서 가져옴)
  const shouldSendRentalRequest = location.state?.shouldSendRentalRequest || false;
  const rentalRequestData = location.state?.rentalRequestData || null;
  const hasSentRentalRequestRef = useRef(false); // 대여 요청 메시지 전송 여부 추적
  const hassentPaymentCompleteRef = useRef(false); // 결제 완료 메시지 전송 여부 추적
  const hasSentBorrowRequestRef = useRef(false); // BORROW 제안 메시지 전송 여부 추적

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

  // BORROW 상품에서 채팅방 진입 시 대여 요청 메시지 자동 전송
  useEffect(() => {
    const isBorrowRequest = location.state?.isBorrowRequest;
    const borrowInfo = location.state?.borrowInfo;

    // isBorrowRequest가 false이거나 없으면 아무 작업도 하지 않음
    if (!isBorrowRequest || !borrowInfo) {
      return;
    }

    // 필요한 모든 데이터가 준비되었는지 확인
    if (!isConnected || !currentChatRoom || !productData || !user) {
      return;
    }

    // 이미 전송했으면 중복 전송 방지
    if (hasSentBorrowRequestRef.current) {
      // location.state만 초기화
      navigate(location.pathname, {
        replace: true,
        state: {
          ...location.state,
          isBorrowRequest: false,
          borrowInfo: null
        }
      });
      return;
    }

    // BORROW 상품의 경우: 빌려줄 사람(채팅으로 제안하기 클릭한 사람)이 메시지를 전송
    const sellerId = productData?.sellerId
      || productData?.writer?.memberId
      || productData?.writer?.member_id
      || productData?.seller?.id
      || productData?.seller?.memberId
      || productData?.seller?.member_id;
    const currentUserId = user?.id || user?.memberId;
    const isProductOwner = sellerId && Number(sellerId) === Number(currentUserId);

    if (isProductOwner) {
      // 상품 주인(빌리려는 사람)은 메시지를 전송하지 않음 (수동적)
      console.log('[ChatRoomPage] BORROW 상품 - 빌리려는 사람(상품 주인)은 메시지를 전송하지 않음');

      // location.state 초기화만 수행
      navigate(location.pathname, {
        replace: true,
        state: {
          ...location.state,
          isBorrowRequest: false,
          borrowInfo: null
        }
      });
      return;
    }

    console.log('[ChatRoomPage] BORROW 상품 감지 - 간단한 제안 메시지 전송 (빌려줄 사람):', borrowInfo);

    // 간단한 제안 메시지 전송 (날짜 선택 없이)
    const sendBorrowRequest = async () => {
      // 중복 전송 방지를 위한 이중 체크
      if (hasSentBorrowRequestRef.current) {
        console.log('[ChatRoomPage] BORROW 제안 메시지 이미 전송됨, 중복 전송 방지');
        return;
      }

      try {
        // 전송 플래그 먼저 설정 (비동기 작업 전에 설정하여 중복 호출 방지)
        hasSentBorrowRequestRef.current = true;

        const productTitle = productData?.title || productData?.name || '상품';
        // MESSAGE_TYPE 마커 추가하여 MessageBubble에서 식별 가능하도록
        const messageContent = `💡 ${productTitle}을(를) 빌려드릴 수 있습니다!\n\n거래를 원하시면 아래 버튼을 눌러주세요.\nMESSAGE_TYPE:BORROW_PROPOSAL`;

        console.log('[ChatRoomPage] BORROW 제안 메시지 전송:', {
          type: 'TEXT',
          content: messageContent
        });

        // 간단한 텍스트 메시지만 전송
        await sendMessage({
          type: 'TEXT',
          content: messageContent
        });

        console.log('[ChatRoomPage] BORROW 제안 메시지 전송 완료');

        // location.state 초기화 (중복 전송 방지)
        navigate(location.pathname, {
          replace: true,
          state: {
            ...location.state,
            isBorrowRequest: false,
            borrowInfo: null
          }
        });
      } catch (error) {
        console.error('[ChatRoomPage] BORROW 제안 메시지 전송 실패:', error);
        hasSentBorrowRequestRef.current = false; // 실패 시 다시 시도할 수 있도록
      }
    };

    // WebSocket 연결 후 약간의 지연을 두어 전송
    const timeoutId = setTimeout(() => {
      sendBorrowRequest();
    }, 1000);

    // cleanup 함수로 타이머 정리
    return () => clearTimeout(timeoutId);
  }, [location.state, isConnected, currentChatRoom, productData, user, sendMessage, navigate, location.pathname]);

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

      // 메시지 점프 중이면 자동 스크롤하지 않음 (force가 아닌 경우에만)
      if (isJumpingToMessage || pendingScrollMessageId || isScrollingToMessage) {
        console.log('[scrollToBottom] 메시지 점프 중 자동 스크롤 방지');
        return;
      }
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
    // 채팅방이 실제로 표시되고 있는지 확인 (messagesContainerRef가 존재하고 화면에 보이는 경우)
    const isChatRoomVisible = messagesContainerRef.current && 
      messagesContainerRef.current.offsetParent !== null;

    // 메시지 점프 후 일정 시간 동안은 자동 스크롤 완전히 비활성화
    const timeSinceLastJump = Date.now() - lastJumpTimeRef.current;
    if (timeSinceLastJump < 5000) { // 5초 동안 자동 스크롤 방지
      // 읽음 처리: 채팅방이 실제로 표시되고 있을 때만
      if (isChatRoomVisible && (currentChatRoom?.chatRoomId || currentChatRoom?.id)) {
        sendReadReceipt();
      }
      return;
    }

    // 메시지 점프 중이거나 대기 중이면 자동 스크롤하지 않음
    if (isJumpingToMessage || pendingScrollMessageId || isScrollingToMessage) {
      // 읽음 처리: 채팅방이 실제로 표시되고 있을 때만
      if (isChatRoomVisible && (currentChatRoom?.chatRoomId || currentChatRoom?.id)) {
        sendReadReceipt();
      }
      return;
    }

    // 채팅방 입장 시 강제로 최하단 스크롤 (이미지/영상 로드 대기)
    setTimeout(() => {
      scrollToBottom('auto', true);
    }, 300);

    // 채팅방 진입 시 읽음 처리: 채팅방이 실제로 표시되고 있을 때만
    if (isChatRoomVisible && (currentChatRoom?.chatRoomId || currentChatRoom?.id)) {
      sendReadReceipt();
    }
  }, [currentChatRoom?.chatRoomId, scrollToBottom, sendReadReceipt, isJumpingToMessage, pendingScrollMessageId, isScrollingToMessage]);

  // 채팅방 입장/퇴장 알림
  useEffect(() => {
    const roomId = currentChatRoom?.chatRoomId || currentChatRoom?.id;
    if (!roomId) return;

    // 채팅방 입장 알림
    enterChatRoom(roomId);

    // 컴포넌트 언마운트 시 채팅방 퇴장 알림
    return () => {
      leaveChatRoom();
    };
  }, [currentChatRoom?.chatRoomId, currentChatRoom?.id, enterChatRoom, leaveChatRoom]);

  // 채팅방 활성 상태 주기적 갱신 (30초마다)
  useEffect(() => {
    const roomId = currentChatRoom?.chatRoomId || currentChatRoom?.id;
    if (!roomId) return;

    // 주기적으로 채팅방 활성 상태 갱신 (30초마다)
    const refreshInterval = setInterval(() => {
      refreshChatRoomActivity(roomId);
    }, 30000); // 30초

    return () => {
      clearInterval(refreshInterval);
    };
  }, [currentChatRoom?.chatRoomId, currentChatRoom?.id, refreshChatRoomActivity]);

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

  // 드래그 앤 드롭 핸들러 (카운터 방식으로 자식 요소 문제 해결)
  const handleDragEnter = (e) => {
    // 결제 모달이 열려있으면 드래그앤드롭 비활성화
    if (showPaymentModal) return;

    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    // 결제 모달이 열려있으면 드래그앤드롭 비활성화
    if (showPaymentModal) return;

    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    // 결제 모달이 열려있으면 드래그앤드롭 비활성화
    if (showPaymentModal) return;

    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    // 결제 모달이 열려있으면 드래그앤드롭 비활성화
    if (showPaymentModal) {
      dragCounterRef.current = 0;
      setIsDragging(false);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
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
        content: `MESSAGE_TYPE:CANCEL_APPROVED\n✅ 거래 취소가 승인되었습니다.\n\n보증금이 합의된 대로 분배됩니다.\nrentalHisId:${cancelDetailInfo.rentalHisId}`
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
      await rentalApi.rejectCancel(cancelDetailInfo.cancelId, {
        rejectReason: '거래를 계속 진행하기로 결정했습니다.'
      });

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
      <div
        className="flex flex-col h-screen bg-gray-50 relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
      {/* 드래그 앤 드롭 오버레이 - 전체 화면 */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center z-[9999] pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center border-4 border-dashed border-blue-400 pointer-events-none">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-3">이미지나 영상을 드래그하시면 파일이 전송됩니다</p>
            <p className="text-base text-gray-600 mb-2">
              파일을 놓아주세요
            </p>
            <p className="text-sm text-gray-500">
              이미지: 최대 10MB, 영상: 최대 50MB
            </p>
          </div>
        </div>
      )}
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
              onTransactionView={() => setShowTransactionFlowModal(true)}
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
            {/* 거래 영상 보기 버튼 */}
            {currentRentalData?.rentalHisId && (
              <button
                onClick={() => setShowVideoListModal(true)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="거래 영상 보기"
                title="거래 영상 보기"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
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
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide flex flex-col relative bg-white"
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

              // BORROW 상품 '채팅으로 제안하기' 메시지 - 거래 생성하기 버튼 표시
              if (content.includes('💡') && content.includes('빌려드릴 수 있습니다') && content.includes('거래를 원하시면')) {
                // BORROW 상품 주인(빌리고 싶은 사람) 확인
                const sellerId = productData?.sellerId
                  || productData?.writer?.memberId
                  || productData?.writer?.member_id
                  || productData?.seller?.id
                  || productData?.seller?.memberId
                  || productData?.seller?.member_id;
                const isProductOwner = sellerId && Number(sellerId) === Number(currentUserId);

                // 메시지를 보낸 사람 확인
                const messageSenderId = message.sender?.id || message.senderId;
                const isMessageSender = messageSenderId && Number(messageSenderId) === Number(currentUserId);

                const buttons = [];

                // 메시지를 보낸 사람(제안한 사람)에게는 '거래 생성하기' 버튼
                if (isMessageSender && !isProductOwner) {
                  buttons.push({
                    text: '✅ 거래 생성하기',
                    style: 'primary',
                    onClick: async () => {
                      // 상품 ID 추출
                      const productIdToUse = productId || productData?.productId || productData?.product_id;
                      if (!productIdToUse) {
                        alert('상품 정보를 찾을 수 없습니다.');
                        return;
                      }

                      // BORROW 상품의 희망 날짜 추출
                      const startDate = productData?.startRent ? new Date(productData.startRent) : null;
                      const endDate = productData?.endRent ? new Date(productData.endRent) : null;

                      if (!startDate || !endDate) {
                        alert('희망 대여 기간이 설정되어 있지 않습니다.\n날짜를 직접 선택해주세요.');
                      }

                      // 거래 방법 (기본값: BOTH)
                      const rentMethod = productData?.rentMethod || 'BOTH';

                      // 기간 계산
                      const days = startDate && endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1 : 0;

                      console.log('[ChatRoomPage] BORROW 거래 생성하기 버튼 클릭:', {
                        productId: productIdToUse,
                        startDate,
                        endDate,
                        rentMethod,
                        days
                      });

                      // 상품 정보에서 기본 금액 가져오기
                      const defaultRentalFee = productData?.price || productData?.rentalFee || productData?.dailyPrice || 0;
                      const defaultDeposit = productData?.deposit || 0;

                      setRequestedDateRange({
                        start: startDate,
                        end: endDate,
                        rentMethod,
                        rentalFee: defaultRentalFee,
                        deposit: defaultDeposit
                      });

                      setCurrentRentalData(null);
                      setTimeout(() => {
                        setShowTransactionModal(true);
                      }, 50);
                    }
                  });
                }

                // BORROW 상품 주인(빌리고 싶은 사람)에게는 '대여 다시 요청하기' 버튼
                if (isProductOwner && !isMessageSender) {
                  buttons.push({
                    text: '🔄 대여 다시 요청하기',
                    style: 'secondary',
                    onClick: () => {
                      setShowRentalRequestModal(true);
                    }
                  });
                }

                return buttons.length > 0 ? buttons : null;
              }

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
                      // 상품 정보에서 기본 금액 가져오기
                      const defaultRentalFee = productData?.price || productData?.rentalFee || productData?.dailyPrice || 0;
                      const defaultDeposit = productData?.deposit || 0;
                      
                      setRequestedDateRange({
                        start: startDate,
                        end: endDate,
                        rentMethod,
                        rentalFee: defaultRentalFee,
                        deposit: defaultDeposit
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
                // 결제 완료 여부 확인
                const rentalHisIdMatch = content.match(/rentalHisId:(\d+)/);
                const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;
                const isPaymentCompleted = currentRentalData?.status === 'ESCROW' || 
                                           currentRentalData?.status === 'PAYMENT_COMPLETED' ||
                                           currentRentalData?.status === 'SHIPPED' ||
                                           currentRentalData?.status === 'RENTING' ||
                                           currentRentalData?.rentalStatus === 'ESCROW';
                
                return [{
                  text: isPaymentCompleted ? '✅ 결제 완료' : '💳 결제하러 가기',
                  style: 'primary',
                  disabled: isPaymentCompleted,
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

                // 취소 승인 메시지가 이미 있는지 확인 (이 rentalHisId에 대해)
                const isCancelApproved = messages.some(msg => {
                  const msgContent = typeof msg.content === 'string' ? msg.content : (msg.content?.text || JSON.stringify(msg.content));
                  const msgRentalIdMatch = msgContent?.match(/rentalHisId:(\d+)/);
                  const msgRentalId = msgRentalIdMatch ? Number(msgRentalIdMatch[1]) : null;
                  return msgContent?.includes('MESSAGE_TYPE:CANCEL_APPROVED') && msgRentalId === rentalHisId;
                });

                console.log('[ChatRoomPage] 취소 승인 확인:', { rentalHisId, isCancelApproved });

                // 취소가 승인되었으면 버튼 숨김
                if (isCancelApproved) {
                  return null;
                }

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
                  // 수령 완료 여부 확인
                  const isReceiveCompleted = currentRentalData?.status === 'RENTING' ||
                                             currentRentalData?.status === 'RETURN_REQUESTED' ||
                                             currentRentalData?.status === 'RETURNED' ||
                                             currentRentalData?.status === 'COMPLETED' ||
                                             currentRentalData?.rentalStatus === 'RENTING';
                  
                  buttons.push({
                    text: isReceiveCompleted ? '✅ 수령 완료' : '✅ 물품 수령 확인하기',
                    style: 'primary',
                    disabled: isReceiveCompleted,
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
                  // 반납 완료 여부 확인
                  const isReturnCompleted = !!(currentRentalData?.returnTrackingNo || currentRentalData?.returnTrackingNumber) ||
                                            currentRentalData?.status === 'RETURNED' ||
                                            currentRentalData?.status === 'COMPLETED' ||
                                            currentRentalData?.rentalStatus === 'RETURNED';
                  
                  buttons.push(
                    {
                      text: isReturnCompleted ? '✅ 반납 완료' : '📦 반납하기',
                      style: 'primary',
                      disabled: isReturnCompleted,
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
                  // 반납 수령 완료 여부 확인
                  const isReturnReceiveCompleted = currentRentalData?.status === 'COMPLETED' ||
                                                    currentRentalData?.status === 'DEPOSIT_RETURNED' ||
                                                    currentRentalData?.rentalStatus === 'COMPLETED';
                  
                  buttons.push({
                    text: isReturnReceiveCompleted ? '✅ 반납 수령 완료' : '✅ 반납 수령 확인하기',
                    style: 'primary',
                    disabled: isReturnReceiveCompleted,
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

              // 반납 수령 확인 선택 메시지는 카드로 렌더링 (getActionButtons에서는 제외)
              const isReturnReceiveConfirm = message.type === 'return_receive_confirm' || (message.type === 'text' && content?.includes('MESSAGE_TYPE:RETURN_RECEIVE_CONFIRM'));
              if (isReturnReceiveConfirm) {
                console.log('[ChatRoomPage] 반납 수령 확인 선택 메시지 감지:', {
                  messageType: message.type,
                  content: content.substring(0, 100),
                  currentUserId,
                  senderId: message.sender?.id
                });

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

                // 메시지 발신자가 판매자이고, 현재 사용자도 판매자인 경우 버튼 표시
                const senderId = message.sender?.id;
                const isOwn = Number(currentUserId) === Number(senderId);

                console.log('[ChatRoomPage] 버튼 표시 조건 체크:', {
                  isOwn,
                  isSeller,
                  rentalHisId,
                  shouldShowButton: isOwn && isSeller && rentalHisId
                });

                if (isOwn && isSeller && rentalHisId) {
                  buttons.push(
                    {
                      label: '✅ 최종 수령 확인',
                      className: 'bg-green-600 text-white hover:bg-green-700',
                      onClick: async () => {
                        try {
                          console.log('[ChatRoomPage] 최종 수령 확인 클릭:', { rentalHisId });

                          if (!window.confirm('반납품을 최종 확인하고 거래를 완료하시겠습니까?')) {
                            return;
                          }

                          // 반납 수령 확인 API 호출
                          await rentalApi.confirmReturnReceive(rentalHisId);

                          // 채팅방에 완료 메시지 전송
                          await sendMessage({
                            type: 'TEXT',
                            content: `반납 수령을 최종 확인했습니다!\n\n거래가 완료되었습니다. 정산이 진행됩니다.\n\nMESSAGE_TYPE:RETURN_RECEIVED`
                          });

                          alert('반납 수령이 확인되었습니다! 정산이 진행됩니다.');
                        } catch (err) {
                          console.error('[ChatRoomPage] 최종 수령 확인 실패:', err);
                          alert(err.response?.data?.message || err.message || '수령 확인에 실패했습니다.');
                        }
                      }
                    },
                    {
                      label: '🚫 거래 중단',
                      className: 'bg-red-600 text-white hover:bg-red-700',
                      onClick: async () => {
                        try {
                          console.log('[ChatRoomPage] 거래 중단 클릭:', { rentalHisId });

                          // rentalHisId로 거래 상세 조회
                          const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                          const rentalData = rentalResponse.data;

                          setCurrentRentalData(rentalData);

                          // 취소 모달 열기
                          setShowTransactionModal(true);
                        } catch (err) {
                          console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                          alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                        }
                      }
                    }
                  );
                }

                console.log('[ChatRoomPage] 반환할 버튼:', buttons);
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
                    productId={productId || productData?.productId || productData?.product_id}
                    onRentalRequestAgain={() => {
                      setShowRentalRequestModal(true);
                    }}
                    onCreateTransaction={async ({ startDate, endDate, rentMethod, rentalFee, deposit }) => {
                      // 상품 ID 추출
                      const productIdToUse = productId || productData?.productId || productData?.product_id;
                      if (!productIdToUse) {
                        alert('상품 정보를 찾을 수 없습니다.');
                        return;
                      }

                      // 대여 요청을 한 사람(requesterId) 추출
                      let requesterId = null;
                      try {
                        const rentalInfo = message.rentalInfo || (message.content ? JSON.parse(message.content) : null);
                        requesterId = rentalInfo?.requesterId || message.senderId || message.memberId;
                      } catch (e) {
                        console.warn('[ChatRoomPage] requesterId 추출 실패, senderId 사용:', message.senderId);
                        requesterId = message.senderId || message.memberId;
                      }

                      // otherMemberId 정의
                      const otherMemberId = currentChatRoom?.otherMember?.id || currentChatRoom?.otherMember?.memberId;

                      console.log('[ChatRoomPage] 거래 생성 권한 검증:', {
                        requesterId,
                        otherMemberId,
                        currentUserId,
                        messageSenderId: message.senderId,
                        isSeller
                      });

                      // 판매자만 거래를 생성할 수 있도록 검증
                      if (!isSeller) {
                        alert('판매자만 거래를 생성할 수 있습니다.');
                        console.error('[ChatRoomPage] 권한 검증 실패: 판매자가 아님', {
                          currentUserId,
                          sellerId,
                          isSeller
                        });
                        return;
                      }

                      // 기간 계산
                      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

                      console.log('[ChatRoomPage] 거래 생성하기 버튼 클릭:', {
                        productId: productIdToUse,
                        startDate,
                        endDate,
                        rentMethod,
                        days,
                        requesterId
                      });

                      // rentalData를 null로 설정하고, requestedDateRange만 전달
                      // 이렇게 하면 TransactionProcessModal이 새 거래 생성 모드로 작동함
                      // 상품 정보에서 기본 금액 가져오기 (rentalFee, deposit가 전달된 경우 우선 사용)
                      const defaultRentalFee = rentalFee !== undefined ? rentalFee : (productData?.price || productData?.rentalFee || productData?.dailyPrice || 0);
                      const defaultDeposit = deposit !== undefined ? deposit : (productData?.deposit || 0);

                      setRequestedDateRange({
                        start: startDate,
                        end: endDate,
                        rentMethod,
                        rentalFee: defaultRentalFee,
                        deposit: defaultDeposit,
                        requesterId  // 대여 요청자 ID 추가
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
                        const rentalData = rentalResponse.data || rentalResponse;

                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);

                        // 거래 상태 확인 - PENDING 상태가 아니면 TransactionProcessModal 열기
                        const status = rentalData.status || rentalData.rentalStatus;
                        if (status !== 'PENDING') {
                          // PENDING이 아니면 기존 플로우대로 TransactionProcessModal 열기
                          setRequestedDateRange(null);
                          setCurrentRentalData(rentalData);
                          setTimeout(() => {
                            setShowTransactionModal(true);
                          }, 50);
                          return;
                        }

                        // PENDING 상태면 바로 결제 진행
                        const product = productData || {};
                        const days = Math.ceil(
                          (new Date(rentalData.endRen) - new Date(rentalData.startRen)) / (1000 * 60 * 60 * 24)
                        ) + 1;
                        const totalAmount = (rentalData.fee * days) + Number(rentalData.deposit);

                        // 결제 정보 생성
                        const paymentData = {
                          rentalHisId: rentalHisId,
                          productId: product.id || product.productId,
                          totalAmount: totalAmount,
                          orderName: `${product.title || product.name || '상품'} 대여(보증금 포함)`
                        };

                        const paymentResult = await paymentApi.createPayment(paymentData);
                        console.log('[ChatRoomPage] 결제 생성 완료:', paymentResult);

                        // PaymentModal 열기
                        setPaymentMessage({
                          paymentId: paymentResult.data?.paymentId,
                          orderId: paymentResult.data?.orderId,
                          totalAmount: totalAmount,
                          rentalInfo: {
                            rentalHisId: rentalHisId,
                            productTitle: product.title || product.name
                          }
                        });
                        setShowPaymentModal(true);
                      } catch (err) {
                        console.error('[ChatRoomPage] 결제 처리 실패:', err);
                        alert(err.response?.data?.message || err.message || '결제 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
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

            // 송장 번호 등록 메시지 감지 (카드로 렌더링)
            const trackingInfo = parseTrackingNumberMessage(message.content);
            if (trackingInfo) {
              // 판매자 확인
              const sellerId = productData?.sellerId
                || productData?.writer?.memberId
                || productData?.writer?.member_id
                || productData?.seller?.id
                || productData?.seller?.memberId
                || productData?.seller?.member_id;
              const currentUserId = user?.id || user?.memberId;
              const isSeller = sellerId && currentUserId && Number(sellerId) === Number(currentUserId);
              const isBuyer = !isSeller && currentUserId;
              
              // 발송(isReturn=false)이면 소유자만, 반납(isReturn=true)이면 대여자만 보이도록
              const shouldShowCard = trackingInfo.isReturn ? isBuyer : isSeller;
              
              // 등록해야 하는 사람만 카드 표시
              if (!shouldShowCard) {
                // 기본 MessageBubble로 렌더링
                return null;
              }
              
              return (
                <React.Fragment key={key}>
                  {showDateDivider && <DateDivider />}
                  <TrackingNumberCard
                    message={message}
                    isOwn={isOwn}
                    rentalData={currentRentalData}
                    sendMessage={sendMessage}
                    onShippingComplete={async ({ rentalHisId, trackingNo, courier }) => {
                      console.log('[ChatRoomPage] 발송 완료:', { rentalHisId, trackingNo, courier });
                      
                      // 거래 상태 업데이트 - 운송장 번호 필드도 업데이트
                      try {
                        const updatedRentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const updatedRentalData = updatedRentalResponse.data || updatedRentalResponse;
                        setCurrentRentalData(updatedRentalData);
                        // 운송장 번호 등록 상태 업데이트 (버튼 레이블 변경용)
                        setTrackedRentalIds(prev => new Set([...prev, rentalHisId]));
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 데이터 갱신 실패:', err);
                        // 실패해도 로컬 상태 업데이트
                        if (currentRentalData) {
                          const updatedData = {
                            ...currentRentalData,
                            status: 'SHIPPED',
                            outboundTrackingNo: trackingNo,
                            outboundTrackingNumber: trackingNo,
                            trackingNo: trackingNo,
                            courier: courier
                          };
                          setCurrentRentalData(updatedData);
                          setTrackedRentalIds(prev => new Set([...prev, rentalHisId]));
                        }
                      }
                    }}
                  />
                </React.Fragment>
              );
            }

            // 발송 메시지 또는 발송 전 영상 메시지 감지 (카드로 렌더링)
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
                    rentalData={currentRentalData}
                    onExtendClick={async (rentalHisId) => {
                      try {
                        console.log('[ChatRoomPage] 거래 연장하기 클릭:', rentalHisId);
                        
                        // rentalHisId로 거래 상세 조회
                        const rentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const rentalData = rentalResponse.data || rentalResponse;
                        
                        console.log('[ChatRoomPage] 거래 데이터 로드 성공:', rentalData);
                        
                        setCurrentRentalData(rentalData);
                        
                        // 거래 연장 모달 열기
                        setTimeout(() => {
                          setShowExtendRentalModal(true);
                        }, 50);
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 정보 조회 실패:', err);
                        alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                      }
                    }}
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

            // 반납 수령 확인 선택 메시지 감지 (카드로 렌더링)
            const returnReceiveConfirmInfo = parseReturnReceiveConfirmMessage(message.content);
            if (returnReceiveConfirmInfo) {
              // 판매자 확인
              const sellerId = productData?.sellerId
                || productData?.writer?.memberId
                || productData?.writer?.member_id
                || productData?.seller?.id
                || productData?.seller?.memberId
                || productData?.seller?.member_id;
              const currentUserIdForCheck = user?.id || user?.memberId || user?.member_id;
              const isSeller = sellerId && currentUserIdForCheck && Number(sellerId) === Number(currentUserIdForCheck);

              return (
                <React.Fragment key={key}>
                  {showDateDivider && <DateDivider />}
                  <ReturnReceiveConfirmMessageCard
                    message={message}
                    isOwn={isOwn}
                    isSeller={isSeller}
                    onConfirmComplete={async (rentalHisId) => {
                      try {
                        // 거래 데이터 갱신
                        const updatedRentalResponse = await rentalApi.getRentalDetail(rentalHisId);
                        const updatedRentalData = updatedRentalResponse.data || updatedRentalResponse;
                        setCurrentRentalData(updatedRentalData);
                      } catch (err) {
                        console.error('[ChatRoomPage] 거래 데이터 갱신 실패:', err);
                      }
                    }}
                    onCancelRequest={(rentalData) => {
                      setCurrentRentalData(rentalData);
                      setTimeout(() => {
                        setShowTransactionModal(true);
                      }, 50);
                    }}
                    sendMessage={sendMessage}
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
                    onReviewClick={(rentalHisId, uploadType) => {
                      setReviewRentalHisId(rentalHisId);
                      setReviewUploadType(uploadType);
                      setReviewRating(0);
                      setReviewTitle('');
                      setReviewContent('');
                      setShowReviewModal(true);
                    }}
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
          const isProductOwner = sellerId && Number(sellerId) === Number(currentUserId);

          // BORROW 상품인 경우 역할 반대로 설정
          const isBorrowProduct = productData?.uploadType === 'BORROW';

          if (isBorrowProduct) {
            // BORROW: 상품 주인(빌리고 싶은 사람) = buyer, 상대방(빌려줄 사람) = seller
            return isProductOwner ? 'buyer' : 'seller';
          } else {
            // RENT: 상품 주인(빌려줄 사람) = seller, 상대방(빌리고 싶은 사람) = buyer
            return isProductOwner ? 'seller' : 'buyer';
          }
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
          sendMessage={sendMessage}
          onVideoUploaded={({ videoUrl, rentalHisId }) => {
            console.log('[ChatRoomPage] 영상 업로드 완료:', { videoUrl, rentalHisId });
            // 영상 업로드 완료 후 추가 작업이 필요하면 여기에 작성
            // 채팅 메시지는 ShippingModal 내부에서 전송됨
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
          onVideoUploaded={async ({ videoUrl, rentalHisId }) => {
            console.log('[ChatRoomPage] 반납 영상 업로드 완료:', { videoUrl, rentalHisId });
            
            // 거래 상태 업데이트
            if (currentRentalData) {
              const updatedData = {
                ...currentRentalData,
                status: 'RETURN_REQUESTED'
              };
              setCurrentRentalData(updatedData);
            }
          }}
          sendMessage={sendMessage}
        />
      )}

      {/* 거래 연장 모달 */}
      {showExtendRentalModal && currentRentalData && (
        <ExtendRentalModal
          isOpen={showExtendRentalModal}
          onClose={() => setShowExtendRentalModal(false)}
          rentalData={currentRentalData}
          onExtendSuccess={async (result) => {
            console.log('[ChatRoomPage] 거래 연장 성공:', result);

            // 채팅방에 연장 완료 메시지 전송
            const messageContent = `⏰ 대여 기간이 연장되었습니다!\n\n기존 종료일: ${new Date(result.originalEndRen).toLocaleDateString('ko-KR')}\n새 종료일: ${new Date(result.newEndRen).toLocaleDateString('ko-KR')}\n추가 대여료: ${result.additionalFee.toLocaleString()}원\n\n${result.message || '추가 대여료를 결제해주세요.'}\n\nrentalHisId:${result.rentalHisId}`;

            await sendMessage({
              type: 'TEXT',
              content: messageContent
            });

            // 거래 데이터 갱신
            try {
              const updatedRentalData = await rentalApi.getRentalDetail(result.rentalHisId);
              setCurrentRentalData(updatedRentalData.data || updatedRentalData);
            } catch (err) {
              console.error('[ChatRoomPage] 거래 데이터 갱신 실패:', err);
            }

            alert('대여 기간이 연장되었습니다. 추가 대여료를 결제해주세요.');
          }}
        />
      )}

      {/* 반납 수령 확인 모달 */}
      {showReturnReceiveModal && currentRentalData && (
        <ReturnReceiveModal
          isOpen={showReturnReceiveModal}
          onClose={() => setShowReturnReceiveModal(false)}
          rentalHisId={currentRentalData.rentalHisId}
          sendMessage={sendMessage}
          onConfirmComplete={async ({ videoUrl }) => {
            console.log('[ChatRoomPage] 반납 수령 확인 완료:', { videoUrl });

            // 채팅방에 반납 수령 확인 완료 메시지 전송
            const messageContent = `반납 수령을 확인했습니다!\n\n${videoUrl ? `[회수 영상 보기](${videoUrl})` : ''}\n\n거래가 완료되었습니다. 정산이 진행됩니다.\n\nMESSAGE_TYPE:RETURN_RECEIVED`;

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

      {/* 거래 영상 조회 모달 */}
      <VideoListModal
        isOpen={showVideoListModal}
        onClose={() => {
          setShowVideoListModal(false);
          setVideoListModalRentalHisId(null);
        }}
        rentalHisId={videoListModalRentalHisId || currentRentalData?.rentalHisId}
      />

      {/* 거래 플로우 모달 */}
      <TransactionFlowModal
        isOpen={showTransactionFlowModal}
        onClose={() => setShowTransactionFlowModal(false)}
        rentalHisId={currentRentalData?.rentalHisId}
        rentalData={currentRentalData}
        productData={productData}
      />

      {/* 리뷰 작성 모달 */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">리뷰 작성</h3>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewRentalHisId(null);
                  setReviewRating(0);
                  setReviewTitle('');
                  setReviewContent('');
                  setReviewFileIds([]);
                  setReviewImagePreviews([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">평점</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        if (reviewRating === star) {
                          setReviewRating(star - 0.5);
                        } else {
                          setReviewRating(star);
                        }
                      }}
                      className="relative"
                    >
                      <svg
                        className={`w-8 h-8 transition-colors ${
                          star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {/* 반별 표시를 위한 오버레이 */}
                      {reviewRating === star - 0.5 && (
                        <div className="absolute inset-0 overflow-hidden">
                          <svg
                            className="w-8 h-8 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  현재 평점: {reviewRating}점
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">리뷰 제목 (선택)</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length > 255) {
                      setReviewTitle(value.slice(0, 255));
                    } else {
                      setReviewTitle(value);
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 mb-4"
                  placeholder="리뷰 제목을 입력해주세요..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">리뷰 내용</label>
                <textarea
                  value={reviewContent}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length > 1000) {
                      setReviewContent(value.slice(0, 1000));
                    } else {
                      setReviewContent(value);
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900"
                  rows={4}
                  placeholder="리뷰를 작성해주세요..."
                />
              </div>

              {/* 이미지 업로드 섹션 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이미지 업로드 (선택)</label>
                <div
                  onClick={() => reviewFileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition bg-gray-50"
                >
                  <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    클릭하여 이미지 추가
                  </p>
                  <input
                    ref={reviewFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      
                      const currentCount = reviewImagePreviews.length;
                      if (currentCount + files.length > 3) {
                        alert("이미지는 최대 3장까지 업로드할 수 있습니다.");
                        e.target.value = "";
                        return;
                      }

                      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
                      const invalidType = files.some(f => !allowedTypes.includes(f.type));
                      if (invalidType) {
                        alert("JPEG, PNG, WEBP 형식의 이미지 파일만 업로드할 수 있습니다.");
                        e.target.value = "";
                        return;
                      }

                      const maxSize = 5 * 1024 * 1024;
                      const tooLarge = files.some(f => f.size > maxSize);
                      if (tooLarge) {
                        alert("각 이미지는 최대 5MB까지 업로드 가능합니다.");
                        e.target.value = "";
                        return;
                      }

                      setReviewUploading(true);
                      const localUrls = files.map(f => URL.createObjectURL(f));
                      setReviewImagePreviews(prev => [...prev, ...localUrls]);
                      
                      try {
                        const uploadPromises = files.map(async (file) => {
                          const uploadResult = await fileApi.uploadFile(file);
                          const fileId = uploadResult.body?.data?.fileId
                            || uploadResult.data?.fileId
                            || uploadResult.body?.fileId
                            || uploadResult.fileId
                            || uploadResult.data?.id;
                          return fileId;
                        });
                        
                        const uploadedFileIds = await Promise.all(uploadPromises);
                        setReviewFileIds(prev => [...prev, ...uploadedFileIds.filter(id => id)]);
                      } catch (err) {
                        console.error('이미지 업로드 실패:', err);
                        alert('이미지 업로드에 실패했습니다.');
                      } finally {
                        setReviewUploading(false);
                      }
                      
                      e.target.value = '';
                    }}
                    disabled={reviewUploading}
                  />
                </div>

                {/* 미리보기 */}
                {reviewImagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {reviewImagePreviews.map((src, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={src}
                          alt={`preview-${idx}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReviewImagePreviews(prev => prev.filter((_, i) => i !== idx));
                            setReviewFileIds(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-gray-900/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {reviewUploading && (
                  <p className="text-sm text-gray-500 mt-2">이미지 업로드 중...</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewRentalHisId(null);
                    setReviewRating(0);
                    setReviewTitle('');
                    setReviewContent('');
                    setReviewFileIds([]);
                    setReviewImagePreviews([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    if (!reviewRating || !reviewContent.trim()) {
                      alert('평점과 리뷰 내용을 입력해주세요.');
                      return;
                    }
                    
                    try {
                      await createReview({
                        rentalHistoryId: Number(reviewRentalHisId),
                        title: reviewTitle.trim() || `리뷰`,
                        content: reviewContent.trim(),
                        rating: reviewRating,
                        uploadType: reviewUploadType,
                        fileIds: reviewFileIds
                      });
                      
                      // 리뷰 작성 완료 시스템 메시지 전송
                      if (sendMessage) {
                        await sendMessage({
                          type: 'SYSTEM',
                          content: '✅ 리뷰가 작성되었습니다'
                        });
                      }
                      
                      // 모달 닫기 및 상태 초기화
                      setShowReviewModal(false);
                      setReviewRentalHisId(null);
                      setReviewRating(0);
                      setReviewTitle('');
                      setReviewContent('');
                      setReviewFileIds([]);
                      setReviewImagePreviews([]);
                    } catch (error) {
                      console.error('리뷰 작성 실패:', error);
                      alert(error.response?.data?.message || '리뷰 작성에 실패했습니다. 다시 시도해주세요.');
                    }
                  }}
                  disabled={isCreatingReview}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingReview ? '작성 중...' : '작성하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ChatRoomPage;
