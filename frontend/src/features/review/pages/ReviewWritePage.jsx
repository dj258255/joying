/**
 * ReviewWritePage Component
 * 리뷰 작성 페이지 컴포넌트
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useReviewWrite } from '../hooks/useReviewWrite';
import ReviewWriteForm from '../components/ReviewWriteForm';

const ReviewWritePage = ({ mode }) => {
  const { type, reviewId } = useParams(); // type: product/user, id: productId/userId
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rentalHistoryId = searchParams.get('rentalHistoryId');

  const { createReview, updateReview, getReviewDetail, isLoading, error } = useReviewWrite(type);

  const [initialData, setInitialData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
      if (mode === 'edit' && reviewId) {
        (async () => {
          try {
            const data = await getReviewDetail(reviewId);
            setInitialData(data);
          } catch (err) {
            
          }
        })();
      }
  }, [mode, reviewId]);

  const handleSubmit = async (formData) => {
    if (mode !== 'edit') {
      if (!rentalHistoryId) {
        alert('리뷰 정보를 불러올 수 없습니다. 다시 시도해주세요.');
        return;
      }
    }
    const payload = {
      ...formData,
      rentalHistoryId: !rentalHistoryId ? null : Number(rentalHistoryId),
    };

    setIsSubmitting(true);
    try {
      if (mode === 'edit') {
        await updateReview({reviewId, reviewData: payload});
        alert('리뷰가 수정되었습니다.');
        navigate(-1);
      } else {
        const res = await createReview(payload);
        //alert('리뷰가 작성되었습니다.');
        if (res.uploadType === 'BORROW' && res.productId) {
          navigate(`/reviews/product/${res.productId}`);
        } else if (res.uploadType === 'RENT' && res.reviewedId) {
          navigate(`/reviews/member/${res.reviewedId}`);
        } else {
          navigate('/reviews');
        }
      }
      //navigate(-1);
    } catch (err) {
      
      alert('리뷰 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex justify-center py-10 px-4">
      <div
        className="w-full max-w-3xl rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/60 shadow-xl p-6 md:p-8"
      >
        {/* 헤더 */}
        <div className="mb-6 md:mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 md:mb-3">
            {mode === 'edit' ? '리뷰 수정' : '리뷰 작성'}
          </h1>
          <p className="text-gray-700 text-sm md:text-base">
            {mode === 'edit'
              ? '작성한 리뷰를 수정할 수 있습니다.'
              : '소중한 리뷰를 남겨주세요.'}
          </p>
        </div>

        {/* 폼 영역 */}
        <div className="rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/60 shadow-sm p-4 md:p-6">
          <ReviewWriteForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
            review={initialData?.data}
          />
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="mt-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-lg">
            <div className="text-red-800 text-sm">
              오류가 발생했습니다. 다시 시도해주세요.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewWritePage;
