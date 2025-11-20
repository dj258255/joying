/**
 * BasicLayout Component
 * 기본 레이아웃 컴포넌트
 */

import React from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - 자식 컴포넌트
 * @param {string} props.className - 추가 CSS 클래스
 */
const BasicLayout = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default BasicLayout;
