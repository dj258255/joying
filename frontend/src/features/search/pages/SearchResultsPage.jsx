/**
 * SearchResultsPage Component
 * 검색 결과 페이지 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch, useHashtags, useCategories } from '../hooks/useSearch';
import SearchBar from '../components/SearchBar';
import SearchResultItem from '../components/SearchResultItem';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(query);
  const [selectedType, setSelectedType] = useState('all');

  const { searchResults, isLoading, error } = useSearch(searchTerm, {
    type: selectedType === 'all' ? undefined : selectedType
  });

  const { hashtags } = useHashtags();
  const { categories } = useCategories();

  useEffect(() => {
    setSearchTerm(query);
  }, [query]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
  };

  const handleResultClick = (result) => {
    // TODO: 결과 상세 페이지로 이동
    
  };

  const typeOptions = [
    { value: 'all', label: '전체' },
    { value: 'product', label: '상품' },
    { value: 'user', label: '사용자' },
    { value: 'review', label: '리뷰' }
  ];

  const groupedResults = searchResults.reduce((acc, result) => {
    const type = result.type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(result);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 검색 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">검색 결과</h1>
        
        <div className="mb-6">
          <SearchBar
            onSearch={handleSearch}
            placeholder="상품, 사용자, 리뷰를 검색하세요..."
            className="max-w-2xl"
          />
        </div>

        {/* 검색 타입 필터 */}
        <div className="flex space-x-2">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTypeChange(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedType === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 검색 결과 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">검색 중...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">검색 중 오류가 발생했습니다.</div>
        </div>
      ) : searchResults.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            '{searchTerm}'에 대한 검색 결과가 없습니다.
          </div>
          <div className="text-sm text-gray-400">
            다른 검색어를 시도해보세요.
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedResults).map(([type, results]) => (
            <div key={type}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {typeOptions.find(opt => opt.value === type)?.label || type}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({results.length}개)
                </span>
              </h2>
              
              <div className="space-y-4">
                {results.map((result, index) => (
                  <SearchResultItem
                    key={`${type}-${index}`}
                    result={result}
                    type={type}
                    onClick={handleResultClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 인기 해시태그 */}
      {hashtags.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">인기 해시태그</h3>
          <div className="flex flex-wrap gap-2">
            {hashtags.slice(0, 10).map((hashtag) => (
              <button
                key={hashtag.id}
                onClick={() => handleSearch(`#${hashtag.name}`)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
              >
                #{hashtag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 카테고리 */}
      {categories.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">카테고리</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleSearch(category.name)}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
              >
                <div className="font-medium text-gray-900">{category.name}</div>
                <div className="text-sm text-gray-500">{category.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;
