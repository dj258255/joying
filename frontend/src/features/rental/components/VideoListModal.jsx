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
    label: '발송 영상',
    description: '소유자가 물품을 발송하기 전 촬영한 영상',
    color: 'blue',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    )
  },
  RENTER_RECEIVE: {
    label: '수령 영상',
    description: '대여자가 물품을 받고 개봉하면서 촬영한 영상',
    color: 'green',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  RENTER_RETURN: {
    label: '반납 영상',
    description: '대여자가 물품을 반납하기 전 촬영한 영상',
    color: 'orange',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    )
  },
  OWNER_RECEIVE: {
    label: '회수 영상',
    description: '소유자가 반납품을 받고 확인하면서 촬영한 영상',
    color: 'purple',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  }
};

/**
 * 기본 비디오 아이콘
 */
const VideoIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

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
    <Modal isOpen={isOpen} onClose={handleClose} title="거래 영상 보기" className="!max-w-[256rem]" hideCloseButton={true}>
      <div className="space-y-4 lg:space-y-3">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-xl border border-red-400/50 rounded-3xl p-4 lg:p-3 shadow-lg">
            <p className="text-sm lg:text-xs text-red-900 font-semibold">{error}</p>
          </div>
        )}

        {/* 로딩 중 */}
        {isLoading && (
          <div className="flex items-center justify-center py-12 lg:py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 lg:h-10 lg:w-10 border-b-3 border-gray-900 mx-auto mb-3 lg:mb-2"></div>
              <p className="text-gray-900 font-semibold text-sm lg:text-xs">영상을 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 영상이 없을 때 */}
        {!isLoading && videos.length === 0 && (
          <div className="text-center py-12 lg:py-8 p-6 lg:p-4 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
            <div className="w-14 h-14 lg:w-12 lg:h-12 bg-gray-900/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-2">
              <svg className="w-7 h-7 lg:w-6 lg:h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold mb-1 lg:mb-0.5 text-sm lg:text-xs">아직 촬영된 영상이 없습니다</p>
            <p className="text-gray-600 text-xs lg:text-[10px]">거래 진행 중에 영상이 추가됩니다</p>
          </div>
        )}

        {/* 영상이 있을 때 */}
        {!isLoading && videos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-3">
            {/* 왼쪽: 영상 목록 */}
            <div className="lg:col-span-1 space-y-2 lg:space-y-1.5 max-h-[500px] lg:max-h-[80vh] overflow-y-auto scrollbar-hide">
              <h3 className="text-sm lg:text-xs font-bold text-gray-900 mb-3 lg:mb-2">영상 목록 ({videos.length}개)</h3>
              {videos.map((video, index) => {
                const videoType = video.videoType || video.type;
                const info = VIDEO_TYPE_INFO[videoType] || {
                  label: '영상',
                  description: '거래 영상',
                  color: 'blue',
                  icon: <VideoIcon />
                };

                const isSelected = selectedVideo?.rentalVideoId === video.rentalVideoId 
                  || selectedVideo?.videoId === video.videoId
                  || selectedVideo?.id === video.id;

                return (
                  <button
                    key={video.rentalVideoId || video.videoId || video.id || index}
                    onClick={() => setSelectedVideo(video)}
                    className={`w-full text-left p-3 lg:p-2 rounded-xl lg:rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'bg-gray-900/80 backdrop-blur-xl border-gray-900 shadow-xl text-white'
                        : 'bg-white/80 backdrop-blur-xl border-white/40 hover:bg-white/90 hover:border-gray-900/30 shadow-lg text-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-2 lg:gap-1.5">
                      <div className={`flex-shrink-0 w-10 h-10 lg:w-8 lg:h-8 rounded-lg lg:rounded-md bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center ${isSelected ? 'bg-white/30 text-white' : 'text-gray-900'}`}>
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-5 h-5 lg:w-4 lg:h-4 flex items-center justify-center">
                            {info.icon || <VideoIcon />}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm lg:text-xs font-bold truncate mb-0.5 ${isSelected ? 'text-white' : 'text-gray-900'}`}>{info.label}</p>
                        <p className={`text-xs lg:text-[10px] leading-relaxed ${isSelected ? 'text-gray-300' : 'text-gray-600'}`}>
                          {formatDate(video.uploadedAt || video.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 오른쪽: 선택된 영상 재생 */}
            <div className="lg:col-span-4">
              {selectedVideo ? (
                <div className="space-y-4 lg:space-y-2">
                  {/* 영상 정보 */}
                  <div className="p-4 lg:p-3 bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl lg:rounded-xl shadow-lg">
                    <div className="flex items-start gap-2 lg:gap-1.5 mb-3 lg:mb-2">
                      <div className="flex-shrink-0 text-gray-900 w-6 h-6 lg:w-5 lg:h-5 flex items-center justify-center">
                        {VIDEO_TYPE_INFO[selectedVideo.videoType || selectedVideo.type]?.icon || <VideoIcon />}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg lg:text-sm font-bold text-gray-900 mb-1 lg:mb-0.5">
                          {VIDEO_TYPE_INFO[selectedVideo.videoType || selectedVideo.type]?.label || '영상'}
                        </h3>
                        <p className="text-sm lg:text-xs text-gray-700 leading-relaxed">
                          {VIDEO_TYPE_INFO[selectedVideo.videoType || selectedVideo.type]?.description || '거래 영상'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-3 lg:pt-2 border-t border-white/30">
                      <p className="text-xs lg:text-[10px] text-gray-600">
                        촬영일: <span className="font-semibold text-gray-900">{formatDate(selectedVideo.uploadedAt || selectedVideo.createdAt)}</span>
                      </p>
                    </div>
                  </div>

                  {/* 영상 플레이어 */}
                  <div className="flex justify-center">
                    <div className="relative bg-black rounded-2xl lg:rounded-xl overflow-hidden shadow-2xl w-full max-w-[640px] lg:max-w-[560px] aspect-video">
                      <video
                        key={selectedVideo.fileUrl || selectedVideo.videoUrl || selectedVideo.url}
                        className="absolute inset-0 w-full h-full object-contain"
                        src={selectedVideo.fileUrl || selectedVideo.videoUrl || selectedVideo.url}
                        controls
                        playsInline
                        autoPlay
                      />
                    </div>
                  </div>

                  {/* 영상 다운로드 버튼 */}
                  <div className="flex gap-2 lg:gap-1.5">
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
                            className="flex-1 px-4 py-2.5 lg:px-3 lg:py-1.5 glass-button-ghost text-gray-900 rounded-xl lg:rounded-lg font-semibold text-sm lg:text-xs transition-colors text-center flex items-center justify-center gap-1.5 lg:gap-1"
                          >
                            <svg className="w-4 h-4 lg:w-3.5 lg:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>다운로드</span>
                          </a>
                          <a
                            href={absoluteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-4 py-2.5 lg:px-3 lg:py-1.5 glass-button text-white rounded-xl lg:rounded-lg font-semibold text-sm lg:text-xs transition-colors text-center flex items-center justify-center gap-1.5 lg:gap-1"
                          >
                            <svg className="w-4 h-4 lg:w-3.5 lg:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>새 창에서 열기</span>
                          </a>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px] lg:min-h-[300px] bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl lg:rounded-xl shadow-lg">
                  <div className="text-center">
                    <div className="w-16 h-16 lg:w-12 lg:h-12 bg-gray-900/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-2">
                      <svg className="w-8 h-8 lg:w-6 lg:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-900 font-bold text-base lg:text-sm mb-1 lg:mb-0.5">영상을 선택해주세요</p>
                    <p className="text-gray-600 text-sm lg:text-xs">왼쪽 목록에서 영상을 선택하면 재생됩니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 닫기 버튼 */}
        <div className="flex justify-end pt-3 lg:pt-2 border-t border-white/30">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 lg:px-4 lg:py-1.5 glass-button text-white rounded-xl lg:rounded-lg font-semibold text-sm lg:text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VideoListModal;