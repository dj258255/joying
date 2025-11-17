/**
 * SearchBar Component
 * 검색바 컴포넌트
 */

import React, { useState, useRef, useEffect } from 'react';
import { useDebounce } from '@/shared/hooks';
import { searchApi } from '../api/searchApi';

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
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // 자동완성 데이터 가져오기
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim().length >= 1) {
        try {
          const data = await searchApi.autocomplete(searchTerm);
          setSuggestions(data || []);
          setShowSuggestions(true);
        } catch (error) {
          console.error('자동완성 조회 실패:', error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // 검색 실행
  React.useEffect(() => {
    if (debouncedSearchTerm) {
      onSearch?.(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedIndex(-1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearch?.(searchTerm);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch?.('');
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    onSearch?.(suggestion);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
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
            onKeyDown={handleKeyDown}
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

      {/* 자동완성 드롭다운 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-white/30 overflow-hidden">
          <ul className="py-2">
            {suggestions.map((suggestion, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-6 py-3 transition-all duration-200 flex items-center gap-3
                    ${
                      index === selectedIndex
                        ? 'bg-primary-500/10 text-primary-700'
                        : 'hover:bg-gray-100 text-gray-800'
                    }`}
                >
                  <svg
                    className={`h-4 w-4 ${
                      index === selectedIndex ? 'text-primary-500' : 'text-gray-400'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="flex-1 font-medium">{suggestion}</span>
                  {index === selectedIndex && (
                    <svg className="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
