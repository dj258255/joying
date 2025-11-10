import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';
import logo from '@/assets/icons/logo.png';

/**
 * Section 7: 대여 프로세스
 * - 3단계 대여 프로세스 안내
 */
const Section7Process = () => {
  const navigate = useNavigate();

  return (
    <section
      id="section-7"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ zIndex: 60, scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {/* 로고 - 모바일/PC 모두 우측 하단 */}
      <div className="absolute bottom-8 right-8">
        <img 
          src={logo} 
          alt="빌려joying" 
          className="h-12 w-auto object-contain cursor-pointer"
          onClick={() => navigate(ROUTE_PATHS.HOME)}
        />
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8 md:py-0">
        <h3 className="text-xl md:text-3xl font-bold text-center mb-3 md:mb-8">
          간편한 <span className="text-primary-500">3단계</span> 대여
        </h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6 max-w-4xl mx-auto pb-8 md:pb-0">
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
    </section>
  );
};

export default Section7Process;

