/**
 * MessageBubble Component
 * 메시지 버블 컴포넌트 (카카오톡 스타일)
 */

import React, { useState, useRef } from 'react';
import DeleteMessageModal from './DeleteMessageModal';

/**
 * @param {Object} props
 * @param {Object} props.message - 메시지 데이터
 * @param {boolean} props.isOwn - 자신의 메시지 여부
 * @param {Function} props.onReply - 답장 핸들러
 * @param {Function} props.onDelete - 삭제 핸들러
 * @param {Function} props.onEdit - 수정 핸들러
 * @param {string} [props.messageId] - 메시지 ID (검색 시 스크롤용)
 * @param {Function} [props.onReplyClick] - 답장 메시지 클릭 핸들러 (원본 메시지로 점프)
 * @param {Function} [props.onRentalAccept] - 대여 요청 승인 핸들러
 * @param {Function} [props.onRentalReject] - 대여 요청 거절 핸들러
 * @param {Array} [props.actionButtons] - 메시지 하단에 표시할 액션 버튼들
 */
const MessageBubble = ({ message, isOwn = false, onReply, onDelete, onEdit, messageId, actionButtons, onReplyClick, onRentalAccept, onRentalReject }) => {
  const { content = '', sender, timestamp, type, replyTo, isRead, showReadIndicator, isDeleted, isEdited } = message;
  const id = messageId || message.id;
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  const editInputRef = useRef(null);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleActionButtonClick = (e) => {
    e.stopPropagation();
    if (!isDeleted) {
      setShowActions(true);
    }
  };

  const handleReply = () => {
    onReply?.(message);
    setShowActions(false);
  };

  const handleDeleteClick = () => {
    setShowActions(false);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    try {
      await onDelete(id);
      setShowDeleteModal(false);
    } catch (error) {
      alert(error.message || '메시지 삭제에 실패했습니다.');
      setShowDeleteModal(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(content);
    setShowActions(false);
    // 다음 렌더링에서 input에 포커스
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim()) {
      alert('메시지 내용을 입력해주세요.');
      return;
    }
    if (editContent.trim() === content) {
      setIsEditing(false);
      return;
    }
    if (!onEdit) return;
    try {
      await onEdit(id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      alert(error.message || '메시지 수정에 실패했습니다.');
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  // 롱프레스 시작
  const handleTouchStart = (e) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowActions(true);
      // 햅틱 피드백 (지원하는 디바이스에서)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 400); // 400ms 후 롱프레스로 인식
  };

  // 롱프레스 종료
  const handleTouchEnd = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 터치 이동 시 롱프레스 취소
  const handleTouchMove = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 클릭 이벤트 (롱프레스가 아닌 경우에만)
  const handleClick = (e) => {
    if (!isLongPress.current) {
      // 일반 클릭 처리 (필요시)
    }
    isLongPress.current = false;
  };

  // 답장 메시지로 스크롤 이동 (메시지 점프 API 사용)
  const handleReplyClick = async (e) => {
    e.stopPropagation();
    if (!replyTo?.id) return;

    // onReplyClick prop이 있으면 사용 (메시지 점프 API 사용)
    if (onReplyClick) {
      try {
        await onReplyClick(replyTo.id);
      } catch (error) {
        console.error('[MessageBubble] 답장 메시지 점프 실패:', error);
      }
      return;
    }

    // fallback: 기존 방식 (DOM 요소 직접 찾기)
    const targetElement = document.getElementById(`message-${replyTo.id}`);
    if (targetElement) {
      // 스크롤 컨테이너 찾기 (overflow-y-auto 또는 overflow-y-scroll 클래스를 가진 가장 가까운 부모)
      let scrollContainer = null;
      let parent = targetElement.parentElement;
      
      while (parent && parent !== document.body) {
        const classes = parent.className || '';
        const style = window.getComputedStyle(parent);
        const hasOverflowY = classes.includes('overflow-y-auto') || 
                           classes.includes('overflow-y-scroll') ||
                           style.overflowY === 'auto' || 
                           style.overflowY === 'scroll';
        
        if (hasOverflowY) {
          scrollContainer = parent;
          break;
        }
        parent = parent.parentElement;
      }

      if (scrollContainer) {
        // 스크롤 컨테이너 기준으로 위치 계산
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        const containerHeight = scrollContainer.clientHeight;
        const elementHeight = targetElement.offsetHeight;
        
        // 요소를 컨테이너 중앙에 위치시키기
        const targetScrollTop = relativeTop - (containerHeight / 2) + (elementHeight / 2);
        
        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      } else {
        // 스크롤 컨테이너를 찾지 못하면 scrollIntoView 사용 (브라우저가 자동으로 처리)
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // 하이라이트 효과 추가
      targetElement.classList.add('ring-2', 'ring-gray-900', 'ring-offset-2', 'rounded-lg', 'transition-all');
      setTimeout(() => {
        targetElement.classList.remove('ring-2', 'ring-gray-900', 'ring-offset-2', 'rounded-lg', 'transition-all');
      }, 2000);
    }
  };

  // 시스템 메시지
  if (type === 'system') {
    // 결제 완료 메시지는 일반 메시지처럼 처리 (isPaymentComplete 체크로 이동)
    if (content?.includes('MESSAGE_TYPE:PAYMENT_COMPLETE')) {
      // 아래 isPaymentComplete 로직에서 처리
    } else {
      // 일반 시스템 메시지는 중앙 정렬 (글래스모피즘 디자인)
      // 메시지 타입 자동 감지
      let messageType = 'info';
      let messageIcon = null;
      
      if (content?.includes('✅') || content?.includes('완료') || content?.includes('확인') || content?.includes('반납')) {
        messageType = 'success';
        if (content?.includes('반납')) {
          messageIcon = (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        } else {
          messageIcon = (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          );
        }
      } else if (content?.includes('⚠️') || content?.includes('경고') || content?.includes('주의')) {
        messageType = 'warning';
        messageIcon = (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      } else if (content?.includes('❌') || content?.includes('오류') || content?.includes('실패')) {
        messageType = 'error';
        messageIcon = (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      } else {
        messageIcon = (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      }
      
      const typeStyles = {
        info: 'bg-white/80 backdrop-blur-xl border-gray-200/60 text-gray-900',
        success: 'bg-green-500/20 backdrop-blur-xl border-green-400/50 text-green-900',
        warning: 'bg-yellow-500/20 backdrop-blur-xl border-yellow-400/50 text-yellow-900',
        error: 'bg-red-500/20 backdrop-blur-xl border-red-400/50 text-red-900'
      };
      
      return (
        <div id={id ? `message-${id}` : undefined} className="flex justify-center my-3 px-4">
          <div className={`inline-flex items-center gap-2 ${typeStyles[messageType]} rounded-full shadow-md px-4 py-2 max-w-[80%] border`}>
            {messageIcon && <span className="flex-shrink-0">{messageIcon}</span>}
            <p className="text-sm font-medium text-center whitespace-pre-line">{content}</p>
          </div>
        </div>
      );
    }
  }

  // 대여 요청 메시지
  if (type === 'rental_request') {
    const rentalInfo = message.rentalInfo;
    
    // rentalInfo가 있으면 상세 정보 표시
    if (rentalInfo) {
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          return dateStr;
        }
      };

      return (
        <div id={id ? `message-${id}` : undefined} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
          <div className="max-w-md w-full">
            {/* 글래스모피즘 스타일 적용 - 양쪽 동일하게, 더 투명하고 밝게 */}
            <div className="rounded-2xl p-5 backdrop-blur-xl bg-white/40 border border-white/30 shadow-xl">
              {/* 요청자 프로필 정보 */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/20">
                {rentalInfo.requesterProfileUrl ? (
                  <>
                    <img 
                      src={rentalInfo.requesterProfileUrl} 
                      alt={rentalInfo.requesterName || '요청자'}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/40 shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/40 shadow-lg hidden bg-white/30 backdrop-blur-sm"
                    >
                      <span className="text-black/80 text-base font-bold">
                        {(rentalInfo.requesterName || '사용자')[0]}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/40 shadow-lg bg-white/30 backdrop-blur-sm">
                    <span className="text-black/80 text-base font-bold">
                      {(rentalInfo.requesterName || '사용자')[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-black/90 truncate mb-1">
                    {rentalInfo.requesterName || '사용자'}
                  </div>
                  <div className="text-xs text-black/70">
                    대여를 요청했습니다
                  </div>
                </div>
              </div>

              {/* 상품 정보 카드 */}
              <div className="rounded-xl p-4 mb-4 backdrop-blur-md bg-white/30 border border-white/40 shadow-lg">
                <div className="flex gap-4">
                  {rentalInfo.productImageUrl && (
                    <div className="w-24 h-24 bg-white/20 rounded-xl overflow-hidden flex-shrink-0 border border-white/30 shadow-md">
                      <img 
                        src={rentalInfo.productImageUrl} 
                        alt={rentalInfo.productTitle || '상품'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="w-full h-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><svg class="w-8 h-8 text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-black/90 text-base mb-3 line-clamp-2">
                      {rentalInfo.productTitle || '상품'}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm text-black/80">
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-black/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="flex-1">
                          <div className="font-semibold text-black/90 mb-0.5">대여 기간</div>
                          <div className="text-sm text-black/75">
                            {formatDate(rentalInfo.startDate)} ~ {formatDate(rentalInfo.endDate)}
                          </div>
                          <div className="text-xs text-black/65 mt-1">
                            총 {rentalInfo.days}일
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 가격 정보 */}
              {(rentalInfo.dailyPrice || rentalInfo.deposit || rentalInfo.totalPrice) && (
                <div className="rounded-xl p-4 mb-4 backdrop-blur-md bg-white/30 border border-white/40 shadow-lg">
                  <div className="space-y-3">
                    {rentalInfo.dailyPrice && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-black/75">일일 대여료</span>
                        <span className="font-bold text-black/90">{rentalInfo.dailyPrice.toLocaleString()}원</span>
                      </div>
                    )}
                    {rentalInfo.deposit && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-black/75">보증금</span>
                        <span className="font-bold text-black/90">{rentalInfo.deposit.toLocaleString()}원</span>
                      </div>
                    )}
                    {rentalInfo.totalPrice && (
                      <div className="border-t border-white/30 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-base text-black/90">총 금액</span>
                          <span className="font-bold text-xl text-black/90">
                            {rentalInfo.totalPrice.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 상태 표시 (대기 중 제외) */}
              {rentalInfo.status && rentalInfo.status !== 'pending' && (
                <div className="text-xs font-medium px-3 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md bg-white/40 text-black/80 border border-white/50 shadow-md">
                  {rentalInfo.status === 'approved' && '승인됨'}
                  {rentalInfo.status === 'rejected' && '거절됨'}
                </div>
              )}

              {/* 승인/거절 버튼 (판매자이고 pending 상태일 때만) */}
              {!isOwn && rentalInfo.status === 'pending' && onRentalAccept && onRentalReject && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/30">
                  <button
                    onClick={() => onRentalAccept(message)}
                    className="flex-1 py-2.5 px-4 bg-black/70 text-white rounded-lg font-semibold hover:bg-black/80 transition-colors text-sm shadow-lg backdrop-blur-md border border-white/20"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => onRentalReject(message)}
                    className="flex-1 py-2.5 px-4 bg-white/60 text-black/80 rounded-lg font-semibold hover:bg-white/70 transition-colors text-sm shadow-lg backdrop-blur-md border border-white/40"
                  >
                    거절
                  </button>
                </div>
              )}
            </div>
            <div 
              className={`text-xs mt-2 ${isOwn ? 'text-right' : 'text-left'} text-black/60 flex items-center gap-1 relative`}
            >
              <span>{formatTime(timestamp)}</span>
              {/* 액션 버튼 (항시 표시) */}
              {!isDeleted && (
                <button
                  onClick={handleActionButtonClick}
                  className="ml-2 p-1 rounded-full hover:bg-white/30 transition-colors opacity-70 hover:opacity-100 backdrop-blur-sm"
                  aria-label="메시지 액션"
                >
                  <svg className="w-4 h-4 text-black/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // rentalInfo가 없으면 렌더링하지 않음 (데이터 오류)
    // normalizeMessage에서 rentalInfo를 파싱해야 하는데 실패한 경우
    console.warn('[MessageBubble] rental_request 타입이지만 rentalInfo가 없음:', message);
    return null;
  }

  // 결제 완료 메시지 - MESSAGE_TYPE 마커로 확인 (type은 소문자로 정규화됨)
  const isPaymentComplete = type === 'payment_complete'
    || (type === 'text' && content?.includes('MESSAGE_TYPE:PAYMENT_COMPLETE'))
    || (type === 'system' && content?.includes('MESSAGE_TYPE:PAYMENT_COMPLETE'));
  if (isPaymentComplete) {
    // 메타데이터 제거한 표시용 콘텐츠
    const displayContent = content
      ?.replace(/\nrentalHisId:\d+/g, '')
      .replace(/\nMESSAGE_TYPE:PAYMENT_COMPLETE/g, '')
      .trim();

    // "대여를 요청했습니다" 카드 스타일과 통일
    return (
      <div id={id ? `message-${id}` : undefined} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
        <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {/* 결제 완료 카드 */}
          <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
            isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
          }`}>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 border-b border-gray-900/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-bold text-sm">결제가 완료되었습니다</p>
              </div>
            </div>

            {/* 내용 */}
            <div className="p-4 bg-white/80">
              <p className="text-sm text-gray-900 whitespace-pre-line">{displayContent}</p>

              {/* 액션 버튼들 */}
              {actionButtons && actionButtons.length > 0 && (
                <div className="pt-3 mt-3 border-t border-gray-200 space-y-2">
                  {actionButtons.map((button, index) => (
                    <button
                      key={index}
                      onClick={button.onClick}
                      className="glass-button w-full text-sm py-2"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>{button.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 시간 표시 */}
          <div className={`text-xs text-gray-500 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // BORROW 제안 메시지 - MESSAGE_TYPE 마커로 확인 (type은 소문자로 정규화됨)
  const isBorrowProposal = type === 'borrow_proposal' || (type === 'text' && content?.includes('MESSAGE_TYPE:BORROW_PROPOSAL'));
  if (isBorrowProposal) {
    // 메타데이터 제거한 표시용 콘텐츠
    const displayContent = content
      ?.replace(/\nMESSAGE_TYPE:BORROW_PROPOSAL/g, '')
      .trim();

    // "대여를 요청했습니다" 카드 스타일로 변경
    return (
      <div id={id ? `message-${id}` : undefined} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
        <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {/* 대여 요청 카드 */}
          <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
            isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
          }`}>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 border-b border-gray-900/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="font-bold text-sm">대여 제안</p>
              </div>
            </div>

            {/* 내용 */}
            <div className="p-4 bg-white/80">
              <p className="text-sm text-gray-900 whitespace-pre-line">{displayContent}</p>

              {/* 액션 버튼들 */}
              {actionButtons && actionButtons.length > 0 && (
                <div className="pt-3 mt-3 border-t border-gray-200">
                  {/* 거래 방법 선택 (거래 생성하기 버튼이 있을 때만 표시) */}
                  {actionButtons.some(btn => btn.text?.includes('거래 생성하기')) && rentMethodSelector && (
                    <div className="mb-3">
                      {rentMethodSelector}
                    </div>
                  )}

                  {/* 버튼들 */}
                  <div className="space-y-2">
                    {actionButtons.map((button, index) => (
                      <button
                        key={index}
                        onClick={button.onClick}
                        className={`glass-button w-full text-sm py-2`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span>{button.text}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 시간 표시 */}
          <div className={`text-xs text-gray-500 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // 취소 요청 메시지 - MESSAGE_TYPE 마커로 확인 (type은 소문자로 정규화됨)
  const isCancelRequest = type === 'cancel_request' || (type === 'text' && content?.includes('MESSAGE_TYPE:CANCEL_REQUEST'));
  if (isCancelRequest) {
    // 메타데이터 제거한 표시용 콘텐츠
    const displayContent = content
      ?.replace(/\nrentalHisId:\d+/g, '')
      .replace(/\ncancelId:\d+/g, '')
      .replace(/\nMESSAGE_TYPE:CANCEL_REQUEST/g, '')
      .trim();

    // "대여를 요청했습니다" 카드 스타일과 통일
    return (
      <div id={id ? `message-${id}` : undefined} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
        <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {/* 취소 요청 카드 */}
          <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
            isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
          }`}>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 border-b border-gray-900/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-bold text-sm">거래 취소 요청</p>
              </div>
            </div>

            {/* 내용 */}
            <div className="p-4 bg-white/80">
              <p className="text-sm text-gray-900 whitespace-pre-line">{displayContent}</p>

              {/* 액션 버튼들 */}
              {actionButtons && actionButtons.length > 0 && (
                <div className="pt-3 mt-3 border-t border-gray-200 space-y-2">
                  {actionButtons.map((button, index) => (
                    <button
                      key={index}
                      onClick={button.onClick}
                      className="glass-button w-full text-sm py-2"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>{button.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 시간 표시 */}
          <div className={`text-xs text-gray-500 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // 거래 취소 거절 메시지 - MESSAGE_TYPE 마커로 확인 (type은 소문자로 정규화됨)
  const isCancelRejected = type === 'cancel_rejected' || (type === 'text' && content?.includes('MESSAGE_TYPE:CANCEL_REJECTED'));
  if (isCancelRejected) {
    // 메타데이터 제거한 표시용 콘텐츠
    const displayContent = content
      ?.replace(/\nMESSAGE_TYPE:CANCEL_REJECTED/g, '')
      .trim();

    return (
      <div id={id ? `message-${id}` : undefined} className="flex justify-center my-3 px-4">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-xl border-gray-200/60 text-gray-900 rounded-full shadow-md px-4 py-2 max-w-[80%] border">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-center whitespace-pre-line">{displayContent}</p>
        </div>
      </div>
    );
  }

  // 반납 수령 확인 메시지 - MESSAGE_TYPE 마커로 확인 (type은 소문자로 정규화됨)
  const isReturnReceived = type === 'return_received' || (type === 'text' && content?.includes('MESSAGE_TYPE:RETURN_RECEIVED'));
  if (isReturnReceived) {
    // 메타데이터 제거한 표시용 콘텐츠
    const displayContent = content
      ?.replace(/\nMESSAGE_TYPE:RETURN_RECEIVED/g, '')
      .trim();

    return (
      <div id={id ? `message-${id}` : undefined} className="flex justify-center my-3 px-4">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-xl border-gray-200/60 text-gray-900 rounded-full shadow-md px-4 py-2 max-w-[80%] border">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-center whitespace-pre-line">{displayContent}</p>
        </div>
      </div>
    );
  }

  // 비디오 메시지
  if (type === 'video') {
    return (
      <div id={id ? `message-${id}` : undefined} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        {/* 읽음 표시 (좌측, 내 메시지일 때만) */}
        {isOwn && (
          <div className="flex items-end mr-1">
            <span className="text-gray-900 text-xs">
              {isRead ? '읽음' : '1'}
            </span>
          </div>
        )}
        <div className="max-w-xs">
          {/* 답장 표시 */}
          {replyTo && typeof replyTo === 'object' && replyTo.sender && (
            <div className="mb-2">
              <div
                onClick={handleReplyClick}
                className="bg-gray-50/80 border-l-4 border-gray-400 p-3 rounded-r-lg cursor-pointer hover:bg-gray-100/80 transition-colors active:bg-gray-200/80"
                title="답장한 메시지로 이동"
              >
                <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  {replyTo.sender?.nickname || '알 수 없음'}에게 답장
                </div>
                <div className="text-sm text-gray-700 bg-white/50 p-2 rounded">
                  {replyTo.isDeleted ? '삭제된 메시지입니다.' : (replyTo.content || '')}
                </div>
              </div>
            </div>
          )}
          <div
            className={`relative ${isDeleted ? 'opacity-60' : ''}`}
          >
            {isDeleted ? (
              <div className={`px-4 py-2 rounded-2xl ${
                isOwn
                  ? 'bg-gray-900 text-white rounded-br-md'
                  : 'bg-gray-200 text-gray-900 rounded-bl-md'
              }`}>
                <p className="text-sm italic">삭제된 메시지입니다.</p>
              </div>
            ) : (
              <div className={`rounded-2xl overflow-hidden ${
                isOwn ? 'rounded-br-md' : 'rounded-bl-md'
              }`}>
                <video
                  src={message?.fileUrl || content}
                  controls
                  className="max-w-full max-h-96 rounded-2xl"
                  style={{ maxWidth: '300px' }}
                >
                  브라우저가 비디오 재생을 지원하지 않습니다.
                </video>
                {message.fileName && (
                  <div className={`px-3 py-2 text-xs ${
                    isOwn ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-900'
                  }`}>
                    {message.fileName}
                  </div>
                )}
              </div>
            )}
          </div>
          <div
            className={`text-xs mt-1 ${isOwn ? 'text-right' : 'text-left'} text-gray-500 flex items-center gap-1 relative`}
          >
            <span>{formatTime(timestamp)}</span>
            {/* 액션 버튼 (항시 표시) */}
            {!isDeleted && (
              <button
                onClick={handleActionButtonClick}
                className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-70 hover:opacity-100 z-10 relative"
                aria-label="메시지 액션"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 액션 메뉴 */}
        {showActions && !isDeleted && (
          <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)}>
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-1.5 sm:p-2 flex flex-row gap-1.5 sm:gap-2 animate-in zoom-in-95 duration-200">
              {isOwn && (
                <button
                  onClick={handleDeleteClick}
                  className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  삭제
                </button>
              )}
              {!isOwn && (
                <button
                  onClick={handleReply}
                  className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  답장
                </button>
              )}
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        <DeleteMessageModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          messageContent="영상"
        />
      </div>
    );
  }

  // 파일 메시지
  if (type === 'file') {
    return (
      <div id={id ? `message-${id}` : undefined} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        {/* 읽음 표시 (좌측, 내 메시지일 때만) */}
        {isOwn && (
          <div className="flex items-end mr-1">
            <span className="text-gray-900 text-xs">
              {isRead ? '읽음' : '1'}
            </span>
          </div>
        )}
        <div className="max-w-xs">
          {/* 답장 표시 */}
          {replyTo && typeof replyTo === 'object' && replyTo.sender && (
            <div className="mb-2">
              <div
                onClick={handleReplyClick}
                className="bg-gray-50/80 border-l-4 border-gray-400 p-3 rounded-r-lg cursor-pointer hover:bg-gray-100/80 transition-colors active:bg-gray-200/80"
                title="답장한 메시지로 이동"
              >
                <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  {replyTo.sender?.nickname || '알 수 없음'}에게 답장
                </div>
                <div className="text-sm text-gray-700 bg-white/50 p-2 rounded">
                  {replyTo.isDeleted ? '삭제된 메시지입니다.' : (replyTo.content || '')}
                </div>
              </div>
            </div>
          )}
          <div
            className={`relative ${isDeleted ? 'opacity-60' : ''}`}
          >
            {isDeleted ? (
              <div className={`px-4 py-2 rounded-2xl ${
                isOwn
                  ? 'bg-gray-900 text-white rounded-br-md'
                  : 'bg-gray-200 text-gray-900 rounded-bl-md'
              }`}>
                <p className="text-sm italic">삭제된 메시지입니다.</p>
              </div>
            ) : (
              <a
                href={content}
                download={message.fileName || 'file'}
                target="_blank"
                rel="noopener noreferrer"
                className={`block px-4 py-3 rounded-2xl ${
                  isOwn
                    ? 'bg-gray-900 text-white rounded-br-md hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-900 rounded-bl-md hover:bg-gray-300'
                } transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isOwn ? 'bg-white/20' : 'bg-gray-900/10'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {message.fileName || '파일'}
                    </div>
                    {message.fileSize && (
                      <div className="text-xs opacity-70">
                        {(message.fileSize / 1024).toFixed(1)} KB
                      </div>
                    )}
                  </div>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
              </a>
            )}
          </div>
          <div
            className={`text-xs mt-1 ${isOwn ? 'text-right' : 'text-left'} text-gray-500 flex items-center gap-1 relative`}
          >
            <span>{formatTime(timestamp)}</span>
            {/* 액션 버튼 (항시 표시) */}
            {!isDeleted && (
              <button
                onClick={handleActionButtonClick}
                className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-70 hover:opacity-100 z-10 relative"
                aria-label="메시지 액션"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 액션 메뉴 */}
        {showActions && !isDeleted && (
          <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)}>
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-1.5 sm:p-2 flex flex-row gap-1.5 sm:gap-2 animate-in zoom-in-95 duration-200">
              {isOwn && (
                <button
                  onClick={handleDeleteClick}
                  className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  삭제
                </button>
              )}
              {!isOwn && (
                <button
                  onClick={handleReply}
                  className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  답장
                </button>
              )}
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        <DeleteMessageModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          messageContent={message.fileName || '파일'}
        />
      </div>
    );
  }

  // 이미지 메시지
  if (type === 'image') {
    return (
      <div id={id ? `message-${id}` : undefined} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        {/* 읽음 표시 (좌측, 내 메시지일 때만) */}
        {isOwn && (
          <div className="flex items-end mr-1">
            <span className="text-gray-900 text-xs">
              {isRead ? '읽음' : '1'}
            </span>
          </div>
        )}
        <div className="max-w-xs">
          {/* 답장 표시 */}
          {replyTo && typeof replyTo === 'object' && replyTo.sender && (
            <div className="mb-2">
              <div 
                onClick={handleReplyClick}
                className="bg-gray-50/80 border-l-4 border-gray-400 p-3 rounded-r-lg cursor-pointer hover:bg-gray-100/80 transition-colors active:bg-gray-200/80"
                title="답장한 메시지로 이동"
              >
                <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  {replyTo.sender?.nickname || '알 수 없음'}에게 답장
                </div>
                <div className="text-sm text-gray-700 bg-white/50 p-2 rounded">
                  {replyTo.isDeleted ? '삭제된 메시지입니다.' : (replyTo.content || '')}
                </div>
              </div>
            </div>
          )}
          <div
            className={`relative ${isDeleted ? 'opacity-60' : ''}`}
          >
            {isDeleted ? (
              <div className={`px-4 py-2 rounded-2xl ${
                isOwn
                  ? 'bg-gray-900 text-white rounded-br-md'
                  : 'bg-gray-200 text-gray-900 rounded-bl-md'
              }`}>
                <p className="text-sm italic">삭제된 메시지입니다.</p>
              </div>
            ) : (() => {
              // 이미지 URL 결정: imageUrl 우선, 없으면 content가 URL인지 확인
              const imageUrl = message?.imageUrl ||
                             (content && (content.startsWith('http://') || content.startsWith('https://')) ? content : null);

              if (!imageUrl) {
                // URL이 없으면 에러 메시지 표시
                return (
                  <div className={`px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-gray-900 text-white rounded-br-md'
                      : 'bg-gray-200 text-gray-900 rounded-bl-md'
                  }`}>
                    <p className="text-sm italic">이미지를 불러올 수 없습니다.</p>
                    <p className="text-xs opacity-70 mt-1">{content}</p>
                  </div>
                );
              }

              return (
                <div
                  className="relative group"
                  onClick={(e) => {
                    // 액션 버튼 클릭이 아닐 때만 이미지 열기
                    if (!e.target.closest('button') && !isLongPress.current) {
                      window.open(imageUrl, '_blank');
                    }
                    handleClick(e);
                  }}
                >
                  <img
                    src={imageUrl}
                    alt="전송된 이미지"
                    draggable="false"
                    className="rounded-2xl max-w-full h-auto cursor-pointer"
                    onError={(e) => {
                      // 이미지 로드 실패 시 에러 메시지 표시
                      e.target.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = `px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-gray-900 text-white rounded-br-md'
                          : 'bg-gray-200 text-gray-900 rounded-bl-md'
                      }`;
                      errorDiv.innerHTML = `
                        <p class="text-sm italic">이미지를 불러올 수 없습니다.</p>
                        <p class="text-xs opacity-70 mt-1">${imageUrl}</p>
                      `;
                      e.target.parentElement.replaceWith(errorDiv);
                    }}
                  />
                  {/* 이미지 확대 아이콘 */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/50 rounded-full p-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          <div 
            className={`text-xs mt-1 ${isOwn ? 'text-right' : 'text-left'} text-gray-500 flex items-center gap-1 relative`}
          >
            <span>{formatTime(timestamp)}</span>
            {/* 액션 버튼 (항시 표시) */}
            {!isDeleted && (
              <button
                onClick={handleActionButtonClick}
                className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-70 hover:opacity-100 z-10 relative"
                aria-label="메시지 액션"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 액션 메뉴 */}
        {showActions && !isDeleted && (
          <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)}>
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-1.5 sm:p-2 flex flex-row gap-1.5 sm:gap-2 animate-in zoom-in-95 duration-200">
              {isOwn && (
                <button
                  onClick={handleDeleteClick}
                  className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  삭제
                </button>
              )}
              {!isOwn && (
                <button
                  onClick={handleReply}
                  className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  답장
                </button>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(content);
                  setShowActions(false);
                }}
                className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                복사
              </button>
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        <DeleteMessageModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          messageContent="이미지 메시지"
        />
      </div>
    );
  }

  // 일반 텍스트 메시지
  return (
    <div id={id ? `message-${id}` : undefined} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      {/* 읽음 표시 (좌측, 내 메시지일 때만) */}
      {isOwn && (
        <div className="flex items-end mr-1">
          <span className="text-gray-900 text-xs">
            {isRead ? '읽음' : '1'}
          </span>
        </div>
      )}
      <div className="max-w-xs lg:max-w-md">
        {/* 답장 표시 */}
        {replyTo && typeof replyTo === 'object' && replyTo.sender && (
          <div className="mb-2">
            <div 
              onClick={handleReplyClick}
              className="bg-gray-50/80 border-l-4 border-gray-400 p-3 rounded-r-lg cursor-pointer hover:bg-gray-100/80 transition-colors active:bg-gray-200/80"
              title="답장한 메시지로 이동"
            >
              <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                {replyTo.sender?.nickname || '알 수 없음'}에게 답장
              </div>
              <div className="text-sm text-gray-700 bg-white/50 p-2 rounded">
                {replyTo.isDeleted ? '삭제된 메시지입니다.' : (replyTo.content || '')}
              </div>
            </div>
          </div>
        )}
        
        {/* 메시지 버블 */}
        {isEditing ? (
          <div className={`relative px-4 py-2 rounded-2xl ${
            isOwn 
              ? 'bg-gray-900 text-white rounded-br-md' 
              : 'bg-gray-200 text-gray-900 rounded-bl-md'
          }`}>
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEditSubmit();
                } else if (e.key === 'Escape') {
                  handleEditCancel();
                }
              }}
              className="w-full bg-transparent text-sm resize-none focus:outline-none"
              rows={Math.min(Math.max(editContent.split('\n').length, 1), 5)}
              style={{ minHeight: '24px' }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleEditSubmit}
                className="px-3 py-1 text-xs bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                저장
              </button>
              <button
                onClick={handleEditCancel}
                className="px-3 py-1 text-xs bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div 
            className={`relative px-4 py-2 rounded-2xl ${
              isOwn 
                ? 'bg-gray-900 text-white rounded-br-md' 
                : 'bg-gray-200 text-gray-900 rounded-bl-md'
            } ${isDeleted ? 'opacity-60' : ''}`}
          >
            {!isOwn && (
              <div className="text-xs font-medium text-gray-600 mb-1">
                {sender?.nickname || '알 수 없음'}
              </div>
            )}
            <div className="text-sm whitespace-pre-wrap break-words overflow-wrap-break-word">
              {isDeleted ? '삭제된 메시지입니다.' : content}
            </div>
            {isEdited && !isDeleted && (
              <div className="text-xs opacity-70 mt-1">(수정됨)</div>
            )}
          </div>
        )}
        
        {/* 시간 표시 */}
        <div
          className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'} relative`}
        >
          <span className="text-xs text-gray-500">
            {formatTime(timestamp)}
          </span>
          {/* 액션 버튼 (항시 표시) */}
          {!isDeleted && (
            <button
              onClick={handleActionButtonClick}
              className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-70 hover:opacity-100"
              aria-label="메시지 액션"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          )}
        </div>

        {/* 메시지 액션 버튼들 */}
        {actionButtons && actionButtons.length > 0 && !isDeleted && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actionButtons.map((button, index) => {
              const getButtonStyle = () => {
                switch(button.style) {
                  case 'primary':
                    return 'bg-blue-600 hover:bg-blue-700 text-white';
                  case 'success':
                    return 'bg-green-600 hover:bg-green-700 text-white';
                  case 'danger':
                    return 'bg-red-600 hover:bg-red-700 text-white';
                  case 'warning':
                    return 'bg-yellow-600 hover:bg-yellow-700 text-white';
                  case 'secondary':
                  default:
                    return 'bg-gray-200 hover:bg-gray-300 text-gray-800';
                }
              };

              return (
                <button
                  key={index}
                  onClick={button.onClick}
                  disabled={button.disabled}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md ${getButtonStyle()} ${button.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {button.icon && <span className="mr-1">{button.icon}</span>}
                  {button.text}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 액션 메뉴 */}
      {showActions && !isDeleted && (
        <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)}>
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-1.5 sm:p-2 flex flex-row gap-1.5 sm:gap-2 animate-in zoom-in-95 duration-200">
            {isOwn && (
              <>
                {type === 'text' && (
                  <button
                    onClick={handleEdit}
                    className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    수정
                  </button>
                )}
                <button
                  onClick={handleDeleteClick}
                  className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  삭제
                </button>
              </>
            )}
              {!isOwn && (
                <button
                  onClick={handleReply}
                  className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                답장
              </button>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(content);
                setShowActions(false);
              }}
              className="px-2.5 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              복사
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <DeleteMessageModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        messageContent={content}
      />
    </div>
  );
};

export default MessageBubble;
