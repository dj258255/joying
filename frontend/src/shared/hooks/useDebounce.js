/**
 * useDebounce Hook
 * 디바운스를 위한 커스텀 훅
 */

import { useState, useEffect } from 'react';

/**
 * @param {any} value - 디바운스할 값
 * @param {number} delay - 지연 시간 (밀리초)
 * @returns {any} 디바운스된 값
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
