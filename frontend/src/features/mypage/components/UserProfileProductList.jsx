/**
 * UserProfileProductList Component
 * 프로필 페이지 전용 - 외부에서 전달된 products + pagination 정보를 사용하여 렌더링
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

const UserProfileProductList = ({
  products = [],
  currentPage = 0,
  totalPages = 1,
  onPageChange = () => {}
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* 상품 목록 */}
      {products.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">등록된 상품이 없습니다</h4>
            <p className="text-gray-500">아직 등록한 상품이 없습니다.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
            {products.map((product) => {
              const pid = product.id || product.productId;
              return (
                <ProductCard
                  key={pid}
                  product={{
                    ...product,
                    image: product.thumbnailUrl || product.images?.[0],
                    name: product.title
                  }}
                  onClick={() => navigate(`/products/${pid}`, {
                    state: {
                      fromMyPage: true,
                      myPageState: {
                        activeTab: 'products',
                        productTab: 'registered'
                      }
                    }
                  })}
                  actionType="view"
                  status="available"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className={`px-4 py-2 rounded-lg text-sm ${
              currentPage === 0 ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            이전
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => onPageChange(i)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  currentPage === i
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className={`px-4 py-2 rounded-lg text-sm ${
              currentPage >= totalPages - 1 ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfileProductList;
