/**
 * ReviewCard Component
 * 통합 리뷰 카드 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileImage from '../../../shared/components/ProfileImage';

const ReviewCard = ({ review, showProductInfo = true, showRating = false, onClick, fromUserProfile = false }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleDateString('ko-KR');
    } catch (error) {
      return '';
    }
  };

  // 정밀한 별점 렌더링 함수 (마이페이지 프로필과 동일한 스타일)
  const renderStarRating = (rating) => {
    const calcStarRates = () => {
      let tempStarRatesArr = [0, 0, 0, 0, 0];
      let starScore = rating;

      for (let i = 0; i < 5; i++) {
        if (starScore >= 1) {
          tempStarRatesArr[i] = 14;
          starScore -= 1;
        } else {
          tempStarRatesArr[i] = starScore * 14;
          break;
        }
      }

      return tempStarRatesArr;
    };

    const ratesResArr = calcStarRates();
    const STAR_IDX_ARR = ['first', 'second', 'third', 'fourth', 'last'];

    return STAR_IDX_ARR.map((item, idx) => {
      const clipId = `clip-${idx}-${rating}-${review.reviewId || 'review'}`;
      const pathId = `path-${idx}-${rating}-${review.reviewId || 'review'}`;

      return (
        <span key={`${item}_${idx}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            viewBox="0 0 14 13"
            fill="#cacaca"
          >
            <clipPath id={clipId}>
              <rect width={ratesResArr[idx]} height={24} />
            </clipPath>
            <path
              id={pathId}
              d="M9,2l2.163,4.279L16,6.969,12.5,10.3l.826,4.7L9,12.779,4.674,15,5.5,10.3,2,6.969l4.837-.69Z"
              transform="translate(-2 -2)"
            />
            <use
              clipPath={`url(#${clipId})`}
              href={`#${pathId}`}
              fill="#FFBF0F"
            />
          </svg>
        </span>
      );
    });
  };

  // reviewer 정보 안전하게 처리 (여러 경로 확인)
  const reviewer = review.reviewer 
    || review.writer 
    || review.member 
    || (review.memberId ? { memberId: review.memberId, nickname: review.nickname, profileImageUrl: review.profileImageUrl } : {})
    || {};
  
  // reviewer ID 찾기 (여러 경로 확인)
  const reviewerId = reviewer.memberId 
    || reviewer.member_id 
    || reviewer.id
    || review.reviewerId
    || review.writerId
    || review.memberId;
  
  const handleProfileClick = (e) => {
    e.stopPropagation(); // 카드 클릭 이벤트와 분리
    
    if (reviewerId) {
      navigate(`/members/${reviewerId}`);
    } else {
      console.warn('[ReviewCard] reviewerId를 찾을 수 없습니다:', review);
    }
  };
  
  const handleClick = () => {
    if (onClick) {
      onClick(review);
      return;
    }

    // UserProfilePage에서 온 경우 상품 상세 페이지로 이동
    if (fromUserProfile) {
      const productId = review.productId || review.product?.productId || review.product?.id;
      if (productId) {
        navigate(`/products/${productId}`);
        return;
      } else {
        console.warn('[ReviewCard] productId를 찾을 수 없습니다:', review);
        return;
      }
    }

    // rentalHistoryId 찾기 (여러 경로 확인)
    // MyPageMain에서 이미 rentalHistoryId를 추가했으므로 직접 사용
    const rentalId = review.rentalHistoryId 
      || review.rentalHisId 
      || review.rentalHistory?.rentalHisId 
      || review.rentalHistory?.rentalHistoryId
      || review.rentalHistory?.id;
    
    if (rentalId) {
      // uploadType에 따라 빌린 내역 또는 빌려준 내역으로 이동
      // 받은 리뷰: BORROW이면 빌린 내역, RENT이면 빌려준 내역
      // 내가 쓴 리뷰: BORROW이면 빌린 내역, RENT이면 빌려준 내역
      if (review.uploadType === 'BORROW' || review.type === 'BORROW') {
        navigate(`/mypage/borrowed/${rentalId}`);
      } else if (review.uploadType === 'RENT' || review.type === 'RENT') {
        navigate(`/mypage/lent/${rentalId}`);
      } else {
        // uploadType이 없으면 기본적으로 빌린 내역으로 이동
        navigate(`/mypage/borrowed/${rentalId}`);
      }
    } else {
      console.warn('[ReviewCard] rentalHistoryId를 찾을 수 없습니다:', review);
    }
  };

  // rentalHistoryId 찾기 (여러 경로 확인)
  const rentalId = review.rentalHistoryId 
    || review.rentalHisId 
    || review.rentalHistory?.rentalHisId 
    || review.rentalHistory?.rentalHistoryId
    || review.rentalHistoryId
    || review.rentalHistory?.id;

  return (
    <div 
      className="p-3 md:p-4 border border-gray-200 rounded-2xl hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* 리뷰어 정보 */}
      <div className="flex items-center space-x-2 mb-2">
        {/* 프로필 이미지 - 항상 표시 */}
        <div 
          onClick={reviewerId ? handleProfileClick : undefined}
          className={reviewerId ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
        >
          <ProfileImage
            src={reviewer.profileImageUrl 
              || reviewer.profile_image_url 
              || review.profileImageUrl
              || review.profile_image_url}
            alt={reviewer.nickname 
              || reviewer.name 
              || review.nickname 
              || '익명'}
            size={40}
            className="w-8 h-8 md:w-10 md:h-10"
          />
        </div>
        <div 
          className={`flex-1 ${reviewerId ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={reviewerId ? handleProfileClick : undefined}
        >
          <div className="font-medium text-gray-900 text-sm md:text-base">
            {reviewer.nickname 
              || reviewer.name 
              || review.nickname 
              || review.reviewer?.nickname 
              || '익명'}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(review.createdAt || review.created_at)}
          </div>
        </div>
        {/* 별점 표시 (옵션) */}
        {showRating && review.rating != null && (
          <div className="flex items-center gap-1">
            {renderStarRating(review.rating)}
            <span className="text-xs text-gray-600 ml-1 font-medium">{review.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* 리뷰 제목 */}
      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2 text-sm md:text-base break-words overflow-wrap-anywhere">
          {review.title}
        </h4>
      )}

      {/* 리뷰 내용 */}
      <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-3 break-words overflow-wrap-anywhere whitespace-pre-wrap">
        {review.content}
      </p>

      {/* 리뷰 이미지 */}
      {review.imageUrls && review.imageUrls.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.imageUrls.map((image, imgIndex) => (
            <img
              key={imgIndex}
              src={image}
              alt={`리뷰 이미지 ${imgIndex + 1}`}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* 상품 정보 (showProductInfo가 true이고 상품 정보가 있는 경우) */}
      {showProductInfo && (review.productId || review.productTitle || review.productImageUrl || review.product) && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            {(review.productImageUrl || review.product?.imageUrl || review.product?.mainImageUrl || review.product?.images?.[0]) && (
              <img
                src={review.productImageUrl || review.product?.imageUrl || review.product?.mainImageUrl || review.product?.images?.[0]}
                alt={review.productTitle || review.product?.title || '상품 이미지'}
                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-sm truncate">
                {review.productTitle || review.product?.title || '상품 정보'}
              </div>
              {review.productId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/products/${review.productId || review.product?.productId || review.product?.id}`);
                  }}
                  className="mt-1 text-xs text-gray-600 hover:text-gray-900 underline"
                >
                  상품 보기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
