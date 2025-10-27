import React, { useState, useEffect } from 'react';

const HashtagFilter = ({ onHashtagSelect, selectedHashtags = [] }) => {
  const [hashtags, setHashtags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 더미 해시태그 데이터 (실제로는 API에서 가져와야 함)
  const dummyHashtags = [
    { id: 1, name: '게임', count: 45 },
    { id: 2, name: '캠핑', count: 38 },
    { id: 3, name: '스포츠', count: 32 },
    { id: 4, name: '음악', count: 28 },
    { id: 5, name: '요리', count: 25 },
    { id: 6, name: '독서', count: 22 },
    { id: 7, name: '영화', count: 20 },
    { id: 8, name: '여행', count: 18 },
    { id: 9, name: '공예', count: 15 },
    { id: 10, name: '운동', count: 12 },
    { id: 11, name: '드라마', count: 10 },
    { id: 12, name: '뷰티', count: 8 },
    { id: 13, name: '패션', count: 7 },
    { id: 14, name: '기술', count: 6 },
    { id: 15, name: '교육', count: 5 },
    { id: 16, name: '반려동물', count: 4 },
    { id: 17, name: '사진', count: 3 },
    { id: 18, name: '미술', count: 2 },
    { id: 19, name: '건강', count: 1 },
    { id: 20, name: '취미', count: 1 },
    { id: 21, name: '자전거', count: 35 },
    { id: 22, name: '등산', count: 30 },
    { id: 23, name: '수영', count: 25 },
    { id: 24, name: '요가', count: 20 },
    { id: 25, name: '필라테스', count: 18 },
    { id: 26, name: '볼링', count: 15 },
    { id: 27, name: '탁구', count: 12 },
    { id: 28, name: '배드민턴', count: 10 },
    { id: 29, name: '테니스', count: 8 },
    { id: 30, name: '골프', count: 6 },
    { id: 31, name: '축구', count: 5 },
    { id: 32, name: '농구', count: 4 },
    { id: 33, name: '배구', count: 3 },
    { id: 34, name: '야구', count: 2 },
    { id: 35, name: '헬스', count: 1 },
    { id: 36, name: '크로스핏', count: 1 },
    { id: 37, name: '마라톤', count: 1 },
    { id: 38, name: '트라이애슬론', count: 1 },
    { id: 39, name: '클라이밍', count: 1 },
    { id: 40, name: '서핑', count: 1 }
  ];

  useEffect(() => {
    // 해시태그 데이터 로드 시뮬레이션
    const loadHashtags = async () => {
      setIsLoading(true);
      // 실제로는 API 호출
      setTimeout(() => {
        setHashtags(dummyHashtags);
        setIsLoading(false);
      }, 500);
    };

    loadHashtags();
  }, []);

  const handleHashtagClick = (hashtag) => {
    onHashtagSelect(hashtag);
  };

  const handleRemoveHashtag = (hashtagId) => {
    onHashtagSelect(hashtags.find(h => h.id === hashtagId), true);
  };

  // 검색 필터링
  const filteredHashtags = hashtags.filter(hashtag => 
    hashtag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 표시할 해시태그 결정
  const displayHashtags = showAll ? filteredHashtags : filteredHashtags.slice(0, 20);

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl" style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)'
      }}>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="p-4 rounded-xl" 
      style={{
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 0 15px rgba(255, 255, 255, 0.5)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 헤더 - 검색창과 전체보기 버튼 */}
      <div className="flex items-center justify-between mb-4">
        {/* 해시태그 검색 */}
        <div className="flex-1 mr-4">
          <input
            type="text"
            placeholder="해시태그 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-sm text-gray-800 placeholder-gray-500 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2"
            style={{ 
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              '--tw-ring-color': 'rgb(59 130 246 / 0.3)'
            }}
          />
        </div>
        
        {/* 전체보기 버튼 */}
        {hashtags.length > 20 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white/20"
            style={{ color: 'rgb(59 130 246 / 1)' }}
          >
            {showAll ? '간략히' : '+전체보기'}
          </button>
        )}
      </div>

      {/* 해시태그 목록 */}
      <div 
        className={`${showAll ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2' : 'flex gap-2 overflow-x-auto pb-2'}`}
        style={!showAll ? { 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          cursor: 'grab',
          minHeight: '60px',
          padding: '10px 0',
          overflowY: 'hidden',
          touchAction: 'pan-x',
          position: 'relative',
          zIndex: 1
        } : {
          overflowY: 'hidden',
          touchAction: 'manipulation'
        }}
        onMouseDown={!showAll ? (e) => {
          // 버튼 클릭이 아닌 경우에만 드래그 시작
          if (e.target.tagName === 'BUTTON') return;
          
          e.preventDefault();
          e.stopPropagation();
          
          const container = e.currentTarget;
          const startX = e.pageX;
          const startScrollLeft = container.scrollLeft;
          let isDragging = false;
          let startTime = Date.now();
          
          const handleMouseMove = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const currentX = e.pageX;
            const deltaX = startX - currentX;
            const newScrollLeft = startScrollLeft + deltaX;
            
            // 3px 이상 움직이면 드래그로 인식
            if (Math.abs(deltaX) > 3) {
              isDragging = true;
            }
            
            if (isDragging) {
              container.scrollLeft = newScrollLeft;
            }
          };
          
          const handleMouseUp = (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            container.style.cursor = 'grab';
          };
          
          document.addEventListener('mousemove', handleMouseMove, { passive: false });
          document.addEventListener('mouseup', handleMouseUp, { passive: false });
          container.style.cursor = 'grabbing';
        } : undefined}
        onTouchStart={!showAll ? (e) => {
          if (e.target.tagName === 'BUTTON') return;
          
          e.preventDefault();
          e.stopPropagation();
          
          const container = e.currentTarget;
          const startX = e.touches[0].pageX;
          const startScrollLeft = container.scrollLeft;
          let isDragging = false;
          
          const handleTouchMove = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const currentX = e.touches[0].pageX;
            const deltaX = startX - currentX;
            const newScrollLeft = startScrollLeft + deltaX;
            
            if (Math.abs(deltaX) > 3) {
              isDragging = true;
            }
            
            if (isDragging) {
              container.scrollLeft = newScrollLeft;
            }
          };
          
          const handleTouchEnd = (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
          };
          
          document.addEventListener('touchmove', handleTouchMove, { passive: false });
          document.addEventListener('touchend', handleTouchEnd, { passive: false });
        } : undefined}
      >
        {displayHashtags.map((hashtag) => {
          const isSelected = selectedHashtags.some(h => h.id === hashtag.id);
          return (
            <button
              key={hashtag.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleHashtagClick(hashtag);
              }}
              className={`${showAll ? 'w-full' : 'flex-shrink-0'} px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap select-none ${
                isSelected
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-white/20 text-gray-700 hover:bg-white/30'
              }`}
              style={{ userSelect: 'none', pointerEvents: 'auto' }}
            >
              #{hashtag.name} ({hashtag.count})
            </button>
          );
        })}
      </div>

      {/* 선택된 해시태그 표시 - 하단으로 이동 */}
      {selectedHashtags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex flex-wrap gap-2">
            {selectedHashtags.map((hashtag) => (
              <span
                key={hashtag.id}
                className="inline-flex items-center px-3 py-1 bg-white/30 text-gray-800 text-sm rounded-full border border-white/40"
              >
                #{hashtag.name}
                <button
                  onClick={() => handleRemoveHashtag(hashtag.id)}
                  className="ml-2 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HashtagFilter;
