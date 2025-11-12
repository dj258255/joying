/**
 * ProductCard Component
 * 통일된 상품 카드 컴포넌트 - 토스/애플 스타일 글래스모피즘
 */

import React, { useState, useRef, useEffect } from 'react';

/**
 * @param {Object} props
 * @param {Object} props.product - 상품 정보
 * @param {Function} props.onClick - 카드 클릭 핸들러
 * @param {Function} props.onAction - 액션 버튼 핸들러 (레거시)
 * @param {Function} props.onEdit - 수정 핸들러
 * @param {Function} props.onDelete - 삭제 핸들러
 * @param {Function} props.onLike - 찜하기 핸들러
 * @param {boolean} props.isLiked - 찜하기 상태
 * @param {string} props.actionType - 액션 타입 ('edit', 'delete', 'unlike', 'view', 'menu')
 * @param {string} props.status - 상품 상태 ('available', 'unavailable', 'rented', 'completed')
 * @param {Object} props.stats - 통계 정보 (viewCount, likeCount, rentalCount)
 * @param {string} props.dateLabel - 날짜 라벨 (예: '등록일', '찜한 날짜', '대여일')
 * @param {string} props.dateValue - 날짜 값
 * @param {boolean} props.showStats - 통계 정보 표시 여부
 * @param {boolean} props.showDate - 날짜 정보 표시 여부
 */
const ProductCard = ({
  product,
  onClick,
  onAction,
  onEdit,
  onDelete,
  onLike,
  isLiked = false,
  actionType = 'view',
  status = 'available',
  stats = {},
  dateLabel = '',
  dateValue = '',
  showStats = false,
  showDate = false
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const getStatusConfig = (status) => {
    const configs = {
      available: { text: '대여 가능', className: 'glass-status-available' },
      unavailable: { text: '대여 불가', className: 'glass-status-unavailable' },
      rented: { text: '대여 중', className: 'glass-status-rented' },
      completed: { text: '완료', className: 'glass-status-completed' },
      pending: { text: '대기 중', className: 'glass-status-pending' }
    };
    return configs[status] || configs.available;
  };

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const getActionIcon = (actionType) => {
    const icons = {
      edit: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      delete: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      menu: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      ),
      unlike: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
      ),
      view: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    };
    return icons[actionType] || icons.view;
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onEdit) {
      onEdit();
    } else if (onAction) {
      onAction();
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onDelete) {
      onDelete();
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <div className="glass-product-card-new group" onClick={onClick}>
      {/* 메인 이미지 배경 */}
      <div className="glass-product-image-main">
        {product?.thumbnailUrl ? (
          <img
            src={product.thumbnailUrl}
            alt={product.title || product.content}
            className="glass-product-image-bg"
          />
        ) : (
          <div className="glass-product-image-placeholder-bg">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* 그라데이션 오버레이 */}
        <div className="glass-product-gradient-overlay"></div>
        
        {/* 위치 정보 - 왼쪽 상단 */}
        {product?.dongId && (
          <div className="absolute top-3 left-3 z-[5]">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs text-white/90">
              📍 {product.sido} {product.gugun} {product.dong}
            </span>
          </div>
        )}
        
        {/* 액션 버튼 - 메뉴 모드 */}
        {(onEdit || onDelete || (onAction && actionType === 'menu')) && (
          <div className="glass-product-action-overlay" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="glass-action-button-new text-white"
              title="메뉴"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {/* 드롭다운 메뉴 */}
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                {onEdit && (
                  <button
                    onClick={handleEditClick}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    수정
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDeleteClick}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    삭제
                  </button>
                )}
                {/* 레거시: onAction만 있는 경우 */}
                {!onEdit && !onDelete && onAction && actionType === 'menu' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onAction();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    액션
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* 레거시: 단일 액션 버튼 (메뉴 모드가 아닐 때) */}
        {onAction && actionType !== 'menu' && !onEdit && !onDelete && (
          <div className="absolute top-2 right-2 z-[3] opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className={`p-2 bg-transparent rounded-lg border-0 outline-none transition-all duration-200 hover:scale-110 flex items-center justify-center text-white`}
              title={actionType === 'edit' ? '수정' : actionType === 'delete' ? '삭제' : actionType === 'unlike' ? '찜하기 취소' : '상세보기'}
            >
              <div className="w-6 h-6">
                {getActionIcon(actionType)}
              </div>
            </button>
          </div>
        )}

        {/* 찜하기 버튼 */}
        {onLike && (
          <div className="absolute top-2 right-2 z-[3] opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(isLiked);
              }}
              className="p-2 bg-transparent rounded-lg border-0 outline-none transition-all duration-200 hover:scale-110 flex items-center justify-center"
              title={isLiked ? '찜하기 취소' : '찜하기'}
            >
              <svg
                className="w-6 h-6"
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: isLiked ? '#FF1744' : '#FFFFFF' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </div>
        )}

        {/* 하단 텍스트 오버레이 */}
        <div className="glass-product-text-overlay">
          {/* 제품명 */}
          <h3 className="text-sm font-bold text-white mb-2 line-clamp-1">
            {product?.title || '상품명 없음'}
          </h3>
          
          {/* 가격 & 평점 */}
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold text-xs">
              {product?.rentalFee ? `${product.rentalFee.toLocaleString()}원/일` : '가격 정보 없음'}
            </p>
            
            {/* 별점 표시 */}
            {product?.rating !== undefined && (
              <div className="flex items-center gap-1 text-xs text-white">
                <span>⭐</span>
                <span className="font-semibold">{product.rating.toFixed(1)}</span>
                {product?.reviewCount && (
                  <span className="text-gray-300">({product.reviewCount})</span>
                )}
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
};

export default ProductCard;
