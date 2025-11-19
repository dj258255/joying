/**
 * ShippingModal Component
 * 판매자가 물품 발송 전 영상을 촬영할 때 사용하는 모달
 * - ReturnReceiveModal과 동일한 디자인 구조
 * - 영상 녹화만 처리
 * - 영상 업로드 후 채팅 메시지 전송하고 모달 닫기
 * - 송장 번호 등록은 별도로 처리 (TrackingNumberCard)
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
 * @param {Function} props.onVideoUploaded - 영상 업로드 완료 콜백 (videoUrl, sendMessage)
 * @param {Function} props.sendMessage - 채팅 메시지 전송 함수
 */
const ShippingModal = ({ isOpen, onClose, rentalHisId, onVideoUploaded, sendMessage }) => {
  // 상태 관리
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 영상 관련
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef(null);
  const streamRef = useRef(null);

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

  // 영상 업로드 및 완료 처리
  const handleVideoConfirm = async () => {
    if (!recordedVideoBlob || !rentalHisId) {
      setError('영상을 녹화해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      

      // 1. 파일 업로드
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

      

      // 2. 대여 이력에 영상 등록
      const videoResult = await rentalApi.uploadVideo(rentalHisId, {
        fileId: fileId,
        videoType: 'OWNER_SEND'
      });

      

      const videoUrl = videoResult.data?.videoUrl
        || videoResult.data?.url
        || videoResult.body?.videoUrl
        || videoResult.body?.url
        || uploadResult.body?.url
        || uploadResult.data?.url
        || null;

      // 3. 영상 목록에서 최신 URL 가져오기
      let finalVideoUrl = videoUrl;
      try {
        const videosResponse = await rentalApi.getVideos(rentalHisId);
        const videos = videosResponse?.data?.data?.videos
          || videosResponse?.data?.videos
          || videosResponse?.videos
          || videosResponse?.data
          || [];

        const ownerSendVideo = videos.find(
          v => v.videoType === 'OWNER_SEND' || v.type === 'OWNER_SEND'
        );

        if (ownerSendVideo) {
          finalVideoUrl = ownerSendVideo.fileUrl
            || ownerSendVideo.videoUrl
            || ownerSendVideo.url
            || ownerSendVideo.filePath
            || videoUrl;
        }
      } catch (err) {
        
      }

      

      // 4. 채팅방에 영상 촬영 완료 메시지 전송
      if (sendMessage) {
        const messageContent = `📹 발송 전 영상을 촬영했습니다!\n\n${finalVideoUrl ? `[동영상 보기](${finalVideoUrl})` : ''}\n\nrentalHisId:${rentalHisId}\nMESSAGE_TYPE:SHIPPING_VIDEO_UPLOADED`;
        await sendMessage({
          type: 'TEXT',
          content: messageContent
        });
        
      }

      // 5. 송장 번호 등록 안내 메시지 전송
      if (sendMessage) {
        const trackingMessageContent = `운송장 번호를 등록해주세요.\n\n영상 촬영이 완료되었습니다. 물건을 포장한 후 운송장 번호를 등록해주세요.\n\nrentalHisId:${rentalHisId}\nMESSAGE_TYPE:TRACKING_NUMBER_REGISTRATION`;
        setTimeout(async () => {
          await sendMessage({
            type: 'TEXT',
            content: trackingMessageContent
          });
          
        }, 500);
      }

      // 6. 부모 컴포넌트에 완료 알림
      if (onVideoUploaded) {
        onVideoUploaded({
          videoUrl: finalVideoUrl,
          rentalHisId: rentalHisId
        });
      }

      // 7. 모달 닫기
      onClose();
    } catch (err) {
      
      
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

    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);
    setError(null);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="발송 전 영상 촬영" className="max-w-2xl" hideCloseButton={true}>
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Step 1: 영상 녹화 */}
        <div className="space-y-6">
          <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
            <p className="text-base text-gray-900 font-semibold mb-2">
              📹 발송 전 물건 상태를 영상으로 촬영해주세요
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
      </div>
    </Modal>
  );
};

export default ShippingModal;
