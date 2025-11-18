/**
 * VideoListModal Component
 * 거래 영상 목록 조회 및 재생
 * - 판매자/구매자 모두 볼 수 있음
 * - 모든 단계의 영상을 시간순으로 표시
 */

import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import ErrorAlert from '../../../shared/components/ErrorAlert';
import { rentalApi } from '../api/rentalApi';

/**
 * 영상 타입별 라벨 및 설명
 */
const VIDEO_TYPE_INFO = {
  OWNER_SEND: {
    label: '📦 판매자 발송',
    description: '판매자가 물품을 발송하기 전 촬영한 영상',
    color: 'blue'
  },
  RENTER_RECEIVE: {
    label: '📬 구매자 수령',
    description: '구매자가 물품을 받고 개봉하면서 촬영한 영상',
    color: 'green'
  },
  RENTER_RETURN: {
    label: '📤 구매자 반납',
    description: '구매자가 물품을 반납하기 전 촬영한 영상',
    color: 'orange'
  },
  OWNER_RECEIVE: {
    label: '✅ 판매자 회수',
    description: '판매자가 반납품을 받고 확인하면서 촬영한 영상',
    color: 'purple'
  }
};

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {number} props.rentalHisId - 대여 이력 ID
 */
const VideoListModal = ({ isOpen, onClose, rentalHisId }) => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // 영상 목록 조회
  useEffect(() => {
    const loadVideos = async () => {
      if (!isOpen || !rentalHisId) return;

      try {
        setIsLoading(true);
        setError(null);

        console.log('[VideoListModal] 영상 목록 조회 시작:', rentalHisId);

        const response = await rentalApi.getVideos(rentalHisId);
        console.log('[VideoListModal] API 응답:', response);

        // 응답 구조 확인: VideoListResponse { videos: List<VideoResponse> }
        // VideoResponse { fileUrl: String, ... }
        const videoList = response?.data?.data?.videos
          || response?.data?.videos
          || response?.videos
          || response?.data?.rentalVideos
          || response?.data
          || [];

        console.log('[VideoListModal] 추출된 영상 목록:', videoList);

        // 배열인지 확인
        if (!Array.isArray(videoList)) {
          console.warn('[VideoListModal] 영상 목록이 배열이 아님:', videoList);
          setVideos([]);
          return;
        }

        // 시간순 정렬 (최신순)
        const sortedVideos = videoList.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.uploadedAt || 0);
          const dateB = new Date(b.createdAt || b.uploadedAt || 0);
          return dateB - dateA;
        });

        setVideos(sortedVideos);

        // 영상이 있으면 첫 번째 영상 자동 선택
        if (sortedVideos.length > 0) {
          setSelectedVideo(sortedVideos[0]);
        }
      } catch (err) {
        console.error('[VideoListModal] 영상 목록 조회 실패:', err);
        setError(err.response?.data?.message || err.message || '영상 목록을 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadVideos();
  }, [isOpen, rentalHisId]);

  // 모달 닫기
  const handleClose = () => {
    setSelectedVideo(null);
    setVideos([]);
    setError(null);
    onClose();
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return '날짜 정보 없음';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="거래 영상 보기" className="max-w-4xl">
      <div className="space-y-4 p-1">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* 로딩 중 */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-900 font-medium">영상을 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 영상이 없을 때 */}
        {!isLoading && videos.length === 0 && (
          <div className="text-center py-12 p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">
            <div className="w-16 h-16 bg-gray-900/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold mb-2">아직 촬영된 영상이 없습니다</p>
            <p className="text-gray-600 text-sm">거래 진행 중에 영상이 추가됩니다</p>
          </div>
        )}

        {/* 영상이 있을 때 */}
        {!isLoading && videos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 왼쪽: 영상 목록 */}
            <div className="lg:col-span-1 space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">영상 목록 ({videos.length}개)</h3>
              {videos.map((video, index) => {
                const videoType = video.videoType || video.type;
                const info = VIDEO_TYPE_INFO[videoType] || {
                  label: '📹 영상',
                  description: '거래 영상',
                  color: 'blue'
                };

                const isSelected = selectedVideo?.rentalVideoId === video.rentalVideoId 
                  || selectedVideo?.videoId === video.videoId
                  || selectedVideo?.id === video.id;

                return (
                  <button
                    key={video.rentalVideoId || video.videoId || video.id || index}
                    onClick={() => setSelectedVideo(video)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'bg-white/80 backdrop-blur-md border-gray-900 shadow-lg'
                        : 'bg-white/60 backdrop-blur-sm border-white/30 hover:bg-white/70 hover:border-white/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-${info.color}-100/50 backdrop-blur-sm border border-${info.color}-200/50 flex items-center justify-center`}>
                        <svg className={`w-5 h-5 text-${info.color}-700`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{info.label}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {formatDate(video.uploadedAt || video.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 오른쪽: 선택된 영상 재생 */}
            <div className="lg:col-span-2">
              {selectedVideo ? (
                <div className="space-y-4">
                  {/* 영상 정보 */}
                  <div className="p-4 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {VIDEO_TYPE_INFO[selectedVideo.videoType || selectedVideo.type]?.label || '📹 영상'}
                    </h3>
                    <p className="text-sm text-gray-700 mb-2">
                      {VIDEO_TYPE_INFO[selectedVideo.videoType || selectedVideo.type]?.description || '거래 영상'}
                    </p>
                    <p className="text-xs text-gray-600">
                      촬영일: {formatDate(selectedVideo.uploadedAt || selectedVideo.createdAt)}
                    </p>
                  </div>

                  {/* 영상 플레이어 */}
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
                    <video
                      key={selectedVideo.fileUrl || selectedVideo.videoUrl || selectedVideo.url}
                      className="absolute inset-0 w-full h-full object-contain"
                      src={selectedVideo.fileUrl || selectedVideo.videoUrl || selectedVideo.url}
                      controls
                      playsInline
                      autoPlay
                    />
                  </div>

                  {/* 영상 다운로드 버튼 */}
                  <div className="flex gap-2">
                    {(() => {
                      // URL이 상대 경로인 경우 절대 경로로 변환
                      const videoUrl = selectedVideo.fileUrl || selectedVideo.videoUrl || selectedVideo.url;
                      const absoluteUrl = videoUrl?.startsWith('http') 
                        ? videoUrl 
                        : videoUrl?.startsWith('/')
                          ? `${window.location.origin}${videoUrl}`
                          : videoUrl;
                      
                      return (
                        <>
                          <a
                            href={absoluteUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-4 py-2 glass-button-ghost text-gray-900 rounded-lg font-medium transition-colors text-center"
                          >
                            💾 다운로드
                          </a>
                          <a
                            href={absoluteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-4 py-2 glass-button text-white rounded-lg font-medium transition-colors text-center"
                          >
                            🔗 새 창에서 열기
                          </a>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[300px] bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl">
                  <p className="text-gray-700 font-medium">왼쪽에서 영상을 선택해주세요</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 닫기 버튼 */}
        <div className="flex justify-end pt-4 border-t border-white/30">
          <button
            onClick={handleClose}
            className="px-6 py-2 glass-button text-white rounded-lg font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VideoListModal;