/**
 * ProductCard Component
 * 통일된 상품 카드 컴포넌트 - 토스/애플 스타일 글래스모피즘
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {Object} props.product - 상품 정보
 * @param {Function} props.onClick - 카드 클릭 핸들러
 * @param {Function} props.onAction - 액션 버튼 핸들러
 * @param {string} props.actionType - 액션 타입 ('edit', 'delete', 'unlike', 'view')
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
  actionType = 'view',
  status = 'available',
  stats = {},
  dateLabel = '',
  dateValue = '',
  showStats = false,
  showDate = false
}) => {
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

  const statusConfig = getStatusConfig(status);

  return (
    <div className="glass-product-card-new group" onClick={onClick}>
      {/* 메인 이미지 배경 */}
      <div className="glass-product-image-main">
        {product?.image ? (
          <img
            src={product.image}
            alt={product.title || product.name}
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
        
        {/* 상태 뱃지 */}
        <div className="glass-product-status-overlay">
          <span className={`glass-status-badge-new ${statusConfig.className}`}>
            {statusConfig.text}
          </span>
        </div>

        {/* 액션 버튼 */}
        {onAction && (
          <div className="glass-product-action-overlay">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className={`glass-action-button-new glass-action-${actionType}`}
              title={actionType === 'edit' ? '수정' : actionType === 'delete' ? '삭제' : actionType === 'unlike' ? '찜하기 취소' : '상세보기'}
            >
              {getActionIcon(actionType)}
            </button>
          </div>
        )}

        {/* 하단 텍스트 오버레이 */}
        <div className="glass-product-text-overlay">
          <div className="glass-product-title-overlay">
            <h1>-------------------------</h1>
            {product?.title || product?.name || '상품명 없음'}
          </div>
          <div className="glass-product-price-overlay">
            {product?.price ? `${product.price.toLocaleString()}원/일` : '가격 정보 없음'}
          </div>
          <div className="glass-product-location-overlay">
            📍 {product?.location || '위치 정보 없음'}
          </div>
        </div>

        {/* 통계 정보 오버레이 */}
        {showStats && (
          <div className="glass-product-stats-overlay">
            <div className="glass-stats-grid">
              <div className="glass-stat-item-overlay">
                <span className="glass-stat-value-overlay">{stats.viewCount || 0}</span>
                <span className="glass-stat-label-overlay">조회</span>
              </div>
              <div className="glass-stat-item-overlay">
                <span className="glass-stat-value-overlay">{stats.likeCount || 0}</span>
                <span className="glass-stat-label-overlay">찜</span>
              </div>
              <div className="glass-stat-item-overlay">
                <span className="glass-stat-value-overlay">{stats.rentalCount || 0}</span>
                <span className="glass-stat-label-overlay">대여</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductCard;
