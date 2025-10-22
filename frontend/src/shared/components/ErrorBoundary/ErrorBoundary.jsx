/**
 * ErrorBoundary Component
 * 에러 경계 컴포넌트
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  오류가 발생했습니다
                </h3>
              </div>
            </div>
            
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
              </p>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                페이지 새로고침
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
