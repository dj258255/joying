/**
 * TransactionProcessModal Component
 * 통합 거래 프로세스 모달 - 모든 거래 단계를 하나의 모달에서 처리
 */

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import ErrorAlert from '../../../shared/components/ErrorAlert';
import CourierSelect from '../../../shared/components/CourierSelect';
import { rentalApi } from '../../rental/api/rentalApi';
import { paymentApi } from '../../payment/api/paymentApi';
import { fileApi } from '../../../shared/api/fileApi';
import { useAuth } from '../../auth/contexts/AuthContext';
import DateRangeCalendar from '../../checkout/components/DateRangeCalendar';
import VideoRecorder from '../../video/components/VideoRecorder';
import { TrackingStatusCard } from '../../shipping';
import PaymentModal from '../../payment/components/PaymentModal';
import CancelRequestModal from '../../rental/components/CancelRequestModal';
import { calculateRentalDays, calculateTotalAmount, getVideoType, getModalTitle } from '../../../shared/utils/transactionUtils';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {Object} props.productData - 상품 정보
 * @param {Object} props.rentalData - 대여 거래 정보 (있는 경우)
 * @param {Array} props.unavailableDates - 대여 불가 날짜
 * @param {string} props.userRole - 사용자 역할 ('seller' | 'buyer')
 * @param {Object} props.requestedDateRange - 대여 요청된 날짜 범위 {start, end}
 * @param {Function} props.onTransactionCreated - 거래 생성 시 콜백
 * @param {Function} props.sendMessage - 채팅 메시지 전송 함수
 * @param {number} props.otherMemberId - 채팅방 상대방의 memberId (거래 생성 시 renterId로 사용)
 */
const TransactionProcessModal = ({
  isOpen,
  onClose,
  productData,
  rentalData = null,
  unavailableDates = [],
  userRole = 'buyer',
  requestedDateRange = null,
  onTransactionCreated,
  sendMessage,
  otherMemberId = null,
  chatRoomId = null
}) => {
  const { user } = useAuth();

  // 상태 관리
  const [currentStep, setCurrentStep] = useState('create'); // create, payment_waiting, payment, shipping, delivery, receive, rental, return, complete
  const [transactionData, setTransactionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 거래 생성 폼 상태
  const [dateRange, setDateRange] = useState(null);
  const [rentMethod, setRentMethod] = useState(() => {
    // requestedDateRange에서 가져오거나 기본값
    return requestedDateRange?.rentMethod ?? 'BOTH';
  }); // BOTH, ONLY_OFFLINE, ONLY_ONLINE
  const [rentalFee, setRentalFee] = useState(() => {
    // requestedDateRange에서 가져오거나 productData에서 가져오기
    return requestedDateRange?.rentalFee ?? productData?.price ?? productData?.rentalFee ?? productData?.dailyPrice ?? 0;
  });
  const [deposit, setDeposit] = useState(() => {
    // requestedDateRange에서 가져오거나 productData에서 가져오기
    return requestedDateRange?.deposit ?? productData?.deposit ?? 0;
  });
  const [requireVideo, setRequireVideo] = useState(false); // 영상 녹화 필수 제거

  // 운송장 정보
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');

  // 영상 녹화 상태
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [recordedVideos, setRecordedVideos] = useState([]);
  const [hasVideo, setHasVideo] = useState(false); // 해당 단계의 영상 존재 여부

  // 결제 모달
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);

  // 취소 요청 모달
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // 송장 번호 등록 모달
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  // 초기화: rentalData가 있으면 상태 복원
  useEffect(() => {
    console.log('[TransactionProcessModal] useEffect 실행:', {
      rentalData,
      rentalDataStatus: rentalData?.status || rentalData?.rentalStatus,
      requestedDateRange,
      userRole
    });

    if (rentalData) {
      setTransactionData(rentalData);
      
      // 영상 존재 여부 확인
      const videos = rentalData.videos || rentalData.rentalVideos || [];
      const currentUserId = user?.id || user?.memberId;
      const sellerId = productData?.sellerId
        || productData?.writer?.memberId
        || productData?.seller?.id;
      const isSeller = sellerId && Number(sellerId) === Number(currentUserId);
      
      // 발송 단계: OWNER_SEND 영상 확인
      const status = rentalData.status || rentalData.rentalStatus;
      if (status === 'ESCROW' || status === 'PAYMENT_COMPLETED' || status === 'SHIPPED') {
        const ownerSendVideo = videos.find(v => v.videoType === 'OWNER_SEND' || v.type === 'OWNER_SEND');
        setHasVideo(!!ownerSendVideo);
        if (ownerSendVideo?.fileUrl) {
          setRecordedVideos([ownerSendVideo.fileUrl]);
        }
      }
      
      // 상태에 따라 currentStep 결정
      determineCurrentStep(rentalData);
    } else {
      // rentalData가 없으면 역할에 따라 다른 단계로
      if (userRole === 'seller') {
        setCurrentStep('create'); // 판매자: 거래 생성
      } else {
        setCurrentStep('no_transaction'); // 구매자: 거래 없음 안내
      }
      setTransactionData(null);

      // 대여 요청된 날짜가 있으면 자동으로 설정
      if (requestedDateRange && requestedDateRange.start && requestedDateRange.end) {
        const startDate = requestedDateRange.start instanceof Date 
          ? requestedDateRange.start 
          : new Date(requestedDateRange.start);
        const endDate = requestedDateRange.end instanceof Date 
          ? requestedDateRange.end 
          : new Date(requestedDateRange.end);
        
        setDateRange({
          start: startDate,
          end: endDate
        });
        // 거래 방법도 기본값으로 설정
        if (requestedDateRange.rentMethod) {
          setRentMethod(requestedDateRange.rentMethod);
        }
        // 금액 정보가 있으면 기본값으로 설정
        if (requestedDateRange.rentalFee !== undefined && requestedDateRange.rentalFee !== null) {
          setRentalFee(requestedDateRange.rentalFee);
        }
        if (requestedDateRange.deposit !== undefined && requestedDateRange.deposit !== null) {
          setDeposit(requestedDateRange.deposit);
        }
      }
    }
  }, [rentalData, requestedDateRange, userRole]);

  // 현재 단계 결정
  const determineCurrentStep = (data) => {
    if (!data) {
      console.log('[TransactionProcessModal] determineCurrentStep: data 없음, create로 설정');
      setCurrentStep('create');
      return;
    }

    const status = data.status || data.rentalStatus;
    console.log('[TransactionProcessModal] determineCurrentStep:', { data, status, userRole });

    switch(status) {
      case 'PENDING':
        // PENDING 상태: 구매자는 결제 확인 모달, 판매자는 대기
        setCurrentStep(userRole === 'buyer' ? 'payment_confirm' : 'payment_waiting');
        break;
      case 'ESCROW':
        // ESCROW 상태: 결제 완료, 에스크로 보관 중 - 판매자는 발송 대기, 구매자는 배송 대기
        setCurrentStep(userRole === 'seller' ? 'shipping' : 'delivery');
        break;
      case 'RESERVED':
        // RESERVED 상태: 구매자는 결제 확인 모달, 판매자는 대기
        setCurrentStep(userRole === 'buyer' ? 'payment_confirm' : 'payment_waiting');
        break;
      case 'PAYMENT_PENDING':
        setCurrentStep('payment_waiting');
        break;
      case 'PAYMENT_COMPLETED':
        setCurrentStep(userRole === 'seller' ? 'shipping' : 'delivery');
        break;
      case 'SHIPPED':
        setCurrentStep('delivery');
        break;
      case 'DELIVERED':
        setCurrentStep('receive');
        break;
      case 'RENTING':
        setCurrentStep('rental');
        break;
      case 'RETURN_REQUESTED':
      case 'RETURN_SHIPPED':
        setCurrentStep('return');
        break;
      case 'COMPLETED':
        setCurrentStep('complete');
        break;
      case 'CANCELLED':
        setCurrentStep('cancelled');
        break;
      default:
        setCurrentStep('create');
    }
  };

  // 거래 생성 (판매자)
  const handleCreateTransaction = async () => {
    if (!dateRange || !dateRange.start || !dateRange.end) {
      setError('대여 기간을 선택해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const productId = productData.id || productData.productId;
      console.log('[TransactionProcessModal] 거래 생성 시작:', {
        productId,
        dateRange,
        rentMethod,
        userRole,
        otherMemberId,
        productData
      });

      const rentalRequestData = {
        startRen: new Date(dateRange.start).toISOString(),
        endRen: new Date(dateRange.end).toISOString(),
        rentMethod: rentMethod,
        // 판매자가 거래를 생성하는 경우, 상대방(구매자)의 memberId를 renterId로 전달
        ...(userRole === 'seller' && otherMemberId ? { renterId: otherMemberId } : {}),
        // 커스텀 대여료와 보증금 전달 (할인 등 금액 조정 시)
        fee: rentalFee,      // 1일 대여료
        deposit: deposit      // 보증금
      };

      console.log('[TransactionProcessModal] 요청 데이터:', {
        productId,
        rentalRequestData
      });

      // 대여 거래 생성
      const result = await rentalApi.createRentalReservation(productId, rentalRequestData);

      console.log('[TransactionProcessModal] 거래 생성 성공:', result);

      // 결제 생성
      const days = Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1;
      const totalAmount = (rentalFee * days) + deposit;

      const paymentData = {
        rentalHisId: result.data.rentalHisId,
        productId: productData.id || productData.productId,
        totalAmount: totalAmount,
        orderName: `${productData.title || productData.name} 대여(보증금 포함)`
      };

      const paymentResult = await paymentApi.createPayment(paymentData);

      const newTransactionData = {
        ...result.data,
        payment: paymentResult.data
      };

      setTransactionData(newTransactionData);
      setCurrentStep('payment_waiting');

      // 부모 컴포넌트에 거래 생성 알림
      if (onTransactionCreated) {
        onTransactionCreated(newTransactionData);
      }

      // 채팅방에 거래 생성 완료 메시지 전송
      if (sendMessage) {
        const messageContent = `✅ 거래 생성 완료\n\n상품: ${productData.title || productData.name}\n기간: ${new Date(dateRange.start).toLocaleDateString('ko-KR')} ~ ${new Date(dateRange.end).toLocaleDateString('ko-KR')} (${days}일)\n대여료: ${(rentalFee * days).toLocaleString()}원\n보증금: ${deposit.toLocaleString()}원\n총 결제금액: ${totalAmount.toLocaleString()}원\n\n[결제하러 가기] 버튼을 눌러주세요!\n\nrentalHisId:${result.data.rentalHisId}`;

        await sendMessage({
          type: 'TEXT',
          content: messageContent
        });
      }

      // alert 제거 - 채팅 메시지로 충분
    } catch (err) {
      console.error('[TransactionProcessModal] 거래 생성 실패:', err);
      console.error('[TransactionProcessModal] 에러 상세:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      // 에러 메시지 개선
      let errorMessage = '거래 생성에 실패했습니다.';
      
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || '잘못된 요청입니다. 입력 정보를 확인해주세요.';
      } else if (err.response?.status === 404) {
        errorMessage = '상품 정보를 찾을 수 없습니다.';
      } else if (err.response?.status === 403) {
        errorMessage = '거래 생성 권한이 없습니다.';
      } else if (err.response?.status === 409) {
        errorMessage = err.response?.data?.message || '이미 진행 중인 거래가 있습니다.';
      } else if (err.response?.status === 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.response?.data) {
        // 백엔드 에러 응답 구조에 따라 메시지 추출
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          // 배열 형태의 에러 메시지
          errorMessage = err.response.data.errors.map(e => e.message || e).join(', ');
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 결제 진행 (구매자)
  const handleProceedPayment = async () => {
    console.log('[TransactionProcessModal] handleProceedPayment 호출됨');

    if (!transactionData) {
      setError('거래 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 결제 금액 계산
      const days = Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24)) + 1;
      const totalAmount = (transactionData.fee * days) + transactionData.deposit;

      console.log('[TransactionProcessModal] 결제 생성 시작:', {
        rentalHisId: transactionData.rentalHisId,
        productId: productData.id || productData.productId,
        totalAmount,
        days
      });

      // 결제 생성 API 호출
      const paymentData = {
        rentalHisId: transactionData.rentalHisId,
        productId: productData.id || productData.productId,
        totalAmount: totalAmount,
        orderName: `${productData.title || productData.name} 대여(보증금 포함)`
      };

      const paymentResult = await paymentApi.createPayment(paymentData);

      console.log('[TransactionProcessModal] 결제 생성 완료:', paymentResult);

      // PaymentModal 열기 전 환경 변수 확인
      const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY?.trim();
      console.log('[TransactionProcessModal] 결제 모달 열기 전 VITE_TOSS_CLIENT_KEY 확인:', {
        exists: !!import.meta.env.VITE_TOSS_CLIENT_KEY,
        value: clientKey ? `${clientKey.substring(0, 15)}...` : 'undefined',
        length: clientKey?.length || 0,
        paymentInfo: paymentResult.data
      });

      // PaymentModal 열기
      setPaymentInfo(paymentResult.data);
      setShowPaymentModal(true);
    } catch (err) {
      console.error('[TransactionProcessModal] 결제 생성 실패:', err);
      setError('결제 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 거래 취소 (구매자가 결제 전 취소)
  const handleCancelTransaction = async () => {
    if (!window.confirm('거래를 취소하시겠습니까?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // PENDING 상태에서의 취소: 아직 결제가 안 되었으므로 보증금 분배는 0/0
      const cancelData = {
        reason: '구매자가 결제 전 거래를 취소했습니다.',
        depositOwnerAmt: 0,
        depositRenterAmt: 0
      };

      // 대여 취소 요청 API 호출
      await rentalApi.createCancelRequest(transactionData.rentalHisId, cancelData);

      // 채팅방에 취소 메시지 전송
      if (sendMessage) {
        const messageContent = `❌ 결제를 취소했습니다\n\n상품: ${productData.title || productData.name}\n구매자가 거래를 취소했습니다.`;

        await sendMessage({
          type: 'TEXT',
          content: messageContent
        });
      }

      alert('거래가 취소되었습니다.');
      onClose();

      // 부모 컴포넌트에 취소 알림 (거래 상태 업데이트)
      if (onTransactionCreated) {
        onTransactionCreated(null);
      }
    } catch (err) {
      console.error('[TransactionProcessModal] 거래 취소 실패:', err);
      const errorMessage = err.response?.data?.message || err.message || '거래 취소에 실패했습니다.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 결제 성공 핸들러
  const handlePaymentSuccess = async (paymentKey, orderId, amount) => {
    try {
      setIsLoading(true);

      // 결제 승인
      const confirmData = {
        orderId: orderId,
        paymentKey: paymentKey,
        amount: amount
      };

      await paymentApi.confirmPayment(confirmData);

      // 거래 상태 업데이트
      const updatedRentalData = {
        ...transactionData,
        status: 'PAYMENT_COMPLETED'
      };
      setTransactionData(updatedRentalData);

      // 채팅방에 결제 완료 메시지 전송 (버튼 포함)
      if (sendMessage) {
        const messageContent = `✅ 결제가 완료되었습니다!\n\n상품: ${productData.title || productData.name}\n결제 금액: ${amount.toLocaleString()}원\n주문번호: ${orderId}\n\n💡 판매자님, 물건을 발송해주세요!\n💡 구매자님, 판매자가 물건을 발송할 때까지 기다려주세요!\n\nrentalHisId:${transactionData.rentalHisId}\nMESSAGE_TYPE:PAYMENT_COMPLETE`;

        await sendMessage({
          type: 'TEXT',
          content: messageContent,
          metadata: {
            messageType: 'PAYMENT_COMPLETE',
            rentalHisId: transactionData.rentalHisId,
            paymentInfo: {
              orderId: orderId,
              amount: amount,
              productName: productData.title || productData.name
            }
          }
        });
      }

      setShowPaymentModal(false);
      setCurrentStep('delivery');

      // alert 제거 - 채팅 메시지로 충분
    } catch (err) {
      console.error('[TransactionProcessModal] 결제 승인 실패:', err);
      console.error('[TransactionProcessModal] 에러 상세:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      // 에러 메시지 개선
      let errorMessage = '결제 승인에 실패했습니다.';
      
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || '잘못된 결제 정보입니다.';
      } else if (err.response?.status === 404) {
        errorMessage = '거래 정보를 찾을 수 없습니다.';
      } else if (err.response?.status === 402) {
        errorMessage = '결제에 실패했습니다. 카드 정보를 확인해주세요.';
      } else if (err.response?.status === 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 대화가 더 필요해요 (거래 재협상)
  const handleNeedMoreTalk = () => {
    onClose();
    alert('판매자와 대화를 통해 거래 조건을 조율해주세요. 조율이 완료되면 판매자가 새로운 거래를 생성할 수 있습니다.');
  };

  // 영상 촬영 시작 (발송 전)
  const handleStartVideoRecording = () => {
    console.log('[TransactionProcessModal] 영상 촬영 시작');
    setShowVideoRecorder(true);
  };

  // 발송 처리 (판매자) - 운송장 번호는 영상 촬영 후 입력
  const handleShipItem = async () => {
    if (!trackingNumber || !courier) {
      setError('택배사와 운송장 번호를 모두 입력해주세요.');
      return;
    }

    if (trackingNumber.length < 10) {
      setError('운송장 번호를 정확히 입력해주세요. (최소 10자리)');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[TransactionProcessModal] 발송 처리 시작:', {
        rentalHisId: transactionData.rentalHisId,
        carrierCode: courier,
        trackingNo: trackingNumber
      });

      await rentalApi.shipItem(transactionData.rentalHisId, {
        carrierCode: courier,
        trackingNo: trackingNumber
      });

      console.log('[TransactionProcessModal] 발송 처리 성공');

      // 채팅방에 발송 완료 메시지 전송
      if (sendMessage) {
        const messageContent = `🚚 물건이 발송되었습니다!\n\n택배사: ${courierOptions.find(c => c.value === courier)?.label || courier}\n운송장 번호: ${trackingNumber}\n\n배송 조회를 통해 물건 위치를 확인할 수 있습니다.\n\nrentalHisId:${transactionData.rentalHisId}\nMESSAGE_TYPE:SHIPPING_COMPLETE`;
        
        await sendMessage({
          type: 'TEXT',
          content: messageContent,
          metadata: {
            messageType: 'SHIPPING_COMPLETE',
            rentalHisId: transactionData.rentalHisId,
            trackingNumber: trackingNumber,
            courier: courier
          }
        });
      }

      // 거래 데이터 새로고침
      const updatedData = await rentalApi.getRentalDetail(transactionData.rentalHisId);
      setTransactionData(updatedData.data || updatedData);
      
      setShowTrackingModal(false);
      setCurrentStep('delivery');
    } catch (err) {
      console.error('[TransactionProcessModal] 발송 처리 실패:', err);
      console.error('[TransactionProcessModal] 에러 상세:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      // 에러 메시지 개선
      let errorMessage = '발송 처리에 실패했습니다.';
      
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || '잘못된 요청입니다. 택배사와 운송장 번호를 확인해주세요.';
      } else if (err.response?.status === 404) {
        errorMessage = '거래 정보를 찾을 수 없습니다.';
      } else if (err.response?.status === 403) {
        errorMessage = '발송 권한이 없습니다.';
      } else if (err.response?.status === 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 영상 업로드 완료
  const handleVideoUploadComplete = async (videoBlob) => {
    try {
      setIsLoading(true);

      // 1. 영상을 서버에 업로드
      console.log('[TransactionProcessModal] 영상 업로드 시작');
      const uploadResult = await fileApi.uploadFile(videoBlob);
      console.log('[TransactionProcessModal] 업로드 응답:', uploadResult);

      // 응답 구조에 따라 fileId 추출 (여러 가능성 체크)
      const fileId = uploadResult?.body?.data?.fileId
                  || uploadResult?.data?.fileId
                  || uploadResult?.fileId;

      if (!fileId) {
        throw new Error('파일 업로드 응답에서 fileId를 찾을 수 없습니다. 응답: ' + JSON.stringify(uploadResult));
      }

      console.log('[TransactionProcessModal] 영상 업로드 성공. fileId:', fileId);

      // 2. 대여 이력에 영상 등록
      // VideoType: OWNER_SEND, RENTER_RECEIVE, RENTER_RETURN, OWNER_RECEIVE
      const currentUserId = user?.id || user?.memberId;
      const sellerId = productData?.sellerId
        || productData?.writer?.memberId
        || productData?.seller?.id;
      const isSeller = sellerId && Number(sellerId) === Number(currentUserId);

      let videoType;
      if (currentStep === 'shipping') {
        videoType = 'OWNER_SEND'; // 판매자가 발송
      } else if (currentStep === 'receive') {
        videoType = 'RENTER_RECEIVE'; // 구매자가 수령
      } else if (currentStep === 'return') {
        videoType = isSeller ? 'OWNER_RECEIVE' : 'RENTER_RETURN'; // 구매자가 반납 or 판매자가 회수
      }

      await rentalApi.uploadVideo(transactionData.rentalHisId, {
        fileId: fileId,
        videoType: videoType
      });

      setShowVideoRecorder(false);

      // 응답에서 URL 추출
      const videoResponse = await rentalApi.getVideos(transactionData.rentalHisId);
      const videoList = videoResponse?.data?.videos || videoResponse?.data?.data?.videos || videoResponse?.videos || [];
      const uploadedVideo = videoList.find(v => v.videoType === videoType);
      const uploadedUrl = uploadedVideo?.fileUrl || uploadedVideo?.url || '';

      if (uploadedUrl) {
        setRecordedVideos([uploadedUrl]);
        setHasVideo(true);
      }

      if (currentStep === 'shipping') {
        // 영상 업로드 완료 - 채팅 메시지 전송 후 송장 번호 등록 모달 열기
        if (sendMessage) {
          const messageContent = `✅ 발송 전 영상이 촬영되었습니다!\n\n영상을 확인하시고, 물건을 포장한 후 운송장 번호를 등록해주세요.\n\nrentalHisId:${transactionData.rentalHisId}\nMESSAGE_TYPE:SHIPPING_VIDEO_UPLOADED`;
          
          await sendMessage({
            type: 'TEXT',
            content: messageContent,
            metadata: {
              messageType: 'SHIPPING_VIDEO_UPLOADED',
              rentalHisId: transactionData.rentalHisId
            }
          });
        }
        
        // 송장 번호 등록 모달 열기
        setShowVideoRecorder(false);
        setShowTrackingModal(true);
      } else       if (currentStep === 'receive') {
        setCurrentStep('rental');
        setHasVideo(true);
        // alert 제거
      } else if (currentStep === 'return') {
        setHasVideo(true);
        // alert 제거
        // currentStep은 'return' 유지
      }
    } catch (err) {
      console.error('[TransactionProcessModal] 영상 업로드 실패:', err);
      console.error('[TransactionProcessModal] 에러 상세:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      // 에러 메시지 개선
      let errorMessage = '영상 업로드에 실패했습니다.';
      
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || '잘못된 영상 파일입니다.';
      } else if (err.response?.status === 413) {
        errorMessage = '영상 파일 크기가 너무 큽니다. (최대 50MB)';
      } else if (err.response?.status === 404) {
        errorMessage = '거래 정보를 찾을 수 없습니다.';
      } else if (err.response?.status === 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setShowVideoRecorder(false); // 에러 발생 시 모달 닫기
    } finally {
      setIsLoading(false);
    }
  };

  // 수령 확인 - 대여 시작
  const handleConfirmReceive = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await rentalApi.confirmReceive(transactionData.rentalHisId);

      // 영상 녹화 필요 시
      if (requireVideo) {
        setShowVideoRecorder(true);
      } else {
        setCurrentStep('rental');
        alert('대여가 시작되었습니다.');
      }
    } catch (err) {
      console.error('[TransactionProcessModal] 수령 확인 실패:', err);
      const errorMessage = err.response?.data?.message || err.message || '수령 확인에 실패했습니다.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 반납 처리
  const handleReturnItem = async () => {
    // 영상이 필요한데 아직 안 찍었으면 영상 촬영 먼저
    if (requireVideo && recordedVideos.length === 0) {
      setShowVideoRecorder(true);
      return;
    }

    // 운송장 정보 확인
    if (!trackingNumber || !courier) {
      setError('택배사와 운송장 번호를 입력해주세요.');
      return;
    }

    // 반납 API 호출
    try {
      setIsLoading(true);
      setError(null);

      await rentalApi.returnItem(transactionData.rentalHisId, {
        carrierCode: courier,
        trackingNo: trackingNumber
      });

      // 채팅방에 반납 완료 메시지 전송
      const videoUrl = recordedVideos.length > 0 ? recordedVideos[0] : null;
      const messageContent = `📦 반납을 완료했습니다!\n\n택배사: ${courier}\n운송장 번호: ${trackingNumber}\n\n${videoUrl ? `[동영상 보기](${videoUrl})` : ''}\n\nrentalHisId:${transactionData.rentalHisId}`;

      if (sendMessage) {
        await sendMessage({
          type: 'TEXT',
          content: messageContent
        });
      }

      // alert 제거
      onClose();
    } catch (err) {
      console.error('[TransactionProcessModal] 반납 처리 실패:', err);
      console.error('[TransactionProcessModal] 에러 상세:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      // 에러 메시지 개선
      let errorMessage = '반납 처리에 실패했습니다.';
      
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || '잘못된 요청입니다. 운송장 번호를 확인해주세요.';
      } else if (err.response?.status === 404) {
        errorMessage = '거래 정보를 찾을 수 없습니다.';
      } else if (err.response?.status === 403) {
        errorMessage = '반납 권한이 없습니다.';
      } else if (err.response?.status === 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 회수 확인
  const handleConfirmReturn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await rentalApi.confirmReturn(transactionData.rentalHisId);

      setCurrentStep('complete');
      // alert 제거
    } catch (err) {
      console.error('[TransactionProcessModal] 회수 확인 실패:', err);
      console.error('[TransactionProcessModal] 에러 상세:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      // 에러 메시지 개선
      let errorMessage = '회수 확인에 실패했습니다.';
      
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || '잘못된 요청입니다.';
      } else if (err.response?.status === 404) {
        errorMessage = '거래 정보를 찾을 수 없습니다.';
      } else if (err.response?.status === 403) {
        errorMessage = '회수 확인 권한이 없습니다.';
      } else if (err.response?.status === 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 거래 취소 요청 핸들러
  const handleCancelRequest = async (cancelData) => {
    try {
      setIsCancelling(true);
      setError(null);

      const { reason, buyerRefund, sellerRefund } = cancelData;

      console.log('[TransactionProcessModal] 취소 요청:', {
        rentalHisId: transactionData.rentalHisId,
        reason,
        depositRenterAmt: buyerRefund,
        depositOwnerAmt: sellerRefund
      });

      const cancelResponse = await rentalApi.createCancelRequest(transactionData.rentalHisId, {
        reason: reason,
        depositRenterAmt: buyerRefund,
        depositOwnerAmt: sellerRefund
      });

      console.log('[TransactionProcessModal] 취소 요청 성공:', cancelResponse);

      // 채팅방에 취소 요청 메시지 전송
      if (sendMessage) {
        const messageContent = `🚫 거래 취소 요청이 접수되었습니다\n\n상품: ${productData.title || productData.name}\n취소 사유: ${reason}\n\n구매자 환불: ${buyerRefund.toLocaleString()}원\n판매자 환불: ${sellerRefund.toLocaleString()}원\n\nrentalHisId:${transactionData.rentalHisId}\ncancelId:${cancelResponse.data?.cancelId || ''}\nMESSAGE_TYPE:CANCEL_REQUEST`;

        await sendMessage({
          type: 'TEXT',
          content: messageContent,
          metadata: {
            messageType: 'CANCEL_REQUEST',
            rentalHisId: transactionData.rentalHisId,
            cancelId: cancelResponse.data?.cancelId,
            reason: reason,
            buyerRefund: buyerRefund,
            sellerRefund: sellerRefund
          }
        });

        console.log('[TransactionProcessModal] 취소 요청 메시지 전송 완료');
      }

      // alert 제거
      setShowCancelModal(false);
      onClose();
    } catch (err) {
      console.error('[TransactionProcessModal] 취소 요청 실패:', err);
      const errorMessage = err.response?.data?.message || err.message || '취소 요청에 실패했습니다.';
      setError(errorMessage);
      throw err; // CancelRequestModal에서 에러 처리
    } finally {
      setIsCancelling(false);
    }
  };

  // 모달 제목 결정
  const getModalTitle = () => {
    switch(currentStep) {
      case 'create': return '거래 생성하기';
      case 'payment_confirm': return '결제하기';
      case 'payment_waiting': return '결제 대기 중';
      case 'payment': return '결제하기';
      case 'shipping': return '발송 처리';
      case 'delivery': return '배송 추적';
      case 'receive': return '수령 확인';
      case 'rental': return '대여 중';
      case 'return': return '반납 처리';
      case 'complete': return '거래 완료';
      case 'cancelled': return '거래 취소됨';
      default: return '거래 프로세스';
    }
  };

  // 택배사 옵션
  const courierOptions = [
    { value: 'cj', label: 'CJ대한통운' },
    { value: 'post', label: '우체국택배' },
    { value: 'lotte', label: '롯데택배' },
    { value: 'hanjin', label: '한진택배' },
    { value: 'logen', label: '로젠택배' },
  ];

  // 거래 생성자 확인 (owner가 거래를 생성했는지)
  const isTransactionCreator = useMemo(() => {
    if (!transactionData || !user) return false;
    const currentUserId = user?.id || user?.memberId;
    const ownerId = transactionData.owner?.memberId 
      || transactionData.owner?.id 
      || transactionData.ownerId
      || productData?.sellerId
      || productData?.writer?.memberId;
    
    return ownerId && Number(ownerId) === Number(currentUserId);
  }, [transactionData, user, productData]);

  // 렌더링
  // 모달 닫기 핸들러 (비디오 레코더도 함께 닫기)
  const handleCloseModal = () => {
    setShowVideoRecorder(false); // 비디오 레코더 닫기
    onClose(); // 부모 컴포넌트의 onClose 호출
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal 
        isOpen={isOpen && !showVideoRecorder} 
        onClose={handleCloseModal} 
        title={getModalTitle()} 
        className="max-w-2xl"
        hideCloseButton={true}
      >
        <div className="space-y-6">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-500/20 backdrop-blur-md border border-red-400/50 rounded-2xl p-4">
              <p className="text-sm text-red-900 font-semibold">{error}</p>
            </div>
          )}

          {/* 거래 없음 안내 (구매자) */}
          {currentStep === 'no_transaction' && userRole === 'buyer' && (
            <div className="space-y-6">
              <div className="p-8 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl text-center shadow-lg">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-gray-900 font-bold text-xl mb-3">아직 거래가 생성되지 않았습니다</p>
                <p className="text-gray-700 text-base leading-relaxed">소유자가 거래를 생성할 때까지 기다려주세요.</p>
                <p className="text-gray-700 text-base mt-3 leading-relaxed">채팅 하단의 "대여 요청하기" 버튼으로 대여를 요청할 수 있습니다.</p>
              </div>

              <button
                onClick={onClose}
                className="w-full px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base"
              >
                닫기
              </button>
            </div>
          )}

          {/* 거래 생성 단계 (판매자) */}
          {currentStep === 'create' && userRole === 'seller' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  대여 기간 선택 *
                </label>
                <DateRangeCalendar
                  onDateRangeChange={setDateRange}
                  disabledDates={unavailableDates}
                  availableStartDate={productData?.startRent || null}
                  availableEndDate={productData?.endRent || null}
                  initialStartDate={dateRange?.start || null}
                  initialEndDate={dateRange?.end || null}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    대여료 (1일) *
                  </label>
                  <input
                    type="number"
                    value={rentalFee}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setRentalFee(value >= 0 ? value : 0);
                    }}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (value < 0 || isNaN(value)) {
                        setRentalFee(0);
                      }
                    }}
                    min="0"
                    className="glass-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    보증금 *
                  </label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setDeposit(value >= 0 ? value : 0);
                    }}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (value < 0 || isNaN(value)) {
                        setDeposit(0);
                      }
                    }}
                    min="0"
                    className="glass-input w-full"
                  />
                </div>
              </div>


              {dateRange && dateRange.start && dateRange.end && (
                <div className="p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">
                  <h4 className="font-medium text-gray-900 mb-3">거래 요약</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">대여 기간</span>
                      <span className="text-gray-900 font-medium">{Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1}일</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">대여료</span>
                      <span className="text-gray-900 font-medium">{rentalFee.toLocaleString()}원 × {Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1}일</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">보증금</span>
                      <span className="text-gray-900 font-medium">{deposit.toLocaleString()}원</span>
                    </div>
                    <div className="pt-2 border-t border-white/50 flex justify-between">
                      <span className="font-semibold text-gray-900">총 결제 금액</span>
                      <span className="font-bold text-lg text-gray-900">{((rentalFee * (Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1)) + deposit).toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 glass-button-ghost text-gray-900 rounded-lg font-medium disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateTransaction}
                  disabled={isLoading || !dateRange}
                  className="flex-1 px-4 py-2 glass-button text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '생성 중...' : '거래 생성하기'}
                </button>
              </div>
            </div>
          )}

          {/* 결제 확인 단계 (구매자 - PENDING 상태) */}
          {currentStep === 'payment_confirm' && userRole === 'buyer' && (
            <div className="space-y-6">
              {isTransactionCreator ? (
                // 거래 생성자는 결제 상태만 확인
                <>
                  <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg text-center">
                    <div className="text-5xl mb-4">💳</div>
                    <p className="text-gray-900 font-bold text-xl mb-3">결제 대기 중입니다</p>
                    <p className="text-gray-700 text-base leading-relaxed">
                      대여자가 결제를 완료할 때까지 기다려주세요
                    </p>
                  </div>

                  {transactionData && (
                    <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                      <h4 className="font-semibold text-gray-900 mb-4 text-lg">거래 정보</h4>
                      <div className="text-base text-gray-700 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">상품</span>
                          <span className="font-semibold text-gray-900">{productData.title || productData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">대여 기간</span>
                          <span className="font-semibold text-gray-900">
                            {new Date(transactionData.startRen).toLocaleDateString('ko-KR')} ~ {new Date(transactionData.endRen).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">일수</span>
                          <span className="font-semibold text-gray-900">
                            {Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24)) + 1}일
                          </span>
                        </div>
                        <div className="pt-3 border-t border-white/50 flex justify-between">
                          <span className="font-semibold text-gray-900 text-lg">결제 금액</span>
                          <span className="font-bold text-xl text-gray-900">
                            {((transactionData.fee * (Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24)) + 1)) + transactionData.deposit).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base"
                  >
                    확인
                  </button>
                </>
              ) : (
                // 대여자(구매자)는 결제 가능
                <>
                  <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                    <p className="text-gray-900 font-bold text-xl mb-3">💳 소유자가 거래를 생성했습니다</p>
                    <p className="text-gray-700 text-base leading-relaxed">결제를 진행하거나 거래를 취소할 수 있습니다</p>
                  </div>

                  {transactionData && (
                    <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                      <h4 className="font-semibold text-gray-900 mb-4 text-lg">거래 정보</h4>
                      <div className="text-base text-gray-700 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">상품</span>
                          <span className="font-semibold text-gray-900">{productData.title || productData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">대여 기간</span>
                          <span className="font-semibold text-gray-900">
                            {new Date(transactionData.startRen).toLocaleDateString('ko-KR')} ~ {new Date(transactionData.endRen).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">일수</span>
                          <span className="font-semibold text-gray-900">
                            {Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24)) + 1}일
                          </span>
                        </div>
                        <div className="pt-3 border-t border-white/50 flex justify-between">
                          <span className="font-semibold text-gray-900 text-lg">결제 금액</span>
                          <span className="font-bold text-xl text-gray-900">
                            {((transactionData.fee * (Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24)) + 1)) + transactionData.deposit).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={isLoading}
                      className="flex-1 px-6 py-3 glass-button-danger text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      거래 취소하기
                    </button>
                    <button
                      onClick={handleProceedPayment}
                      disabled={isLoading}
                      className="flex-1 px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      결제하러 가기
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 결제 대기 단계 (구매자) */}
          {currentStep === 'payment_waiting' && userRole === 'buyer' && (
            <div className="space-y-6">
              {isTransactionCreator ? (
                // 거래 생성자는 결제 상태만 확인
                <>
                  <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg text-center">
                    <div className="text-5xl mb-4">⏳</div>
                    <p className="text-gray-900 font-bold text-xl mb-3">결제 대기 중입니다</p>
                    <p className="text-gray-700 text-base leading-relaxed">
                      대여자가 결제를 완료할 때까지 기다려주세요
                    </p>
                  </div>

                  {transactionData && (
                    <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                      <h4 className="font-semibold text-gray-900 mb-4 text-lg">거래 정보</h4>
                      <div className="text-base text-gray-700 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">상품</span>
                          <span className="font-semibold text-gray-900">{productData.title || productData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">대여 기간</span>
                          <span className="font-semibold text-gray-900">
                            {Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24)) + 1}일
                          </span>
                        </div>
                        <div className="pt-3 border-t border-white/50 flex justify-between">
                          <span className="font-semibold text-gray-900 text-lg">결제 금액</span>
                          <span className="font-bold text-xl text-gray-900">
                            {((transactionData.fee * (Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24)) + 1)) + transactionData.deposit).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base"
                  >
                    확인
                  </button>
                </>
              ) : (
                // 대여자(구매자)는 결제 가능
                <>
                  <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                    <p className="text-gray-900 font-bold text-xl mb-3">소유자가 거래를 생성했습니다</p>
                    <p className="text-gray-700 text-base leading-relaxed">결제를 진행하거나 조건이 맞지 않으면 소유자와 대화를 더 진행해주세요</p>
                  </div>

                  {transactionData && (
                    <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                      <h4 className="font-semibold text-gray-900 mb-4 text-lg">거래 정보</h4>
                      <div className="text-base text-gray-700 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">상품</span>
                          <span className="font-semibold text-gray-900">{productData.title || productData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">대여 기간</span>
                          <span className="font-semibold text-gray-900">
                            {Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24)) + 1}일
                          </span>
                        </div>
                        <div className="pt-3 border-t border-white/50 flex justify-between">
                          <span className="font-semibold text-gray-900 text-lg">결제 금액</span>
                          <span className="font-bold text-xl text-gray-900">
                            {((transactionData.fee * (Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24)) + 1)) + transactionData.deposit).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleNeedMoreTalk}
                      className="flex-1 px-6 py-3 glass-button-ghost text-gray-900 rounded-2xl font-semibold text-base"
                    >
                      대화가 더 필요해요
                    </button>
                    <button
                      onClick={handleProceedPayment}
                      disabled={isLoading}
                      className="flex-1 px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      결제하러 가기
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 결제 대기 단계 (판매자) */}
          {currentStep === 'payment_waiting' && userRole === 'seller' && (
            <div className="space-y-4">
              <div className="p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl text-center">
                <p className="text-gray-900 font-semibold mb-1">대여자의 결제를 기다리는 중...</p>
                <p className="text-gray-700 text-sm mt-1">대여자가 결제를 완료하면 알림을 받게 됩니다</p>
              </div>

              {transactionData && (
                <div className="p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">
                  <h4 className="font-medium text-gray-900 mb-2">생성된 거래 정보</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>주문번호: {transactionData.payment?.orderId}</div>
                    <div className="text-gray-900 font-medium">결제 금액: {transactionData.payment?.totalAmount?.toLocaleString() || 0}원</div>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full px-4 py-2 glass-button text-white rounded-lg font-medium"
              >
                닫기
              </button>
            </div>
          )}

          {/* 발송 처리 단계 (판매자) */}
          {currentStep === 'shipping' && userRole === 'seller' && (
            <div className="space-y-4">
              <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                <p className="text-gray-900 font-bold text-xl mb-3">✅ 결제가 완료되었습니다</p>
                <p className="text-gray-700 text-base leading-relaxed">
                  물건을 포장하고 발송해주세요. 영상 촬영과 운송장 등록은 각각 독립적으로 진행할 수 있습니다.
                </p>
              </div>

              {/* 영상 촬영 섹션 */}
              <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-gray-900 font-semibold mb-1">📹 발송 전 영상 촬영</h3>
                    <p className="text-sm text-gray-600">
                      물건을 포장하기 전 상태를 촬영하세요. 여러 번 재촬영할 수 있습니다.
                    </p>
                  </div>
                </div>
                
                {hasVideo && recordedVideos.length > 0 && (
                  <div className="mb-4 p-4 bg-green-500/20 backdrop-blur-md border border-green-400/50 rounded-2xl">
                    <p className="text-sm text-green-900 font-semibold mb-3">✅ 영상이 등록되어 있습니다</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const rentalHisId = transactionData?.rentalHisId;
                          if (rentalHisId) {
                            // VideoListModal 열기
                            window.dispatchEvent(new CustomEvent('openVideoListModal', { detail: { rentalHisId } }));
                          }
                        }}
                        className="flex-1 px-4 py-2.5 text-sm glass-button-ghost text-gray-900 rounded-2xl font-medium transition-colors"
                      >
                        영상 보기
                      </button>
                      <button
                        onClick={handleStartVideoRecording}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 text-sm glass-button-ghost text-gray-900 rounded-2xl font-medium transition-colors disabled:opacity-50"
                      >
                        다시 촬영
                      </button>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleStartVideoRecording}
                  disabled={isLoading}
                  className="w-full px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasVideo ? '영상 다시 촬영하기' : '영상 촬영하기'}
                </button>
              </div>

              {/* 운송장 등록 섹션 */}
              <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                <h3 className="text-gray-900 font-semibold mb-2">📦 운송장 번호 등록</h3>
                <p className="text-base text-gray-700 mb-4 leading-relaxed">
                  물건을 포장하고 택배사에 맡긴 후 운송장 번호를 입력하세요.
                </p>

                {/* 운송장 번호가 이미 등록된 경우 배송 조회 카드 표시 */}
                {(transactionData?.trackingNumber || trackingNumber) ? (
                  <>
                    <TrackingStatusCard
                      trackingNumber={transactionData?.trackingNumber || trackingNumber}
                      courier={transactionData?.carrierCode || transactionData?.courier || courier}
                    />
                  </>
                ) : (
                  <button
                    onClick={() => setShowTrackingModal(true)}
                    className="w-full px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base"
                  >
                    운송장 번호 등록하기
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 배송 추적 단계 (구매자) */}
          {currentStep === 'delivery' && userRole === 'buyer' && (
            <div className="space-y-4">
              {(transactionData?.trackingNumber || trackingNumber) && (
                <TrackingStatusCard
                  trackingNumber={transactionData?.trackingNumber || trackingNumber}
                  courier={transactionData?.carrierCode || transactionData?.courier || courier}
                />
              )}

              <div className="p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">
                <p className="text-gray-900 text-sm font-medium">물건이 도착하면 수령 확인을 진행해주세요</p>
              </div>

              <button
                onClick={() => setCurrentStep('receive')}
                className="w-full px-4 py-2 glass-button text-white rounded-lg font-medium"
              >
                물품 수령 확인하기
              </button>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 glass-button-ghost text-gray-900 rounded-lg font-medium"
              >
                닫기
              </button>
            </div>
          )}

          {/* 수령 확인 단계 (구매자) */}
          {currentStep === 'receive' && userRole === 'buyer' && (
            <div className="space-y-4">
              <div className="p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">
                <p className="text-gray-900 font-semibold mb-1">📦 물건이 도착했나요?</p>
                <p className="text-gray-700 text-sm mt-1">물건을 확인하고 대여를 시작하거나 문제가 있으면 취소할 수 있습니다</p>
              </div>

              {requireVideo && (
                <div className="p-3 bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/50 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">📹 개봉 영상을 촬영해야 합니다</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 px-4 py-2 glass-button-danger text-white rounded-lg font-medium"
                >
                  거래 취소하기
                </button>
                <button
                  onClick={handleConfirmReceive}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 glass-button text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {requireVideo ? '영상 촬영하기' : '대여 시작'}
                </button>
              </div>
            </div>
          )}

          {/* 대여 중 단계 */}
          {currentStep === 'rental' && (
            <div className="space-y-4">
              <div className="p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl text-center">
                <p className="text-gray-900 font-semibold mb-1">✅ 대여 중</p>
                <p className="text-gray-700 text-sm mt-1">
                  {userRole === 'buyer' ? '대여 기간이 끝나면 반납해주세요' : '대여자가 반납할 때까지 기다려주세요'}
                </p>
              </div>

              {transactionData && (
                <div className="p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">
                  <h4 className="font-medium text-gray-900 mb-2">대여 정보</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>대여 시작: {new Date(transactionData.startRen).toLocaleDateString()}</div>
                    <div>대여 종료: {new Date(transactionData.endRen).toLocaleDateString()}</div>
                    <div>남은 기간: {Math.ceil((new Date(transactionData.endRen) - new Date()) / (1000 * 60 * 60 * 24))}일</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {userRole === 'buyer' && (
                  <button
                    onClick={() => {
                      setCurrentStep('return');
                      setTrackingNumber('');
                      setCourier('');
                    }}
                    className="flex-1 px-4 py-2 glass-button text-white rounded-lg font-medium"
                  >
                    반납하기
                  </button>
                )}
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 px-4 py-2 glass-button-danger text-white rounded-lg font-medium"
                >
                  거래 중단하기
                </button>
              </div>
            </div>
          )}

          {/* 반납 처리 단계 (구매자) */}
          {currentStep === 'return' && userRole === 'buyer' && (
            <div className="space-y-4">
              <div className="p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">
                <p className="text-gray-900 font-semibold mb-1">반납 처리</p>
                <p className="text-gray-700 text-sm mt-1">물건을 포장하고 운송장 번호를 입력해주세요</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  택배사 선택 *
                </label>
                <select
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="glass-input w-full"
                >
                  <option value="">택배사를 선택하세요</option>
                  {courierOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  운송장 번호 *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="숫자만 입력하세요"
                  className="glass-input w-full"
                />
              </div>

              {requireVideo && (
                <div className="p-3 bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/50 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">📹 반납 전 물건 상태 영상을 촬영해야 합니다</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 glass-button-ghost text-gray-900 rounded-lg font-medium"
                >
                  거래 취소하기
                </button>
                <button
                  onClick={handleReturnItem}
                  disabled={isLoading || !courier || !trackingNumber}
                  className="flex-1 px-4 py-2 glass-button text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {isLoading ? '처리 중...' : requireVideo ? '영상 촬영하기' : '반납 완료'}
                </button>
              </div>
            </div>
          )}

          {/* 반납 확인 대기 단계 (판매자) */}
          {currentStep === 'return' && userRole === 'seller' && (
            <div className="space-y-4">
              {(transactionData?.returnTrackingNumber || trackingNumber) && (
                <TrackingStatusCard
                  trackingNumber={transactionData?.returnTrackingNumber || trackingNumber}
                  courier={transactionData?.returnCourier || courier}
                />
              )}

              <div className="p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">
                <p className="text-gray-900 text-sm font-medium">물건이 도착하면 확인 후 거래를 완료해주세요</p>
              </div>

              <button
                onClick={handleConfirmReturn}
                disabled={isLoading}
                className="w-full px-4 py-2 glass-button text-white rounded-lg font-medium disabled:opacity-50"
              >
                {isLoading ? '처리 중...' : '회수 확인 및 거래 완료'}
              </button>
            </div>
          )}

          {/* 거래 완료 단계 */}
          {currentStep === 'complete' && (
            <div className="space-y-4">
              <div className="p-6 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-gray-900 font-bold text-lg">거래가 완료되었습니다!</p>
                <p className="text-gray-700 text-sm mt-2">안전한 거래를 이용해주셔서 감사합니다</p>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 glass-button text-white rounded-lg font-medium"
              >
                확인
              </button>
            </div>
          )}

        </div>
      </Modal>

      {/* 영상 녹화 모달 */}
      {showVideoRecorder && (
        <Modal 
          isOpen={showVideoRecorder} 
          onClose={() => setShowVideoRecorder(false)} 
          title="발송 전 영상 촬영" 
          className="max-w-2xl"
          hideCloseButton={true}
        >
          <div className="space-y-6">
            <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <p className="text-base text-gray-900 font-semibold mb-2">
                📹 발송 전 영상을 촬영해주세요
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                물건을 포장하기 전 상태를 촬영하세요. 여러 번 재촬영할 수 있습니다.
              </p>
            </div>
            
            <VideoRecorder
              onRecordComplete={handleVideoUploadComplete}
              purpose={currentStep === 'shipping' || currentStep === 'return' ? 'delivery' : 'return'}
            />
          </div>
        </Modal>
      )}

      {/* 송장 번호 등록 모달 */}
      {showTrackingModal && (
        <Modal
          isOpen={showTrackingModal}
          onClose={() => {
            setShowTrackingModal(false);
            setError(null);
            setTrackingNumber('');
            setCourier('');
          }}
          title="운송장 번호 등록"
          className="max-w-2xl"
          hideCloseButton={true}
        >
          <div className="space-y-6">
            {error && (
              <div className="bg-red-500/20 backdrop-blur-xl border border-red-400/50 rounded-3xl p-6 shadow-lg">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-red-900 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-base text-red-900 font-semibold leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <p className="text-base text-gray-900 font-semibold mb-2">📦 운송장 번호 등록</p>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                물건을 포장하고 택배사에 맡긴 후 운송장 번호를 입력하세요.
              </p>

              <div className="mb-4">
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  택배사 선택 <span className="text-red-500">*</span>
                </label>
                <select
                  value={courier}
                  onChange={(e) => {
                    setCourier(e.target.value);
                    setError(null);
                  }}
                  className="glass-input w-full text-base"
                  style={{ color: '#111827' }}
                >
                  <option value="" style={{ color: '#6B7280' }}>택배사를 선택하세요</option>
                  {courierOptions.map((c) => (
                    <option key={c.value} value={c.value} style={{ color: '#111827' }}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  운송장 번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => {
                    setTrackingNumber(e.target.value.replace(/\D/g, ''));
                    setError(null);
                  }}
                  placeholder="숫자만 입력하세요"
                  className="glass-input w-full text-base"
                  style={{ color: '#111827' }}
                />
                <p className="text-xs text-gray-600 mt-2">운송장 번호는 숫자만 입력 가능합니다. (최소 10자리)</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTrackingModal(false);
                    setError(null);
                    setTrackingNumber('');
                    setCourier('');
                  }}
                  className="flex-1 px-6 py-3 glass-button-ghost text-gray-900 rounded-2xl font-semibold text-base"
                >
                  취소
                </button>
                <button
                  onClick={handleShipItem}
                  disabled={isLoading || !courier || !trackingNumber || trackingNumber.length < 10}
                  className="flex-1 px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '처리 중...' : '발송 완료'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 결제 모달 */}
      {showPaymentModal && paymentInfo && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          orderId={paymentInfo.orderId}
          amount={paymentInfo.totalAmount}
          orderName={paymentInfo.orderName || `${productData.title} 대여`}
          chatRoomId={chatRoomId}
          rentalHisId={transactionData?.rentalHisId}
          onSuccess={handlePaymentSuccess}
          onError={(error) => {
            console.error('결제 오류:', error);
            setError(error.message || '결제 처리 중 오류가 발생했습니다.');
          }}
        />
      )}

      {/* 취소 요청 모달 */}
      <CancelRequestModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        rentalData={transactionData}
        onSubmit={handleCancelRequest}
        isSubmitting={isCancelling}
      />
    </>
  );
};

export default TransactionProcessModal;
