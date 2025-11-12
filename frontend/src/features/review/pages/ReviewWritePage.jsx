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
            console.error('리뷰 불러오기 실패:', err);
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
      console.error('리뷰 저장 실패:', err);
      alert('리뷰 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-10 px-4">
      <div
        className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white/90 shadow-xl backdrop-blur-md p-8"
        style={{
          boxShadow:
            '0 10px 30px rgba(0,0,0,0.08), inset 0 0 20px rgba(255,255,255,0.3)',
        }}
      >
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            {mode === 'edit' ? '리뷰 수정' : '리뷰 작성'}
          </h1>
          <p className="text-gray-600 text-sm">
            {mode === 'edit'
              ? '작성한 리뷰를 수정할 수 있습니다.'
              : '소중한 리뷰를 남겨주세요.'}
          </p>
        </div>

        {/* 폼 영역 */}
        <div
          className="rounded-xl border border-gray-100 bg-white/80 shadow-sm p-6 transition-all hover:shadow-md"
        >
          <ReviewWriteForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
            review={initialData?.data}
          />
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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
