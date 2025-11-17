/**
 * ReturnModal Component
 * 구매자가 물품 반납할 때 사용하는 모달
 * - 영상 녹화 (반납 전 물건 상태)
 * - 운송장 번호 입력
 * - 반납 완료 처리
 */

import React, { useState, useRef } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import CourierSelect from '../../../shared/components/CourierSelect';
import ErrorAlert from '../../../shared/components/ErrorAlert';
import { fileApi } from '../../../shared/api/fileApi';
import { rentalApi } from '../api/rentalApi';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {number} props.rentalHisId - 대여 이력 ID
 * @param {Function} props.onReturnComplete - 반납 완료 콜백 (videoUrl, trackingNo, courier)
 */
const ReturnModal = ({ isOpen, onClose, rentalHisId, onReturnComplete }) => {
  // 상태 관리
  const [currentStep, setCurrentStep] = useState('video'); // video, tracking, complete
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 영상 관련
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // 운송장 정보
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  // 모달이 열릴 때 기존 영상 확인
  React.useEffect(() => {
    const checkExistingVideo = async () => {
      if (!isOpen || !rentalHisId) return;

      try {
        console.log('[ReturnModal] 기존 영상 확인 중...');
        const response = await rentalApi.getRentalDetail(rentalHisId);
        console.log('[ReturnModal] API 응답 전체:', response);

        const rentalData = response.data || response.body || response;
        console.log('[ReturnModal] 렌탈 데이터:', rentalData);

        // RENTER_RETURN 영상이 이미 있는지 확인 (여러 경로 시도)
        const videos = rentalData.rentalVideos
          || rentalData.videos
          || rentalData.rentalVideoList
          || [];

        console.log('[ReturnModal] 영상 목록:', videos);

        const renterReturnVideo = videos.find(
          video => video.videoType === 'RENTER_RETURN' || video.type === 'RENTER_RETURN'
        );

        console.log('[ReturnModal] RENTER_RETURN 영상:', renterReturnVideo);

        if (renterReturnVideo) {
          console.log('[ReturnModal] 기존 영상 발견. 운송장 입력 단계로 이동');
          setUploadedVideoUrl(renterReturnVideo.videoUrl || renterReturnVideo.url || renterReturnVideo.filePath);
          setCurrentStep('tracking');
        } else {
          console.log('[ReturnModal] 기존 영상 없음. 촬영 단계로 시작');
          setCurrentStep('video');
        }
      } catch (err) {
        console.error('[ReturnModal] 기존 영상 확인 실패:', err);
        // 에러가 나도 촬영 단계로 시작
        setCurrentStep('video');
      }
    };

    checkExistingVideo();
  }, [isOpen, rentalHisId]);

  // 영상 녹화 시작
  const startRecording = async () => {
    try {
      setError(null);

      // 모바일과 웹 모두 지원하는 getUserMedia
      const constraints = {
        video: {
          facingMode: 'environment', // 후면 카메라 (모바일)
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // 비디오 미리보기
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // MediaRecorder 설정
      const options = { mimeType: 'video/webm;codecs=vp9' };

      // 브라우저가 vp9를 지원하지 않으면 기본값 사용
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
        console.log('[ReturnModal] 녹화 중지 - 청크 수:', chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        console.log('[ReturnModal] Blob 생성 완료:', { size: blob.size, type: blob.type });

        const url = URL.createObjectURL(blob);
        console.log('[ReturnModal] Blob URL 생성:', url);

        setRecordedVideoBlob(blob);
        setRecordedVideoUrl(url);

        // 비디오 요소의 srcObject 제거 (녹화된 영상 재생을 위해)
        if (videoRef.current) {
          console.log('[ReturnModal] videoRef srcObject 제거');
          videoRef.current.srcObject = null;
        }

        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
          console.log('[ReturnModal] 스트림 정리 완료');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('[ReturnModal] 영상 녹화 시작 실패:', err);
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

      console.log('[ReturnModal] 영상 업로드 시작');

      // 1. 파일 업로드 (fileApi)
      const uploadResult = await fileApi.uploadFile(recordedVideoBlob);
      console.log('[ReturnModal] 파일 업로드 응답:', uploadResult);
      console.log('[ReturnModal] body 내용:', uploadResult.body);

      // fileId 추출 (여러 경로 시도)
      const fileId = uploadResult.body?.fileId
        || uploadResult.body?.data?.fileId
        || uploadResult.body?.id
        || uploadResult.data?.fileId
        || uploadResult.data?.data?.fileId
        || uploadResult.fileId
        || uploadResult.data?.id;

      if (!fileId) {
        console.error('[ReturnModal] fileId를 찾을 수 없음. 전체 응답:', uploadResult);
        console.error('[ReturnModal] body:', uploadResult.body);
        throw new Error('파일 업로드 응답에서 fileId를 찾을 수 없습니다.');
      }

      console.log('[ReturnModal] 파일 업로드 성공. fileId:', fileId);

      // 2. 대여 이력에 영상 등록 (rentalApi)
      const videoResult = await rentalApi.uploadVideo(rentalHisId, {
        fileId: fileId,
        videoType: 'RENTER_RETURN' // 구매자 반납 영상
      });

      console.log('[ReturnModal] 영상 등록 성공:', videoResult);

      // videoUrl 추출 (여러 경로 시도)
      const videoUrl = videoResult.data?.videoUrl
        || videoResult.data?.url
        || videoResult.body?.videoUrl
        || videoResult.body?.url
        || uploadResult.body?.url
        || uploadResult.data?.url
        || null;

      console.log('[ReturnModal] 추출된 videoUrl:', videoUrl);
      setUploadedVideoUrl(videoUrl);
      setCurrentStep('tracking');
    } catch (err) {
      console.error('[ReturnModal] 영상 업로드 실패:', err);
      setError(err.response?.data?.message || err.message || '영상 업로드에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 반납 완료 처리
  const handleReturnComplete = async () => {
    if (!courier || !trackingNumber) {
      setError('택배사와 운송장 번호를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[ReturnModal] 반납 처리 시작:', {
        rentalHisId,
        courier,
        trackingNumber
      });

      // 반납 API 호출
      await rentalApi.returnItem(rentalHisId, {
        carrierCode: courier,
        trackingNo: trackingNumber
      });

      console.log('[ReturnModal] 반납 완료');

      // 부모 컴포넌트에 완료 알림
      if (onReturnComplete) {
        onReturnComplete({
          videoUrl: uploadedVideoUrl,
          trackingNo: trackingNumber,
          courier: courier
        });
      }

      setCurrentStep('complete');
    } catch (err) {
      console.error('[ReturnModal] 반납 처리 실패:', err);
      setError(err.response?.data?.message || err.message || '반납 처리에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 완료 후 닫기
  const handleClose = () => {
    // 정리
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // 상태 초기화
    setCurrentStep('video');
    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);
    setUploadedVideoUrl(null);
    setCourier('');
    setTrackingNumber('');
    setError(null);

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="물품 반납하기" className="max-w-2xl">
      <div className="space-y-6">
        {/* 에러 메시지 */}
        {error && <ErrorAlert message={error} />}

        {/* Step 1: 영상 녹화 */}
        {currentStep === 'video' && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                📹 반납 전 물건 상태를 영상으로 촬영해주세요
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                물건의 상태를 명확히 보여주는 영상을 촬영하면 분쟁 시 증거로 사용됩니다
              </p>
            </div>

            {/* 비디오 프리뷰 */}
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
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
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  📹 촬영 시작
                </button>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  ⏹ 촬영 중지
                </button>
              )}

              {recordedVideoUrl && (
                <>
                  <button
                    onClick={retakeVideo}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    다시 촬영
                  </button>
                  <button
                    onClick={handleVideoConfirm}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? '업로드 중...' : '다음 단계'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: 운송장 번호 입력 */}
        {currentStep === 'tracking' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ 영상 업로드 완료!
              </p>
              <p className="text-xs text-green-600 mt-1">
                이제 운송장 번호를 입력하고 반납을 완료해주세요
              </p>
            </div>

            {/* 택배사 및 운송장 번호 입력 */}
            <CourierSelect
              courier={courier}
              onCourierChange={setCourier}
              trackingNumber={trackingNumber}
              onTrackingNumberChange={setTrackingNumber}
              type="return"
            />

            {/* 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('video')}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                이전
              </button>
              <button
                onClick={handleReturnComplete}
                disabled={isLoading || !courier || !trackingNumber}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '처리 중...' : '반납 완료'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 완료 */}
        {currentStep === 'complete' && (
          <div className="space-y-4">
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-green-800 font-bold text-lg">반납이 완료되었습니다!</p>
              <p className="text-green-600 text-sm mt-2">
                판매자가 물건을 확인할 때까지 기다려주세요
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">반납 정보</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div>택배사: {courier}</div>
                <div>운송장 번호: {trackingNumber}</div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReturnModal;


