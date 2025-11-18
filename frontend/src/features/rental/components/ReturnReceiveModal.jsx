/**
 * ReturnReceiveModal Component
 * 판매자가 반납품 수령 확인 시 사용하는 모달
 * - 영상 녹화 (반납품 수령 영상)
 * - 보증금 확인 및 정산 처리
 * - 거래 중단 옵션
 */

import React, { useState, useRef } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import ErrorAlert from '../../../shared/components/ErrorAlert';
import { fileApi } from '../../../shared/api/fileApi';
import { rentalApi } from '../api/rentalApi';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {number} props.rentalHisId - 대여 이력 ID
 * @param {Function} props.onConfirmComplete - 수령 확인 완료 콜백
 * @param {Function} props.onCancelRequest - 거래 중단 요청 콜백
 */
const ReturnReceiveModal = ({ isOpen, onClose, rentalHisId, onConfirmComplete, onCancelRequest }) => {
  // 상태 관리
  const [currentStep, setCurrentStep] = useState('video'); // video, confirm, complete
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 영상 관련
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef(null);
  const streamRef = useRef(null);

  // 기존 영상 확인
  React.useEffect(() => {
    const checkExistingVideo = async () => {
      if (!isOpen || !rentalHisId) return;

      try {
        console.log('[ReturnReceiveModal] 기존 영상 확인 중...');
        const videosResponse = await rentalApi.getVideos(rentalHisId);
        const videos = videosResponse.data || videosResponse.body || videosResponse || [];

        const lenderReceiveVideo = Array.isArray(videos)
          ? videos.find(video => video.videoType === 'OWNER_RECEIVE' || video.type === 'OWNER_RECEIVE')
          : null;

        if (lenderReceiveVideo) {
          console.log('[ReturnReceiveModal] 기존 수령 영상 발견. 확인 단계로 이동');
          setUploadedVideoUrl(lenderReceiveVideo.videoUrl || lenderReceiveVideo.url || lenderReceiveVideo.filePath);
          setCurrentStep('confirm');
        } else {
          console.log('[ReturnReceiveModal] 기존 영상 없음. 촬영 단계로 시작');
          setCurrentStep('video');
        }
      } catch (err) {
        console.error('[ReturnReceiveModal] 기존 영상 확인 실패:', err);
        setCurrentStep('video');
      }
    };

    checkExistingVideo();
  }, [isOpen, rentalHisId]);

  // 영상 녹화 시작
  const startRecording = async () => {
    try {
      setError(null);

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[ReturnReceiveModal] 녹화 중지 - 청크 수:', chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        console.log('[ReturnReceiveModal] Blob 생성 완료:', { size: blob.size, type: blob.type });

        const url = URL.createObjectURL(blob);
        setRecordedVideoBlob(blob);
        setRecordedVideoUrl(url);

        // 비디오 요소의 srcObject 제거
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('[ReturnReceiveModal] 영상 녹화 시작 실패:', err);
      setError('카메라 접근에 실패했습니다. 브라우저 설정을 확인해주세요.');
    }
  };

  // 영상 녹화 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 영상 다시 찍기
  const retakeVideo = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);
  };

  // 영상 업로드 및 다음 단계
  const handleVideoConfirm = async () => {
    if (!recordedVideoBlob) {
      setError('녹화된 영상이 없습니다.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[ReturnReceiveModal] 영상 업로드 시작');

      // 1. 파일 업로드
      const uploadResult = await fileApi.uploadFile(recordedVideoBlob);
      console.log('[ReturnReceiveModal] 파일 업로드 응답:', uploadResult);

      const fileId = uploadResult.body?.fileId
        || uploadResult.body?.data?.fileId
        || uploadResult.body?.id
        || uploadResult.data?.fileId
        || uploadResult.data?.data?.fileId
        || uploadResult.fileId
        || uploadResult.data?.id;

      if (!fileId) {
        console.error('[ReturnReceiveModal] fileId를 찾을 수 없음:', uploadResult);
        throw new Error('파일 업로드 응답에서 fileId를 찾을 수 없습니다.');
      }

      console.log('[ReturnReceiveModal] 파일 업로드 성공. fileId:', fileId);

      // 2. 대여 이력에 영상 등록
      const videoResult = await rentalApi.uploadVideo(rentalHisId, {
        fileId: fileId,
        videoType: 'OWNER_RECEIVE' // 판매자 수령 영상
      });

      console.log('[ReturnReceiveModal] 영상 등록 성공:', videoResult);

      const videoUrl = videoResult.data?.videoUrl
        || videoResult.data?.url
        || videoResult.body?.videoUrl
        || videoResult.body?.url
        || uploadResult.body?.url
        || uploadResult.data?.url
        || null;

      setUploadedVideoUrl(videoUrl);
      setCurrentStep('confirm');
    } catch (err) {
      console.error('[ReturnReceiveModal] 영상 업로드 실패:', err);
      setError(err.response?.data?.message || err.message || '영상 업로드에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 보증금 확인 및 정산 처리
  const handleConfirmReturn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[ReturnReceiveModal] 반납 수령 확인 및 정산 처리 시작:', rentalHisId);

      // 반납 수령 확인 API 호출 (정산 처리 포함)
      await rentalApi.confirmReturnReceive(rentalHisId);

      console.log('[ReturnReceiveModal] 반납 수령 확인 및 정산 완료');

      // 부모 컴포넌트에 완료 알림
      if (onConfirmComplete) {
        onConfirmComplete({
          videoUrl: uploadedVideoUrl
        });
      }

      setCurrentStep('complete');
    } catch (err) {
      console.error('[ReturnReceiveModal] 반납 수령 확인 실패:', err);
      setError(err.response?.data?.message || err.message || '반납 수령 확인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 거래 중단 요청
  const handleCancelRequest = () => {
    if (onCancelRequest) {
      onCancelRequest();
    }
    handleClose();
  };

  // 완료 후 닫기
  const handleClose = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setCurrentStep('video');
    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);
    setUploadedVideoUrl(null);
    setError(null);

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="반납 수령 확인" className="max-w-2xl" hideCloseButton={true}>
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Step 1: 영상 녹화 */}
        {currentStep === 'video' && (
          <div className="space-y-6">
            <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <p className="text-base text-gray-900 font-semibold mb-2">
                📹 반납품 수령 영상을 촬영해주세요
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                물품의 상태를 확인하고 촬영하면 분쟁 시 증거로 사용됩니다
              </p>
            </div>

            {/* 비디오 프리뷰 */}
            <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl" style={{ paddingTop: '56.25%' }}>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain"
                src={recordedVideoUrl}
                controls={!!recordedVideoUrl}
                playsInline
                autoPlay={!recordedVideoUrl}
                muted={!recordedVideoUrl}
              />

              {!isRecording && !recordedVideoUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm opacity-75">아래 버튼을 눌러 촬영을 시작하세요</p>
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  <span className="text-sm font-medium">녹화 중</span>
                </div>
              )}
            </div>

            {/* 녹화 버튼 */}
            <div className="flex gap-3">
              {!isRecording && !recordedVideoUrl && (
                <button
                  onClick={startRecording}
                  className="flex-1 px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base"
                >
                  📹 촬영 시작
                </button>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="flex-1 px-6 py-3 glass-button-danger text-white rounded-2xl font-semibold text-base"
                >
                  ⏹ 촬영 중지
                </button>
              )}

              {recordedVideoUrl && (
                <>
                  <button
                    onClick={retakeVideo}
                    className="flex-1 px-6 py-3 glass-button-ghost text-gray-900 rounded-2xl font-semibold text-base"
                  >
                    다시 촬영
                  </button>
                  <button
                    onClick={handleVideoConfirm}
                    disabled={isLoading}
                    className="flex-1 px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '업로드 중...' : '다음 단계'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: 보증금 확인 */}
        {currentStep === 'confirm' && (
          <div className="space-y-6">
            <div className="p-6 bg-green-500/20 backdrop-blur-xl border border-green-400/50 rounded-3xl shadow-lg">
              <p className="text-base text-green-900 font-bold mb-2">
                ✅ 영상 업로드 완료!
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                반납품을 확인하고 정산을 진행해주세요
              </p>
            </div>

            <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <p className="text-base text-gray-900 font-semibold mb-3">💡 확인 사항</p>
              <ul className="text-sm text-gray-700 space-y-2 leading-relaxed">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>물품이 대여 시와 동일한 상태인지 확인</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>손상되거나 파손된 부분이 있는지 확인</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>모든 구성품이 반납되었는지 확인</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <p className="text-base text-gray-900 font-semibold mb-3">⚠️ 선택 사항</p>
              <ul className="text-sm text-gray-700 space-y-2 leading-relaxed">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong className="text-gray-900">확인하기</strong>: 보증금을 그대로 반환하고 거래 완료</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong className="text-gray-900">거래 중단하기</strong>: 물품 손상 등으로 보증금 조정이 필요한 경우</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelRequest}
                className="flex-1 px-6 py-3 glass-button-danger text-white rounded-2xl font-semibold text-base"
              >
                거래 중단하기
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-green-600/90 backdrop-blur-sm border border-green-600/50 text-white rounded-2xl font-semibold text-base hover:bg-green-700/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '처리 중...' : '확인하기'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 완료 */}
        {currentStep === 'complete' && (
          <div className="space-y-6">
            <div className="p-8 bg-green-500/20 backdrop-blur-xl border border-green-400/50 rounded-3xl text-center shadow-lg">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-gray-900 font-bold text-xl mb-2">거래가 완료되었습니다!</p>
              <p className="text-gray-700 text-base leading-relaxed">
                정산이 완료되었습니다
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReturnReceiveModal;
