/**
 * ReviewWritePage Component
 * 리뷰 작성 페이지 컴포넌트
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReviewWrite } from '../hooks/useReviewWrite';
import ReviewWriteForm from '../components/ReviewWriteForm';

const ReviewWritePage = () => {
  const { type, id } = useParams(); // type: product/user, id: productId/userId
  const navigate = useNavigate();
  const { createReview, isCreating, createError } = useReviewWrite(type);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (reviewData) => {
    setIsSubmitting(true);
    try {
      await createReview({ 
        [type === 'product' ? 'productId' : 'userId']: id, 
        reviewData 
      });
      navigate(-1); // 이전 페이지로 이동
    } catch (error) {
      console.error('리뷰 작성 실패:', error);
      alert('리뷰 작성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {type === 'product' ? '상품 리뷰 작성' : '사용자 리뷰 작성'}
        </h1>
        <p className="text-gray-600 mt-2">
          {type === 'product' 
            ? '상품에 대한 솔직한 리뷰를 작성해주세요.'
            : '사용자에 대한 솔직한 리뷰를 작성해주세요.'
          }
        </p>
      </div>

      <ReviewWriteForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isCreating || isSubmitting}
      />

      {createError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800 text-sm">
            리뷰 작성 중 오류가 발생했습니다. 다시 시도해주세요.
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewWritePage;
