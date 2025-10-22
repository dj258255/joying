/**
 * VideoRecorder Component
 * WebRTC 기반 영상 녹화 컴포넌트
 */

import React, { useState, useRef, useEffect } from 'react';
import { useVideoRecorder } from '../hooks/useVideoRecorder';

const VideoRecorder = ({ onRecordComplete, purpose = 'delivery' }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  
  const {
    isRecording,
    recordedBlob,
    recordingTime,
    startRecording,
    stopRecording,
    resetRecording
  } = useVideoRecorder();

  // 웹캠 접근
  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true
        });
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('카메라 접근 실패:', err);
        setError('카메라에 접근할 수 없습니다. 권한을 확인해주세요.');
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 녹화 시작
  const handleStartRecording = () => {
    if (stream) {
      startRecording(stream);
    }
  };

  // 녹화 완료
  const handleStopRecording = () => {
    stopRecording();
  };

  // 재촬영
  const handleRetake = () => {
    resetRecording();
  };

  // 업로드
  const handleUpload = () => {
    if (recordedBlob && onRecordComplete) {
      onRecordComplete(recordedBlob);
    }
  };

  // 시간 포맷팅
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const purposeText = {
    delivery: '수령 시 개봉 영상',
    return: '반납 시 개봉 영상'
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-red-700 font-medium">{error}</p>
        <p className="text-red-600 text-sm mt-2">
          브라우저 설정에서 카메라 권한을 허용해주세요
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div className="bg-primary-500 text-white p-4">
        <h3 className="text-lg font-semibold">{purposeText[purpose]}</h3>
        <p className="text-primary-100 text-sm mt-1">
          ⚠️ 물건의 모든 면을 천천히 촬영해주세요
        </p>
      </div>

      {/* 비디오 영역 */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-64 object-cover"
        />
        
        {/* 녹화 중 오버레이 */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center bg-red-500 text-white px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
            <span className="text-sm font-medium">REC {formatTime(recordingTime)}</span>
          </div>
        )}

        {/* 가이드 텍스트 */}
        {!isRecording && !recordedBlob && (
          <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
            <p className="text-sm">
              📦 택배 박스 외부 → 개봉 과정 → 물건 전체 → 손상 부위 (있다면)
            </p>
          </div>
        )}
      </div>

      {/* 컨트롤 버튼 */}
      <div className="p-4">
        {!recordedBlob ? (
          <div className="flex justify-center">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-semibold transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" />
                </svg>
                녹화 시작
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-full font-semibold transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="6" y="6" width="8" height="8" />
                </svg>
                녹화 완료
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 녹화 완료 메시지 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 font-medium text-center">
                ✅ 영상이 녹화되었습니다 ({formatTime(recordingTime)})
              </p>
            </div>

            {/* 버튼 그룹 */}
            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                재촬영
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                업로드
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 주의사항 */}
      <div className="bg-yellow-50 border-t border-yellow-200 p-4">
        <h4 className="font-medium text-yellow-800 mb-2">📋 촬영 가이드</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 최소 30초 이상 촬영해주세요</li>
          <li>• 물건의 앞, 뒤, 옆면을 모두 촬영해주세요</li>
          <li>• 손상이나 결함이 있다면 클로즈업으로 촬영해주세요</li>
          <li>• 부속품이 있다면 함께 촬영해주세요</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoRecorder;
