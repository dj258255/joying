import React, { useEffect, useState } from 'react';

const HashtagFilter = ({ hashtags: searchHashtags = [], onHashtagSelect, selectedHashtags = [] }) => {
  // 더미 해시태그 데이터 (실제로는 API에서 가져와야 함)
  const [hashtags, setHashtags] = useState([]);

  useEffect(() => {
    if (searchHashtags && searchHashtags.length > 0) {
      setHashtags(searchHashtags);
    } else {
      // 백업용 더미 데이터
      setHashtags([
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
      ]);
    }
  }, [searchHashtags]);

  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleHashtagClick = (hashtag) => {
    // 이미 선택된 태그인지 확인
    const isSelected = selectedHashtags.some(h => h.id === hashtag.id);
    // 선택된 태그면 제거(true), 아니면 추가(false)
    onHashtagSelect(hashtag, isSelected);
  };

  const handleRemoveHashtag = (hashtagId) => {
    onHashtagSelect(hashtags.find(h => h.id === hashtagId), true);
  };

  // 검색 필터링
  const filteredHashtags = (hashtags ?? [])
    .filter((h) => h && (typeof h === 'string' || typeof h.name === 'string'))
    .filter((h) => {
      const name = typeof h === 'string' ? h : h.name;
      return name?.toLowerCase().includes(searchQuery?.toLowerCase?.() || '');
    });

  // 표시할 해시태그 결정
  const displayHashtags = showAll ? filteredHashtags : filteredHashtags.slice(0, 20);

  return (
    <div className="space-y-3">
      {/* 헤더 - 검색창과 전체보기 버튼 */}
      <div className="flex items-center gap-2">
        {/* 해시태그 검색 */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="해시태그 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        
        {/* 전체보기 버튼 */}
        {hashtags.length > 20 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm font-medium px-3 py-2 text-gray-900 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
          >
            {showAll ? '간략히' : '전체보기'}
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
          // ✅ 해시태그가 없을 때는 높이를 0으로
          minHeight: displayHashtags.length > 0 ? '60px' : '0',
          padding: displayHashtags.length > 0 ? '10px 0' : '0',
          overflowY: 'hidden',
          touchAction: 'pan-x',
          position: 'relative',
          zIndex: 1,
          transition: 'all 0.2s ease' // 부드럽게 줄어듦
        } : {
          overflowY: 'hidden',
          touchAction: 'manipulation',
          minHeight: displayHashtags.length > 0 ? '60px' : '0',
          padding: displayHashtags.length > 0 ? '10px 0' : '0',
          transition: 'all 0.2s ease'
        }}
        {...(!showAll && {
          onMouseDown: (e) => {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            e.stopPropagation();
            const container = e.currentTarget;
            const startX = e.pageX;
            const startScrollLeft = container.scrollLeft;
            let isDragging = false;
            const handleMouseMove = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const deltaX = startX - e.pageX;
              if (Math.abs(deltaX) > 3) isDragging = true;
              if (isDragging) container.scrollLeft = startScrollLeft + deltaX;
            };
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
              container.style.cursor = 'grab';
            };
            document.addEventListener('mousemove', handleMouseMove, { passive: false });
            document.addEventListener('mouseup', handleMouseUp, { passive: false });
            container.style.cursor = 'grabbing';
          },
          onTouchStart: (e) => {
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
              const deltaX = startX - e.touches[0].pageX;
              if (Math.abs(deltaX) > 3) isDragging = true;
              if (isDragging) container.scrollLeft = startScrollLeft + deltaX;
            };
            const handleTouchEnd = () => {
              document.removeEventListener('touchmove', handleTouchMove);
              document.removeEventListener('touchend', handleTouchEnd);
            };
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd, { passive: false });
          }
        })}
      >
        {displayHashtags.length > 0 ? (
          displayHashtags.map((hashtag) => {
            const isSelected = selectedHashtags.some(h => h.id === hashtag.id);
            return (
              <button
                key={hashtag.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleHashtagClick(hashtag);
                }}
                className={`${showAll ? 'w-full' : 'flex-shrink-0'} px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap select-none ${
                  isSelected
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{ userSelect: 'none', pointerEvents: 'auto' }}
              >
                #{hashtag.name}
              </button>
            );
          })
        ) : (
          // ✅ 완전히 비어 있을 때는 아무 것도 렌더링하지 않음
          null
        )}
      </div>

      {/* 선택된 해시태그 표시 - 하단으로 이동 */}
      {selectedHashtags.length > 0 && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {selectedHashtags.map((hashtag) => (
              <span
                key={hashtag.id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-900 text-xs font-medium rounded-full border border-gray-300"
              >
                #{hashtag.name}
                <button
                  onClick={() => handleRemoveHashtag(hashtag.id)}
                  className="text-gray-700 hover:text-black"
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
