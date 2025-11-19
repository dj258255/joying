/**
 * ReceiveModal Component
 * 구매자가 물품 수령 시 사용하는 모달
 * - 영상 녹화 (개봉 영상)
 * - 수령 확인 처리
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
 * @param {Function} props.onReceiveComplete - 수령 완료 콜백 (videoUrl)
 */
const ReceiveModal = ({ isOpen, onClose, rentalHisId, onReceiveComplete }) => {
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
        
        const videosResponse = await rentalApi.getVideos(rentalHisId);
        const videos = videosResponse.data || videosResponse.body || videosResponse || [];

        const renterReceiveVideo = Array.isArray(videos)
          ? videos.find(video => video.videoType === 'RENTER_RECEIVE' || video.type === 'RENTER_RECEIVE')
          : null;

        if (renterReceiveVideo) {
          
          setUploadedVideoUrl(renterReceiveVideo.videoUrl || renterReceiveVideo.url || renterReceiveVideo.filePath);
          setCurrentStep('confirm');
        } else {
          
          setCurrentStep('video');
        }
      } catch (err) {
        
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
        
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        

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

      

      // 1. 파일 업로드 (상태가 아직 SHIPPED일 때)
      const uploadResult = await fileApi.uploadFile(recordedVideoBlob);
      

      const fileId = uploadResult.body?.fileId
        || uploadResult.body?.data?.fileId
        || uploadResult.body?.id
        || uploadResult.data?.fileId
        || uploadResult.data?.data?.fileId
        || uploadResult.fileId
        || uploadResult.data?.id;

      if (!fileId) {
        
        throw new Error('파일 업로드 응답에서 fileId를 찾을 수 없습니다.');
      }

      

      // 2. 대여 이력에 영상 등록 (상태: SHIPPED)
      const videoResult = await rentalApi.uploadVideo(rentalHisId, {
        fileId: fileId,
        videoType: 'RENTER_RECEIVE' // 구매자 수령 영상
      });

      

      const videoUrl = videoResult.data?.videoUrl
        || videoResult.data?.url
        || videoResult.body?.videoUrl
        || videoResult.body?.url
        || uploadResult.body?.url
        || uploadResult.data?.url
        || null;

      setUploadedVideoUrl(videoUrl);

      // 3. 수령 확인 API 호출 (상태: SHIPPED → RENTING)
      
      await rentalApi.confirmReceive(rentalHisId);
      

      // 부모 컴포넌트에 완료 알림
      if (onReceiveComplete) {
        onReceiveComplete({
          videoUrl: videoUrl
        });
      }

      setCurrentStep('complete');
    } catch (err) {
      
      setError(err.response?.data?.message || err.message || '수령 확인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 수령 확인 처리
  const handleReceiveConfirm = async () => {
    try {
      setIsLoading(true);
      setError(null);

      

      // 수령 확인 API 호출
      await rentalApi.confirmReceive(rentalHisId);

      

      // 부모 컴포넌트에 완료 알림
      if (onReceiveComplete) {
        onReceiveComplete({
          videoUrl: uploadedVideoUrl
        });
      }

      setCurrentStep('complete');
    } catch (err) {
      
      setError(err.response?.data?.message || err.message || '수령 확인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
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
    <Modal isOpen={isOpen} onClose={handleClose} title="물품 수령 확인" className="max-w-2xl" hideCloseButton={true}>
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Step 1: 영상 녹화 */}
        {currentStep === 'video' && (
          <div className="space-y-6">
            <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <p className="text-base text-gray-900 font-semibold mb-2">
                📹 물품 개봉 영상을 촬영해주세요
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

        {/* Step 2: 수령 확인 */}
        {currentStep === 'confirm' && (
          <div className="space-y-6">
            <div className="p-6 bg-green-500/20 backdrop-blur-xl border border-green-400/50 rounded-3xl shadow-lg">
              <p className="text-base text-green-900 font-bold mb-2">
                ✅ 영상 업로드 완료!
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                물품 확인 후 수령을 확정해주세요
              </p>
            </div>

            <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <p className="text-base text-gray-900 font-semibold mb-3">💡 확인 사항</p>
              <ul className="text-sm text-gray-700 space-y-2 leading-relaxed">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>물품이 설명과 일치하는지 확인</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>손상되거나 파손된 부분이 없는지 확인</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>모든 구성품이 포함되어 있는지 확인</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('video')}
                className="flex-1 px-6 py-3 glass-button-ghost text-gray-900 rounded-2xl font-semibold text-base"
              >
                이전
              </button>
              <button
                onClick={handleReceiveConfirm}
                disabled={isLoading}
                className="flex-1 px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '처리 중...' : '수령 확인'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 완료 */}
        {currentStep === 'complete' && (
          <div className="space-y-6">
            <div className="p-8 bg-green-500/20 backdrop-blur-xl border border-green-400/50 rounded-3xl text-center shadow-lg">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-gray-900 font-bold text-xl mb-2">수령이 확인되었습니다!</p>
              <p className="text-gray-700 text-base leading-relaxed">
                이제 대여가 시작되었습니다
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

export default ReceiveModal;
