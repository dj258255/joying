/**
 * ReviewWriteForm Component
 * 리뷰 작성 폼 컴포넌트
 */

import React, { useState, useRef, useEffect } from 'react';
import ReviewStarRating from './ReviewStarRating';
import { FiUpload, FiTrash2 } from 'react-icons/fi';
import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants';

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
    isPublic: review?.isPublic ?? true,
    fileIds: review?.fileIds || [],
  });

  const [filePreviews, setFilePreviews] = useState([]);
  const [fileIds, setFileIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (review) {
      setFormData({
        rating: review.rating || 0,
        content: review.content || '',
        isPublic: review.isPublic ?? true,
        fileIds: review.fileIds || [],
      });
      setFilePreviews(review.imageUrls || []);
    }
  }, [review]);

  const handleRatingChange = (rating) => {
    setFormData(prev => ({ ...prev, rating: Math.max(0.5, Math.min(5, rating)) }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFiles = async (files) => {
    const fileArr = Array.from(files || []);
    if (fileArr.length === 0) return;
    setErrorMessage('');

    const localUrls = fileArr.map((f) => URL.createObjectURL(f));
    const previewStartIndex = filePreviews.length;
    setFilePreviews((prev) => [...prev, ...localUrls]);

    setUploading(true);
    const uploadedResults = [];
    const failedIndices = [];

    try {
      const uploadPromises = fileArr.map(async (file, index) => {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const res = await axiosInstance.post(API_ENDPOINTS.FILE.BASE, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          const fileId =
            res.data?.body?.data?.fileId ||
            res.data?.data?.fileId ||
            res.data?.fileId ||
            res.data?.body?.fileId;

          if (!fileId) throw new Error('fileId가 응답에 없습니다');
          uploadedResults.push({ fileId, index: previewStartIndex + index });
        } catch {
          failedIndices.push(previewStartIndex + index);
        }
      });

      await Promise.all(uploadPromises);

      const successful = uploadedResults.filter((r) => r.fileId);
      const fileIdArray = successful.map((item) => item.fileId);
      if (successful.length > 0) {
        setFormData((prev) => ({
          ...prev,
          fileIds: fileIdArray,
        }));
      }

      if (failedIndices.length > 0) {
        setFilePreviews((prev) => {
          const newPrev = [...prev];
          failedIndices.reverse().forEach((i) => newPrev.splice(i, 1));
          return newPrev;
        });
        setErrorMessage(`${failedIndices.length}개의 이미지 업로드에 실패했습니다.`);
      }
    } catch (err) {
      console.error('이미지 업로드 오류:', err);
      setErrorMessage('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // 이미지 제거
  const removeImageAt = (idx) => {
    setFilePreviews((prev) => prev.filter((_, i) => i !== idx));
    setFormData((prev) => ({
      ...prev,
      fileIds: prev.fileIds.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.rating < 0.5) {
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
    <div className="bg-white/40 backdrop-blur-sm rounded-lg border border-gray-200/60 p-4 md:p-6">
      <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
        {review ? '리뷰 수정' : '리뷰 작성'}
      </h2>

      {/* 대상 정보 */}
      {(product || user) && (
        <div className="mb-6 p-4 bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-lg">
          <div className="flex items-center space-x-3">
            {(product?.image || user?.profileImage) && (
              <img
                src={product?.image || user?.profileImage}
                alt={product?.title || user?.nickname}
                className="w-12 h-12 object-cover rounded-lg border border-gray-200/60"
              />
            )}
            <div>
              <div className="font-medium text-gray-900">
                {product?.title || user?.nickname}
              </div>
              <div className="text-sm text-gray-700">
                {product?.category || user?.email}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 별점 평가 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            별점 평가 *
          </label>
          <div className="flex items-center space-x-2">
            <ReviewStarRating
              rating={formData.rating}
              onRatingChange={handleRatingChange}
              size="lg"
              allowHalf={true}
            />
            {formData.rating > 0 && (
              <span className="text-sm text-gray-900 font-medium">
                {getRatingText(Math.ceil(formData.rating))}
              </span>
            )}
          </div>
        </div>

        {/* 이미지 업로드 섹션 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            이미지 업로드
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300/60 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-900/40 transition bg-white/40 backdrop-blur-sm"
          >
            <FiUpload className="w-8 h-8 text-gray-400 mb-1" />
            <p className="text-sm text-gray-900">
              클릭하여 이미지 추가 또는 드래그하여 업로드
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />
          </div>

          {/* 미리보기 */}
          {filePreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
              {filePreviews.map((src, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={src}
                    alt={`preview-${idx}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200/60"
                  />
                  <button
                    type="button"
                    onClick={() => removeImageAt(idx)}
                    className="absolute top-1 right-1 bg-gray-900/80 backdrop-blur-sm text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {errorMessage && <p className="text-red-600 text-sm mt-2">{errorMessage}</p>}
        </div>

        {/* 리뷰 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            리뷰 내용 *
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            rows={6}
            placeholder="상품이나 사용자에 대한 솔직한 리뷰를 작성해주세요."
            className="w-full border border-gray-300/60 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/20 bg-white/60 backdrop-blur-sm text-gray-900"
            required
          />
          <div className="mt-1 text-sm text-gray-700">
            {formData.content.length}/1000자
          </div>
        </div>

        {/* 공개 설정 */}
        {/* <div className="flex items-center">
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
        </div> */}

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-900 bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-md hover:bg-white/80 transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isLoading || formData.rating < 0.5 || !formData.content.trim()}
            className="px-4 py-2 text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? '저장 중...' : review ? '수정하기' : '리뷰 작성'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewWriteForm;
