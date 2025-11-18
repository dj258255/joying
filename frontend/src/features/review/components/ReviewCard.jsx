/**
 * ReviewCard Component
 * 통합 리뷰 카드 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileImage from '../../../shared/components/ProfileImage';

const ReviewCard = ({ review, showProductInfo = true, showRating = false, onClick }) => {
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

  // reviewer 정보 안전하게 처리
  const reviewer = review.reviewer || review.writer || {};
  
  const handleClick = () => {
    if (onClick) {
      onClick(review);
      return;
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
        <ProfileImage
          src={reviewer.profileImageUrl || reviewer.profile_image_url}
          alt={reviewer.nickname || reviewer.name || '익명'}
          size={40}
          className="w-8 h-8 md:w-10 md:h-10"
        />
        <div className="flex-1">
          <div className="font-medium text-gray-900 text-sm md:text-base">
            {reviewer.nickname || reviewer.name || '익명'}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(review.createdAt)}
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
        <h4 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">
          {review.title}
        </h4>
      )}

      {/* 리뷰 내용 */}
      <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-3">
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
    </div>
  );
};

export default ReviewCard;
