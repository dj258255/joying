/**
 * ProductForm Component
 * 상품 등록/수정 폼 컴포넌트
 */

import React, { useState, useEffect } from 'react';

/**
 * @param {Object} props
 * @param {Object} props.product - 기존 상품 데이터 (수정 시)
 * @param {Function} props.onSubmit - 폼 제출 핸들러
 * @param {boolean} props.isLoading - 로딩 상태
 */
const ProductForm = ({ product, onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    location: '',
    images: [],
    rentalPeriod: {
      startDate: '',
      endDate: ''
    }
  });

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price || '',
        category: product.category || '',
        location: product.location || '',
        images: product.images || [],
        rentalPeriod: product.rentalPeriod || { startDate: '', endDate: '' }
      });
    }
  }, [product]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNestedInputChange = (e) => {
    const { name, value } = e.target;
    const [parent, child] = name.split('.');
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: value
      }
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          상품명 *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          설명
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            가격 (원/일) *
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            카테고리 *
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            required
          >
            <option value="">카테고리 선택</option>
            <option value="electronics">전자제품</option>
            <option value="clothing">의류</option>
            <option value="books">도서</option>
            <option value="sports">스포츠</option>
            <option value="home">생활용품</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          위치 *
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            대여 시작일
          </label>
          <input
            type="date"
            name="rentalPeriod.startDate"
            value={formData.rentalPeriod.startDate}
            onChange={handleNestedInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            대여 종료일
          </label>
          <input
            type="date"
            name="rentalPeriod.endDate"
            value={formData.rentalPeriod.endDate}
            onChange={handleNestedInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          상품 이미지
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
