/**
 * ScrollIndicator Component
 * Lottie 기반 스크롤 인디케이터 (왼쪽 고정)
 */

import React, { useEffect, useRef, useState } from 'react';
import Lottie from 'lottie-react';
import scrollAnimation from '../assets/scroll.json';

const ScrollIndicator = React.memo(({ currentSection, totalSections }) => {
  const lottieRef = useRef();
  const [isVisible, setIsVisible] = useState(true);

  // 마지막 섹션(Section 6)에서는 숨김
  useEffect(() => {
    setIsVisible(currentSection < totalSections - 1);
  }, [currentSection, totalSections]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed left-8 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
      role="img"
      aria-label="스크롤 인디케이터"
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={scrollAnimation}
        loop={true}
        autoplay={true}
        style={{ width: 50, height: 130 }}
        rendererSettings={{
          preserveAspectRatio: 'xMidYMid slice',
          progressiveLoad: true
        }}
      />
    </div>
  );
});

ScrollIndicator.displayName = 'ScrollIndicator';

export default ScrollIndicator;

