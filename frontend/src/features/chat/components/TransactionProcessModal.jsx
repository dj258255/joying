/**
 * TransactionProcessModal Component
 * 통합 거래 프로세스 모달 - 모든 거래 단계를 하나의 모달에서 처리
 */

import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import ErrorAlert from '../../../shared/components/ErrorAlert';
import CourierSelect from '../../../shared/components/CourierSelect';
import { rentalApi } from '../../rental/api/rentalApi';
import { paymentApi } from '../../payment/api/paymentApi';
import { fileApi } from '../../../shared/api/fileApi';
import { useAuth } from '../../auth/contexts/AuthContext';
import DateRangeCalendar from '../../checkout/components/DateRangeCalendar';
import VideoRecorder from '../../video/components/VideoRecorder';
import ShippingStatusCard from '../../shipping/components/ShippingStatusCard';
import PaymentModal from '../../payment/components/PaymentModal';
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
  otherMemberId = null
}) => {
  const { user } = useAuth();

  // 상태 관리
  const [currentStep, setCurrentStep] = useState('create'); // create, payment_waiting, payment, shipping, delivery, receive, rental, return, complete
  const [transactionData, setTransactionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 거래 생성 폼 상태
  const [dateRange, setDateRange] = useState(null);
  const [rentMethod, setRentMethod] = useState('BOTH'); // BOTH, ONLY_OFFLINE, ONLY_ONLINE
  const [rentalFee, setRentalFee] = useState(productData?.price || 0);
  const [deposit, setDeposit] = useState(productData?.deposit || 0);
  const [requireVideo, setRequireVideo] = useState(true);

  // 운송장 정보
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');

  // 영상 녹화 상태
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [recordedVideos, setRecordedVideos] = useState([]);

  // 결제 모달
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);

  // 초기화: rentalData가 있으면 상태 복원
  useEffect(() => {
    if (rentalData) {
      setTransactionData(rentalData);
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
        setDateRange({
          start: new Date(requestedDateRange.start),
          end: new Date(requestedDateRange.end)
        });
      }
    }
  }, [rentalData, requestedDateRange, userRole]);

  // 현재 단계 결정
  const determineCurrentStep = (data) => {
    if (!data) {
      setCurrentStep('create');
      return;
    }

    const status = data.status || data.rentalStatus;

    switch(status) {
      case 'PENDING':
        // PENDING 상태: 구매자는 결제 확인 모달, 판매자는 대기
        setCurrentStep(userRole === 'buyer' ? 'payment_confirm' : 'payment_waiting');
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

      const rentalRequestData = {
        startRen: new Date(dateRange.start).toISOString(),
        endRen: new Date(dateRange.end).toISOString(),
        rentMethod: rentMethod,
        // 판매자가 거래를 생성하는 경우, 상대방(구매자)의 memberId를 renterId로 전달
        ...(userRole === 'seller' && otherMemberId ? { renterId: otherMemberId } : {})
      };

      // 대여 거래 생성
      const result = await rentalApi.createRentalReservation(productData.id || productData.productId, rentalRequestData);

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

      alert('거래가 생성되었습니다. 구매자가 결제할 때까지 기다려주세요.');
    } catch (err) {
      console.error('[TransactionProcessModal] 거래 생성 실패:', err);
      setError(err.response?.data?.message || err.message || '거래 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 결제 진행 (구매자)
  const handleProceedPayment = () => {
    if (!transactionData || !transactionData.payment) {
      setError('결제 정보를 찾을 수 없습니다.');
      return;
    }

    setPaymentInfo(transactionData.payment);
    setShowPaymentModal(true);
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
      setError(err.response?.data?.message || err.message || '거래 취소에 실패했습니다.');
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

      // 채팅방에 결제 완료 메시지 전송
      if (sendMessage) {
        const messageContent = `✅ 결제 완료\n\n상품: ${productData.title || productData.name}\n결제 금액: ${amount.toLocaleString()}원\n\n판매자가 물건을 발송할 때까지 기다려주세요!\n\nrentalHisId:${transactionData.rentalHisId}`;

        await sendMessage({
          type: 'TEXT',
          content: messageContent
        });
      }

      setShowPaymentModal(false);
      setCurrentStep('delivery');

      alert('결제가 완료되었습니다. 판매자가 물건을 발송할 때까지 기다려주세요.');
    } catch (err) {
      console.error('[TransactionProcessModal] 결제 승인 실패:', err);
      setError(err.response?.data?.message || err.message || '결제 승인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 대화가 더 필요해요 (거래 재협상)
  const handleNeedMoreTalk = () => {
    onClose();
    alert('판매자와 대화를 통해 거래 조건을 조율해주세요. 조율이 완료되면 판매자가 새로운 거래를 생성할 수 있습니다.');
  };

  // 발송 처리 (판매자)
  const handleShipItem = async () => {
    if (!trackingNumber || !courier) {
      setError('택배사와 운송장 번호를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await rentalApi.shipItem(transactionData.rentalHisId, {
        carrierCode: courier,
        trackingNo: trackingNumber
      });

      // 영상이 필요한 경우 영상 녹화로 이동
      if (requireVideo) {
        setShowVideoRecorder(true);
      } else {
        setCurrentStep('delivery');
        alert('발송 처리가 완료되었습니다.');
      }
    } catch (err) {
      console.error('[TransactionProcessModal] 발송 처리 실패:', err);
      setError(err.response?.data?.message || err.message || '발송 처리에 실패했습니다.');
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
      const fileId = uploadResult.data.fileId;

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
      setRecordedVideos([...recordedVideos, uploadResult.data.url]);

      if (currentStep === 'shipping') {
        setCurrentStep('delivery');
        alert('영상 업로드가 완료되었습니다. 구매자가 상품을 수령할 때까지 기다려주세요.');
      } else if (currentStep === 'receive') {
        setCurrentStep('rental');
        alert('대여가 시작되었습니다.');
      } else if (currentStep === 'return') {
        alert('반납 영상 업로드가 완료되었습니다.');
      }
    } catch (err) {
      console.error('[TransactionProcessModal] 영상 업로드 실패:', err);
      setError(err.response?.data?.message || err.message || '영상 업로드에 실패했습니다.');
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
      setError(err.response?.data?.message || err.message || '수령 확인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 반납 처리
  const handleReturnItem = async () => {
    if (!trackingNumber || !courier) {
      setError('택배사와 운송장 번호를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await rentalApi.returnItem(transactionData.rentalHisId, {
        carrierCode: courier,
        trackingNo: trackingNumber
      });

      if (requireVideo) {
        setShowVideoRecorder(true);
      } else {
        setCurrentStep('return');
        alert('반납 처리가 완료되었습니다.');
      }
    } catch (err) {
      console.error('[TransactionProcessModal] 반납 처리 실패:', err);
      setError(err.response?.data?.message || err.message || '반납 처리에 실패했습니다.');
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
      alert('거래가 완료되었습니다.');
    } catch (err) {
      console.error('[TransactionProcessModal] 회수 확인 실패:', err);
      setError(err.response?.data?.message || err.message || '회수 확인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 거래 취소 요청
  const [cancelReason, setCancelReason] = useState('');
  const [depositDistribution, setDepositDistribution] = useState(50);

  const handleRequestCancel = async () => {
    if (!cancelReason) {
      setError('취소 사유를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 보증금 총액 계산 (transactionData에서 가져오기)
      const totalDeposit = transactionData.deposit || deposit || 0;
      const depositOwnerAmt = Math.floor(totalDeposit * depositDistribution / 100);
      const depositRenterAmt = totalDeposit - depositOwnerAmt;

      await rentalApi.createCancelRequest(transactionData.rentalHisId, {
        reason: cancelReason,
        depositOwnerAmt: depositOwnerAmt,
        depositRenterAmt: depositRenterAmt
      });

      alert('취소 요청이 전송되었습니다. 상대방의 응답을 기다려주세요.');
      onClose();
    } catch (err) {
      console.error('[TransactionProcessModal] 취소 요청 실패:', err);
      setError(err.response?.data?.message || err.message || '취소 요청에 실패했습니다.');
    } finally {
      setIsLoading(false);
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

  // 렌더링
  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen && !showVideoRecorder} onClose={onClose} title={getModalTitle()} className="max-w-2xl">
        <div className="space-y-6">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 거래 없음 안내 (구매자) */}
          {currentStep === 'no_transaction' && userRole === 'buyer' && (
            <div className="space-y-4">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-blue-800 font-bold text-lg mb-2">아직 거래가 생성되지 않았습니다</p>
                <p className="text-blue-600 text-sm">판매자가 거래를 생성할 때까지 기다려주세요.</p>
                <p className="text-blue-600 text-sm mt-2">채팅 하단의 "대여 요청하기" 버튼으로 대여를 요청할 수 있습니다.</p>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                닫기
              </button>
            </div>
          )}

          {/* 거래 생성 단계 (판매자) */}
          {currentStep === 'create' && userRole === 'seller' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  대여 기간 선택 *
                </label>
                <DateRangeCalendar
                  onDateRangeChange={setDateRange}
                  disabledDates={unavailableDates}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    대여료 (1일) *
                  </label>
                  <input
                    type="number"
                    value={rentalFee}
                    onChange={(e) => setRentalFee(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="대여료 입력"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보증금 *
                  </label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={(e) => setDeposit(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="보증금 입력"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  거래 방법 *
                </label>
                <div className="space-y-2">
                  {['ONLY_ONLINE', 'ONLY_OFFLINE', 'BOTH'].map((method) => (
                    <label key={method} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="rentMethod"
                        value={method}
                        checked={rentMethod === method}
                        onChange={(e) => setRentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {method === 'ONLY_ONLINE' ? '택배거래' : method === 'ONLY_OFFLINE' ? '직거래' : '둘 다 가능'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {method === 'ONLY_ONLINE' ? '택배로 배송받습니다' :
                           method === 'ONLY_OFFLINE' ? '직접 만나서 받습니다' : '택배거래 또는 직거래 둘 다 가능합니다'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="requireVideo"
                  checked={requireVideo}
                  onChange={(e) => setRequireVideo(e.target.checked)}
                  className="mr-3"
                />
                <label htmlFor="requireVideo" className="text-sm text-blue-800">
                  거래 시 영상 녹화 필수
                </label>
              </div>

              {dateRange && dateRange.start && dateRange.end && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">거래 요약</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>대여 기간: {Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1}일</div>
                    <div>대여료: {rentalFee.toLocaleString()}원 x {Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1}일</div>
                    <div>보증금: {deposit.toLocaleString()}원</div>
                    <div className="pt-2 border-t font-medium text-lg">
                      총 결제 금액: {((rentalFee * (Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1)) + deposit).toLocaleString()}원
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateTransaction}
                  disabled={isLoading || !dateRange}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? '생성 중...' : '거래 생성하기'}
                </button>
              </div>
            </div>
          )}

          {/* 결제 확인 단계 (구매자 - PENDING 상태) */}
          {currentStep === 'payment_confirm' && userRole === 'buyer' && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">💳 판매자가 거래를 생성했습니다</p>
                <p className="text-yellow-600 text-sm mt-1">결제를 진행하거나 거래를 취소할 수 있습니다</p>
              </div>

              {transactionData && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">거래 정보</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>상품: {productData.title || productData.name}</div>
                    <div>
                      대여 기간: {new Date(transactionData.startRen).toLocaleDateString('ko-KR')} ~ {new Date(transactionData.endRen).toLocaleDateString('ko-KR')}
                    </div>
                    <div>
                      일수: {Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24)) + 1}일
                    </div>
                    <div className="pt-2 border-t font-medium text-lg">
                      결제 금액: {transactionData.payment?.totalAmount?.toLocaleString() || 0}원
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCancelTransaction}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {isLoading ? '취소 중...' : '거래 취소하기'}
                </button>
                <button
                  onClick={handleProceedPayment}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  결제하러 가기
                </button>
              </div>
            </div>
          )}

          {/* 결제 대기 단계 (구매자) */}
          {currentStep === 'payment_waiting' && userRole === 'buyer' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">판매자가 거래를 생성했습니다</p>
                <p className="text-blue-600 text-sm mt-1">결제를 진행하거나 조건이 맞지 않으면 판매자와 대화를 더 진행해주세요</p>
              </div>

              {transactionData && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">거래 정보</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>상품: {productData.title || productData.name}</div>
                    <div>대여 기간: {Math.ceil((new Date(transactionData.endRen) - new Date(transactionData.startRen)) / (1000 * 60 * 60 * 24))}일</div>
                    <div className="pt-2 border-t font-medium text-lg">
                      결제 금액: {transactionData.payment?.totalAmount?.toLocaleString() || 0}원
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleNeedMoreTalk}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  대화가 더 필요해요
                </button>
                <button
                  onClick={handleProceedPayment}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  결제하러 가기
                </button>
              </div>
            </div>
          )}

          {/* 결제 대기 단계 (판매자) */}
          {currentStep === 'payment_waiting' && userRole === 'seller' && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <p className="text-yellow-800 font-medium">구매자의 결제를 기다리는 중...</p>
                <p className="text-yellow-600 text-sm mt-1">구매자가 결제를 완료하면 알림을 받게 됩니다</p>
              </div>

              {transactionData && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">생성된 거래 정보</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>주문번호: {transactionData.payment?.orderId}</div>
                    <div>결제 금액: {transactionData.payment?.totalAmount?.toLocaleString() || 0}원</div>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                닫기
              </button>
            </div>
          )}

          {/* 발송 처리 단계 (판매자) */}
          {currentStep === 'shipping' && userRole === 'seller' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">✅ 결제가 완료되었습니다</p>
                <p className="text-green-600 text-sm mt-1">운송장 번호를 입력하고 물건을 발송해주세요</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  택배사 선택 *
                </label>
                <select
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">택배사를 선택하세요</option>
                  {courierOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  운송장 번호 *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="숫자만 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {requireVideo && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">📹 발송 전 물건 상태 영상을 촬영해야 합니다</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  나중에 하기
                </button>
                <button
                  onClick={handleShipItem}
                  disabled={isLoading || !courier || !trackingNumber}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? '처리 중...' : requireVideo ? '다음 (영상 촬영)' : '발송 완료'}
                </button>
              </div>
            </div>
          )}

          {/* 배송 추적 단계 (구매자) */}
          {currentStep === 'delivery' && userRole === 'buyer' && (
            <div className="space-y-4">
              <ShippingStatusCard
                trackingNumber={transactionData?.trackingNumber || trackingNumber}
                courier={transactionData?.courier || courier}
                status={transactionData?.shippingStatus || 'IN_TRANSIT'}
                type="outbound"
              />

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">물건이 도착하면 수령 확인을 진행해주세요</p>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                닫기
              </button>
            </div>
          )}

          {/* 수령 확인 단계 (구매자) */}
          {currentStep === 'receive' && userRole === 'buyer' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">📦 물건이 도착했나요?</p>
                <p className="text-green-600 text-sm mt-1">물건을 확인하고 대여를 시작하거나 문제가 있으면 취소할 수 있습니다</p>
              </div>

              {requireVideo && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">📹 개봉 영상을 촬영해야 합니다</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('cancel')}
                  className="flex-1 px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50"
                >
                  대여 취소
                </button>
                <button
                  onClick={handleConfirmReceive}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {requireVideo ? '영상 촬영하기' : '대여 시작'}
                </button>
              </div>
            </div>
          )}

          {/* 대여 중 단계 */}
          {currentStep === 'rental' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-800 font-medium">✅ 대여 중</p>
                <p className="text-green-600 text-sm mt-1">
                  {userRole === 'buyer' ? '대여 기간이 끝나면 반납해주세요' : '구매자가 반납할 때까지 기다려주세요'}
                </p>
              </div>

              {transactionData && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    반납하기
                  </button>
                )}
                <button
                  onClick={() => setCurrentStep('cancel')}
                  className="flex-1 px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50"
                >
                  거래 중단하기
                </button>
              </div>
            </div>
          )}

          {/* 반납 처리 단계 (구매자) */}
          {currentStep === 'return' && userRole === 'buyer' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">반납 처리</p>
                <p className="text-blue-600 text-sm mt-1">물건을 포장하고 운송장 번호를 입력해주세요</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  택배사 선택 *
                </label>
                <select
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">택배사를 선택하세요</option>
                  {courierOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  운송장 번호 *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="숫자만 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {requireVideo && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">📹 반납 전 물건 상태 영상을 촬영해야 합니다</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  나중에 하기
                </button>
                <button
                  onClick={handleReturnItem}
                  disabled={isLoading || !courier || !trackingNumber}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? '처리 중...' : requireVideo ? '영상 촬영하기' : '반납 완료'}
                </button>
              </div>
            </div>
          )}

          {/* 반납 확인 대기 단계 (판매자) */}
          {currentStep === 'return' && userRole === 'seller' && (
            <div className="space-y-4">
              <ShippingStatusCard
                trackingNumber={transactionData?.returnTrackingNumber || trackingNumber}
                courier={transactionData?.returnCourier || courier}
                status={transactionData?.returnShippingStatus || 'IN_TRANSIT'}
                type="return"
              />

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">물건이 도착하면 확인 후 거래를 완료해주세요</p>
              </div>

              <button
                onClick={handleConfirmReturn}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '처리 중...' : '회수 확인 및 거래 완료'}
              </button>
            </div>
          )}

          {/* 거래 완료 단계 */}
          {currentStep === 'complete' && (
            <div className="space-y-4">
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-green-800 font-bold text-lg">거래가 완료되었습니다!</p>
                <p className="text-green-600 text-sm mt-2">안전한 거래를 이용해주셔서 감사합니다</p>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                확인
              </button>
            </div>
          )}

          {/* 취소 처리 단계 */}
          {currentStep === 'cancel' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">거래 취소 요청</p>
                <p className="text-red-600 text-sm mt-1">취소 사유와 보증금 분배 비율을 입력해주세요</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  취소 사유 *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  placeholder="취소 사유를 상세히 입력해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  보증금 분배 비율 (내가 받을 비율: {depositDistribution}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={depositDistribution}
                  onChange={(e) => setDepositDistribution(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>나: {depositDistribution}%</span>
                  <span>상대방: {100 - depositDistribution}%</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(userRole === 'buyer' ? 'receive' : 'rental')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleRequestCancel}
                  disabled={isLoading || !cancelReason}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? '요청 중...' : '취소 요청하기'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 영상 녹화 모달 */}
      {showVideoRecorder && (
        <Modal isOpen={showVideoRecorder} onClose={() => setShowVideoRecorder(false)} title="영상 촬영" className="max-w-2xl">
          <VideoRecorder
            onRecordComplete={handleVideoUploadComplete}
            purpose={currentStep === 'shipping' || currentStep === 'return' ? 'delivery' : 'return'}
          />
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
          onSuccess={handlePaymentSuccess}
          onError={(error) => {
            console.error('결제 오류:', error);
            setError(error.message || '결제 처리 중 오류가 발생했습니다.');
          }}
        />
      )}
    </>
  );
};

export default TransactionProcessModal;
