/**
 * ChatRoomPage Component
 * 채팅방 페이지 컴포넌트 (카카오톡 스타일)
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useChatContext } from '../contexts/ChatContext';
import { useMessages } from '../hooks/useMessages';
import MessageBubble from '../components/MessageBubble';
import ProfileImage from '../../../shared/components/ProfileImage';
import MessageInput from '../components/MessageInput';
import ChatSettingsModal from '../components/ChatSettingsModal';
import RentalRequestCard from '../components/RentalRequestCard';
import RentalCreateModal from '../components/RentalCreateModal';
import TransactionProcessModal from '../components/TransactionProcessModal';
import PaymentModal from '../../../features/payment/components/PaymentModal';
import { rentalApi } from '../../../features/rental/api/rentalApi';
import { paymentApi } from '../../../features/payment/api/paymentApi';
import { messageApi } from '../api/messageApi';
import { getTransactionButtonStyle } from '../../../shared/utils/transactionUtils';
import { useUnavailableDates } from '../../../features/product/hooks/useUnavailableDates';
import { useProductDetail } from '../../../features/product/hooks/useProductDetail';
import { DUMMY_USERS } from '../../../shared/constants/dummyData';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';

const ChatRoomPage = () => {
  const { chatRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentChatRoom, messages, sendMessage, isConnected, setCurrentChatRoom, isLoading, error } = useChatContext();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  
  // 상태 관리
  const [rentalRequestMessage, setRentalRequestMessage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRentalCreateModal, setShowRentalCreateModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [currentRentalData, setCurrentRentalData] = useState(null);
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
    // 채팅방 로드 (chatRoomId가 변경될 때만)
    if (chatRoomId && currentChatRoom?.chatRoomId !== chatRoomId && currentChatRoom?.id !== chatRoomId) {
      try {
        // 생성된 채팅방 데이터가 있으면 함께 전달 (조회 API 호출 생략)
        setCurrentChatRoom(chatRoomId, existingChatRoomData);
      } catch (error) {
        console.error('채팅방 로드 실패:', error);
      }
    }
  }, [chatRoomId, currentChatRoom?.chatRoomId, currentChatRoom?.id, existingChatRoomData, setCurrentChatRoom]); // chatRoomId와 currentChatRoom.id가 변경될 때만 실행

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageData) => {
    try {
      // 현재 사용자 정보 추가
      if (user && user.id) {
        const currentUserInfo = {
          id: user.id || user.memberId,
          username: user.nickname || user.name || '사용자',
          profileImageUrl: user.profileImage || user.profileImageUrl || null
        };
        messageData.sender = currentUserInfo;
      }
      
      await sendMessage(messageData);
      
      // 채팅방 목록 업데이트를 위한 이벤트 발생 (messageApi.sendMessage에서도 발생하지만 확실히 하기 위해)
      window.dispatchEvent(new Event('chatRoomsUpdated'));
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다.');
    }
  };

  const handleSendFile = async (file) => {
    try {
      // 파일을 Base64로 변환
      const reader = new FileReader();
      reader.onload = (e) => {
        const messageData = {
          content: e.target.result,
          type: 'image'
        };
        sendMessage(messageData);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('파일 전송 실패:', error);
    }
  };

  const handleReply = (message) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleUpdateSettings = async (settings) => {
    try {
      // 채팅방 설정 업데이트 API 호출
      console.log('설정 업데이트:', settings);
    } catch (error) {
      console.error('설정 업데이트 실패:', error);
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
                src={currentChatRoom.participants?.find(p => p.id !== 101)?.profileImage}
                alt={currentChatRoom.name}
                size={40}
                className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  const opponent = currentChatRoom.participants?.find(p => p.id !== 101);
                  console.log('ChatRoomPage - participants:', currentChatRoom.participants);
                  console.log('ChatRoomPage - opponent:', opponent);
                  if (opponent?.id) {
                    console.log('ChatRoomPage - navigating to:', `/members/${opponent.id}`);
                    navigate(`/members/${opponent.id}`);
                  } else {
                    console.log('ChatRoomPage - opponent not found');
                  }
                }}
              />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentChatRoom.name}
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-500">
                    {isConnected ? '온라인' : '연결 중...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 거래 프로세스 버튼 */}
            {productId && (() => {
              const currentUserId = user?.id || user?.memberId;
              const sellerId = productData?.sellerId
                || productData?.writer?.memberId
                || productData?.writer?.member_id
                || productData?.seller?.id
                || productData?.seller?.memberId
                || productData?.seller?.member_id;
              const isSeller = sellerId && Number(sellerId) === Number(currentUserId);

              const status = currentRentalData?.status || currentRentalData?.rentalStatus;
              const { text: buttonText, color: buttonColor } = getTransactionButtonStyle(status, isSeller);

              return (
                <button
                  onClick={() => setShowTransactionModal(true)}
                  className={`px-4 py-2 ${buttonColor} text-white text-sm font-medium rounded-lg transition-colors`}
                >
                  {buttonText}
                </button>
              );
            })()}
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
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
        {messages.length > 0 ? (
          messages.map((message) => {
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
                  <div key={message.id} className="mb-4">
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
                  <div key={message.id} className="mb-4">
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
                <div key={message.id} className="mb-4">
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
                key={message.id}
                message={message}
                isOwn={isOwn}
                onReply={handleReply}
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
      </div>

      {/* 메시지 입력 */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
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

      {/* 통합 거래 프로세스 모달 */}
      <TransactionProcessModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
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
      />
    </div>
    </>
  );
};

export default ChatRoomPage;
