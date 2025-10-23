/**
 * useVideoRecorder Hook
 * WebRTC 영상 녹화 관리 훅
 */

import { useState, useRef, useCallback } from 'react';

export const useVideoRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // 녹화 시작
  const startRecording = useCallback(async (stream) => {
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9' // 또는 'video/mp4'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);
      setError(null);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setIsRecording(false);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('녹화 중 오류가 발생했습니다.');
        setIsRecording(false);
      };

      mediaRecorder.start(1000); // 1초마다 데이터 수집
      setIsRecording(true);

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('녹화 시작 실패:', err);
      setError('녹화를 시작할 수 없습니다.');
    }
  }, []);

  // 녹화 중지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  // 녹화 초기화
  const resetRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setError(null);
    chunksRef.current = [];
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  // Blob을 File 객체로 변환
  const getBlobAsFile = useCallback((filename = 'recorded-video.webm') => {
    if (!recordedBlob) return null;
    
    return new File([recordedBlob], filename, {
      type: recordedBlob.type,
      lastModified: Date.now()
    });
  }, [recordedBlob]);

  // 미리보기 URL 생성
  const getPreviewUrl = useCallback(() => {
    if (!recordedBlob) return null;
    return URL.createObjectURL(recordedBlob);
  }, [recordedBlob]);

  return {
    isRecording,
    recordedBlob,
    recordingTime,
    error,
    startRecording,
    stopRecording,
    resetRecording,
    getBlobAsFile,
    getPreviewUrl
  };
};
