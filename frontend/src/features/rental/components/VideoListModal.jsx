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
    <Modal isOpen={isOpen} onClose={handleClose} title="거래 영상 보기" className="max-w-6xl" hideCloseButton={true}>
      <div className="space-y-4">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-lg">
            <p className="text-sm text-red-900 font-semibold">{error}</p>
          </div>
        )}

        {/* 로딩 중 */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-900 font-semibold text-base">영상을 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 영상이 없을 때 */}
        {!isLoading && videos.length === 0 && (
          <div className="text-center py-16 p-8 bg-gray-50 border-2 border-gray-200 rounded-2xl shadow-lg">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-900 font-bold text-lg mb-2">아직 촬영된 영상이 없습니다</p>
            <p className="text-gray-600 text-sm">거래 진행 중에 영상이 추가됩니다</p>
          </div>
        )}

        {/* 영상이 있을 때 */}
        {!isLoading && videos.length > 0 && (
          <div className="grid grid-cols-12 gap-6">
            {/* 왼쪽: 영상 목록 (4 columns) */}
            <div className="col-span-4 space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              <div className="sticky top-0 bg-white z-10 pb-3 border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  영상 목록 ({videos.length}개)
                </h3>
              </div>
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
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all transform hover:scale-[1.02] ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 shadow-xl text-white'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-blue-300 shadow-md text-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-blue-50'}`}>
                        <div className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                          {info.icon || <VideoIcon />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>{info.label}</p>
                        <p className={`text-xs leading-relaxed line-clamp-2 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                          {info.description}
                        </p>
                        <p className={`text-xs mt-2 pt-2 border-t ${isSelected ? 'border-white/20 text-blue-100' : 'border-gray-200 text-gray-500'}`}>
                          {formatDate(video.uploadedAt || video.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 오른쪽: 선택된 영상 재생 (8 columns) */}
            <div className="col-span-8">
              {selectedVideo ? (
                <div className="space-y-4">
                  {/* 영상 정보 */}
                  <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-lg">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 text-blue-600 w-8 h-8 flex items-center justify-center">
                        {VIDEO_TYPE_INFO[selectedVideo.videoType || selectedVideo.type]?.icon || <VideoIcon />}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {VIDEO_TYPE_INFO[selectedVideo.videoType || selectedVideo.type]?.label || '영상'}
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {VIDEO_TYPE_INFO[selectedVideo.videoType || selectedVideo.type]?.description || '거래 영상'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-blue-200">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        촬영일: <span className="font-bold text-gray-900">{formatDate(selectedVideo.uploadedAt || selectedVideo.createdAt)}</span>
                      </p>
                    </div>
                  </div>

                  {/* 영상 플레이어 */}
                  <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-200">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
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
                  <div className="flex gap-3">
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
                            className="flex-1 px-5 py-3 bg-white border-2 border-gray-300 text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-50 hover:border-gray-400 transition-all text-center flex items-center justify-center gap-2 shadow-md"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>다운로드</span>
                          </a>
                          <a
                            href={absoluteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all text-center flex items-center justify-center gap-2 shadow-md"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="flex items-center justify-center h-full min-h-[500px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl shadow-lg">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-900 font-bold text-lg mb-2">영상을 선택해주세요</p>
                    <p className="text-gray-600 text-sm">왼쪽 목록에서 영상을 선택하면 재생됩니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 닫기 버튼 */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg"
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VideoListModal;