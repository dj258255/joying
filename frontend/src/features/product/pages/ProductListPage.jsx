/**
 * ProductListPage Component
 * 상품 목록 페이지 컴포넌트
 */

import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';

const ProductListPage = () => {
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    priceRange: '',
    search: ''
  });

  const { products, isLoading, error } = useProducts(filters);

  const handleProductClick = (productId) => {
    // TODO: 상품 상세 페이지로 이동
    console.log('상품 선택:', productId);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">상품 목록을 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 필터 섹션 */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="검색어 입력..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">카테고리 선택</option>
            <option value="electronics">전자제품</option>
            <option value="clothing">의류</option>
            <option value="books">도서</option>
          </select>
          <input
            type="text"
            placeholder="지역"
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <select
            value={filters.priceRange}
            onChange={(e) => handleFilterChange('priceRange', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">가격대 선택</option>
            <option value="0-10000">1만원 이하</option>
            <option value="10000-50000">1-5만원</option>
            <option value="50000+">5만원 이상</option>
          </select>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={handleProductClick}
          />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">상품이 없습니다.</div>
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
