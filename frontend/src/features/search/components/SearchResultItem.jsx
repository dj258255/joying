/**
 * SearchResultItem Component
 * 검색 결과 아이템 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {Object} props.result - 검색 결과 데이터
 * @param {string} props.type - 결과 타입 (product, user, review)
 * @param {Function} props.onClick - 클릭 핸들러
 */
const SearchResultItem = ({ result, type, onClick }) => {
  const handleClick = () => {
    onClick?.(result);
  };

  const renderProductResult = () => (
    <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      {result.image && (
        <img
          src={result.image}
          alt={result.title}
          className="w-16 h-16 object-cover rounded"
        />
      )}
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{result.title}</h3>
        <p className="text-sm text-gray-600">{result.description}</p>
        <div className="flex items-center space-x-4 mt-2">
          <span className="text-sm text-gray-500">{result.category}</span>
          <span className="text-sm text-gray-500">{result.location}</span>
          <span className="text-sm font-medium text-blue-600">
            {new Intl.NumberFormat('ko-KR').format(result.price)}원/일
          </span>
        </div>
      </div>
    </div>
  );

  const renderUserResult = () => (
    <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
        <span className="text-gray-600 font-medium">
          {result.nickname?.charAt(0) || '?'}
        </span>
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{result.nickname}</h3>
        <p className="text-sm text-gray-600">{result.email}</p>
        <div className="flex items-center space-x-4 mt-2">
          <span className="text-sm text-gray-500">
            평점: {result.averageRating?.toFixed(1) || 'N/A'}
          </span>
          <span className="text-sm text-gray-500">
            리뷰 {result.reviewCount || 0}개
          </span>
        </div>
      </div>
    </div>
  );

  const renderReviewResult = () => (
    <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">
            {result.reviewer?.nickname || '알 수 없음'}
          </span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-4 h-4 ${
                  star <= result.rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
        <span className="text-sm text-gray-500">
          {new Date(result.createdAt).toLocaleDateString('ko-KR')}
        </span>
      </div>
      <p className="text-gray-700 line-clamp-3">{result.content}</p>
      {result.product && (
        <div className="mt-2 text-sm text-gray-500">
          상품: {result.product.title}
        </div>
      )}
    </div>
  );

  const getTypeLabel = () => {
    const typeLabels = {
      product: '상품',
      user: '사용자',
      review: '리뷰'
    };
    return typeLabels[type] || type;
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
          {getTypeLabel()}
        </span>
      </div>
      
      {type === 'product' && renderProductResult()}
      {type === 'user' && renderUserResult()}
      {type === 'review' && renderReviewResult()}
    </div>
  );
};

export default SearchResultItem;
