/**
 * ProductDetailPage Component
 * 상품 상세 페이지 컴포넌트
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useProductLike } from '../hooks/useProductLike';
import { useUnavailableDates } from '../hooks/useUnavailableDates';
import LikeButton from '../components/LikeButton';
import UnavailableDateCalendar from '../components/UnavailableDateCalendar';

const ProductDetailPage = () => {
  const { id } = useParams();
  const { products, isLoading, error } = useProducts();
  const { toggleLike, isLoading: isLikeLoading } = useProductLike(id);
  const { unavailableDates, setUnavailableDates } = useUnavailableDates(id);

  const product = products.find(p => p.id === id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">상품을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const {
    title,
    description,
    price,
    category,
    location,
    images,
    owner,
    createdAt
  } = product;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 상품 이미지 */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
            {images && images.length > 0 ? (
              <img
                src={images[0]}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                이미지 없음
              </div>
            )}
          </div>
          
          {images && images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((image, index) => (
                <div key={index} className="aspect-square bg-gray-200 rounded overflow-hidden">
                  <img
                    src={image}
                    alt={`${title} ${index + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <LikeButton productId={id} isLiked={product.isLiked} />
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
              <span className="bg-gray-100 px-2 py-1 rounded">{category}</span>
              <span>{location}</span>
              <span>{formatDate(createdAt)}</span>
            </div>
            
            <div className="text-3xl font-bold text-blue-600 mb-4">
              {formatPrice(price)}원/일
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">상품 설명</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">대여자 정보</h3>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {owner?.nickname?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <div className="font-medium">{owner?.nickname || '알 수 없음'}</div>
                <div className="text-sm text-gray-600">대여자</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700">
              대여 요청하기
            </button>
            
            <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50">
              채팅하기
            </button>
          </div>
        </div>
      </div>

      {/* 대여 불가 날짜 설정 (대여자만) */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">대여 불가 날짜</h2>
        <UnavailableDateCalendar
          unavailableDates={unavailableDates}
          onDateChange={setUnavailableDates}
        />
      </div>
    </div>
  );
};

export default ProductDetailPage;
