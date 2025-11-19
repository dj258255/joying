/**
 * ProductManagementPage Component
 * 상품 관리 페이지 컴포넌트
 */

import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import ProductForm from '../components/ProductForm';
import ProductCard from '../components/ProductCard';

const ProductManagementPage = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const { products, createProduct, updateProduct, deleteProduct, isLoading } = useProducts();

  const handleCreateProduct = async (productData) => {
    try {
      await createProduct(productData);
      setIsEditing(false);
      setSelectedProduct(null);
    } catch (error) {
      
    }
  };

  const handleUpdateProduct = async (productData) => {
    try {
      await updateProduct({ productId: selectedProduct.id, productData });
      setIsEditing(false);
      setSelectedProduct(null);
    } catch (error) {
      
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('정말로 이 상품을 삭제하시겠습니까?')) {
      try {
        await deleteProduct(productId);
      } catch (error) {
        
      }
    }
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">내 상품 관리</h1>
        <button
          onClick={() => setIsEditing(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          새 상품 등록
        </button>
      </div>

      {isEditing && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedProduct ? '상품 수정' : '새 상품 등록'}
          </h2>
          <ProductForm
            product={selectedProduct}
            onSubmit={selectedProduct ? handleUpdateProduct : handleCreateProduct}
            isLoading={isLoading}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setIsEditing(false);
                setSelectedProduct(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="relative">
            <ProductCard
              product={product}
              onClick={(id) => }
            />
            <div className="absolute top-2 right-2 flex space-x-2">
              <button
                onClick={() => handleEditProduct(product)}
                className="p-2 bg-white rounded-full shadow hover:bg-gray-50"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => handleDeleteProduct(product.id)}
                className="p-2 bg-white rounded-full shadow hover:bg-gray-50"
              >
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">등록된 상품이 없습니다.</div>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            첫 상품 등록하기
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductManagementPage;
