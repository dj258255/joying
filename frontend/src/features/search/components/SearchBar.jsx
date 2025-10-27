/**
 * SearchBar Component
 * 검색바 컴포넌트
 */

import React, { useState } from 'react';
import { useDebounce } from '@/shared/hooks';

/**
 * @param {Object} props
 * @param {Function} props.onSearch - 검색 핸들러
 * @param {string} props.placeholder - 플레이스홀더 텍스트
 * @param {string} props.className - 추가 CSS 클래스
 */
const SearchBar = ({ 
  onSearch, 
  placeholder = '검색어를 입력하세요...', 
  className = '' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  React.useEffect(() => {
    if (debouncedSearchTerm) {
      onSearch?.(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(searchTerm);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch?.('');
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative group">
        {/* 검색 아이콘 */}
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <svg 
            className="h-6 w-6 text-gray-400 group-focus-within:text-primary-500 transition-colors duration-200" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* 입력창 */}
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="block w-full pl-14 pr-14 py-4 rounded-2xl text-base
                     bg-white/10 backdrop-blur-xl 
                     border-2 border-white/20 
                     text-gray-800 placeholder-gray-400
                     focus:outline-none focus:border-primary-500 focus:bg-white/15
                     transition-all duration-300
                     shadow-lg shadow-black/5"
        />
        
        {/* 클리어 버튼 */}
        {searchTerm && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-full bg-gray-200/50 hover:bg-gray-300/70 text-gray-600 hover:text-gray-800 transition-all duration-200 hover:scale-110"
              aria-label="검색어 지우기"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 호버/포커스 시 글로우 효과 */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/10 via-blue-500/10 to-purple-500/10 blur-xl" />
        </div>
      </div>
    </form>
  );
};

export default SearchBar;
