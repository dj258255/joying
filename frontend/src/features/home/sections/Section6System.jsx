import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';

/**
 * Section 6: 시스템 설명
 * - 보증금 에스크로, 개봉 영상, 신뢰도 시스템 소개
 * - 3단계 대여 프로세스 안내
 */
const Section6System = () => {
  const navigate = useNavigate();

  return (
    <section
      id="section-6"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ zIndex: 60 }}
    >
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-0">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-4 md:mb-12">
          안전한 거래를 위한 <span className="text-primary-500">3가지 시스템</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8 mb-6 md:mb-16">
          <div className="text-center">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
              <span className="text-xl md:text-2xl">🛡️</span>
            </div>
            <h3 className="text-base md:text-xl font-bold mb-1 md:mb-3">보증금 에스크로</h3>
            <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
              플랫폼이 보증금을 안전하게 보관하여<br />분쟁 시 공정한 중재를 제공합니다
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
              <span className="text-xl md:text-2xl">📹</span>
            </div>
            <h3 className="text-base md:text-xl font-bold mb-1 md:mb-3">개봉 영상 필수</h3>
            <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
              수령 시와 반납 시 개봉 영상을 촬영하여<br />물건 상태를 명확히 기록합니다
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
              <span className="text-xl md:text-2xl">⭐</span>
            </div>
            <h3 className="text-base md:text-xl font-bold mb-1 md:mb-3">신뢰도 시스템</h3>
            <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
              거래 횟수와 평점을 기반으로 한 뱃지 시스템으로<br />신뢰할 수 있는 거래를 보장합니다
            </p>
          </div>
        </div>

        {/* 거래 단계 */}
        <div className="max-w-4xl mx-auto border-t border-gray-800 pt-4 md:pt-12">
          <h3 className="text-xl md:text-3xl font-bold text-center mb-3 md:mb-8">
            간편한 <span className="text-primary-500">3단계</span> 대여
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6 pb-8 md:pb-0">
            <div className="flex-1 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3 text-base md:text-lg font-bold">
                1
              </div>
              <h4 className="text-sm md:text-lg font-semibold mb-1 md:mb-2">상품 검색 및 선택</h4>
              <p className="text-gray-400 text-xs md:text-sm">
                원하는 물건을 검색하고<br />대여 기간을 설정하세요
              </p>
            </div>
            <div className="flex-1 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3 text-base md:text-lg font-bold">
                2
              </div>
              <h4 className="text-sm md:text-lg font-semibold mb-1 md:mb-2">안전하게 거래</h4>
              <p className="text-gray-400 text-xs md:text-sm">
                보증금 에스크로와 개봉 영상으로<br />안심하고 거래하세요
              </p>
            </div>
            <div className="flex-1 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3 text-base md:text-lg font-bold">
                3
              </div>
              <h4 className="text-sm md:text-lg font-semibold mb-1 md:mb-2">즐겁게 사용 후 반납</h4>
              <p className="text-gray-400 text-xs md:text-sm">
                안전하게 받아서 사용하세요
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section6System;


