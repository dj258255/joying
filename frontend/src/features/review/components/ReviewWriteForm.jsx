/**
 * ReviewWriteForm Component
 * 리뷰 작성 폼 컴포넌트
 */

import React, { useState } from 'react';
import ReviewStarRating from './ReviewStarRating';

/**
 * @param {Object} props
 * @param {Object} props.product - 상품 정보 (상품 리뷰인 경우)
 * @param {Object} props.user - 사용자 정보 (사용자 리뷰인 경우)
 * @param {Object} props.review - 기존 리뷰 데이터 (수정 시)
 * @param {Function} props.onSubmit - 폼 제출 핸들러
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {boolean} props.isLoading - 로딩 상태
 */
const ReviewWriteForm = ({ 
  product, 
  user, 
  review, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    rating: review?.rating || 0,
    content: review?.content || '',
    isPublic: review?.isPublic ?? true
  });

  const handleRatingChange = (rating) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.rating === 0) {
      alert('별점을 선택해주세요.');
      return;
    }
    if (!formData.content.trim()) {
      alert('리뷰 내용을 입력해주세요.');
      return;
    }
    onSubmit(formData);
  };

  const getRatingText = (rating) => {
    const ratingTexts = {
      1: '매우 나쁨',
      2: '나쁨',
      3: '보통',
      4: '좋음',
      5: '매우 좋음'
    };
    return ratingTexts[rating] || '';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {review ? '리뷰 수정' : '리뷰 작성'}
      </h2>

      {/* 대상 정보 */}
      {(product || user) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {(product?.image || user?.profileImage) && (
              <img
                src={product?.image || user?.profileImage}
                alt={product?.title || user?.nickname}
                className="w-12 h-12 object-cover rounded"
              />
            )}
            <div>
              <div className="font-medium text-gray-900">
                {product?.title || user?.nickname}
              </div>
              <div className="text-sm text-gray-600">
                {product?.category || user?.email}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 별점 평가 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            별점 평가 *
          </label>
          <div className="flex items-center space-x-2">
            <ReviewStarRating
              rating={formData.rating}
              onRatingChange={handleRatingChange}
              size="lg"
            />
            {formData.rating > 0 && (
              <span className="text-sm text-gray-600">
                {getRatingText(formData.rating)}
              </span>
            )}
          </div>
        </div>

        {/* 리뷰 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            리뷰 내용 *
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            rows={6}
            placeholder="상품이나 사용자에 대한 솔직한 리뷰를 작성해주세요."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <div className="mt-1 text-sm text-gray-500">
            {formData.content.length}/1000자
          </div>
        </div>

        {/* 공개 설정 */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isPublic"
            checked={formData.isPublic}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            공개 리뷰로 설정
          </label>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isLoading || formData.rating === 0 || !formData.content.trim()}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '저장 중...' : review ? '수정하기' : '리뷰 작성'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewWriteForm;
