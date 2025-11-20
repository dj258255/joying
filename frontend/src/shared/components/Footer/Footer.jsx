/**
 * Footer Component
 * 푸터 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {string} props.className - 추가 CSS 클래스
 */
const Footer = ({ className = '' }) => {
  return (
    <footer className={`bg-gray-800 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 회사 정보 */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <span className="text-2xl font-bold text-white">Joying</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              안전하고 편리한 물품 대여 플랫폼입니다.<br />
              필요한 물품을 언제든지 쉽게 대여하고,<br />
              사용하지 않는 물품을 수익화하세요.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.647.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.807.875-1.297 2.026-1.297 3.323s.49 2.448 1.297 3.323c.875.807 2.026 1.297 3.323 1.297s2.448-.49 3.323-1.297c.807-.875 1.297-2.026 1.297-3.323s-.49-2.448-1.297-3.323c-.875-.807-2.026-1.297-3.323-1.297s-2.448.49-3.323 1.297z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
          </div>

          {/* 서비스 */}
          <div>
            <h3 className="text-white font-semibold mb-4">서비스</h3>
            <ul className="space-y-2">
              <li>
                <a href="/products" className="text-gray-300 hover:text-white text-sm">
                  상품 둘러보기
                </a>
              </li>
              <li>
                <a href="/products/create" className="text-gray-300 hover:text-white text-sm">
                  상품 등록하기
                </a>
              </li>
              <li>
                <a href="/chats" className="text-gray-300 hover:text-white text-sm">
                  채팅
                </a>
              </li>
              <li>
                <a href="/reviews" className="text-gray-300 hover:text-white text-sm">
                  리뷰
                </a>
              </li>
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h3 className="text-white font-semibold mb-4">고객지원</h3>
            <ul className="space-y-2">
              <li>
                <a href="/help" className="text-gray-300 hover:text-white text-sm">
                  도움말
                </a>
              </li>
              <li>
                <a href="/faq" className="text-gray-300 hover:text-white text-sm">
                  자주 묻는 질문
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-300 hover:text-white text-sm">
                  문의하기
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-300 hover:text-white text-sm">
                  이용약관
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-gray-300 hover:text-white text-sm">
                  개인정보처리방침
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Joying. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/terms" className="text-gray-400 hover:text-white text-sm">
                이용약관
              </a>
              <a href="/privacy" className="text-gray-400 hover:text-white text-sm">
                개인정보처리방침
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
