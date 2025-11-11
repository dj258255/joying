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
 */
const MessageBubble = ({ message, isOwn = false, onReply, onDelete, onEdit, messageId }) => {
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

  // 답장 메시지로 스크롤 이동
  const handleReplyClick = (e) => {
    e.stopPropagation();
    if (!replyTo?.id) return;

    // 원본 메시지 요소 찾기
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
    return (
      <div id={id ? `message-${id}` : undefined} className="flex justify-center my-3">
        <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
          {content}
        </span>
      </div>
    );
  }

  // 대여 요청 메시지
  if (type === 'rental_request') {
    return (
      <div id={id ? `message-${id}` : undefined} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className="max-w-sm">
          <div 
            className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">대여 요청</span>
            </div>
            <p className="text-sm text-gray-700">{content}</p>
          </div>
          <div 
            className={`text-xs mt-1 ${isOwn ? 'text-right' : 'text-left'} text-gray-500 flex items-center gap-1 relative`}
          >
            <span>{formatTime(timestamp)}</span>
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
        </div>
      </div>
    );
  }

  // 이미지 메시지
  if (type === 'image') {
    return (
      <div id={id ? `message-${id}` : undefined} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        {/* 읽음 표시 (좌측, 내 메시지일 때만) */}
        {isOwn && showReadIndicator && (
          <div className="flex items-end mr-1">
            <span className="text-gray-900 text-xs animate-fade-in">읽음</span>
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
            <div 
              className="relative group"
              onClick={(e) => {
                // 액션 버튼 클릭이 아닐 때만 이미지 열기
                if (!e.target.closest('button') && !isLongPress.current) {
                  window.open(content, '_blank');
                }
                handleClick(e);
              }}
            >
              <img 
                src={content} 
                alt="전송된 이미지"
                className="rounded-2xl max-w-full h-auto cursor-pointer"
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
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-2 flex gap-2 animate-in zoom-in-95 duration-200">
              {isOwn && (
                <button
                  onClick={handleDeleteClick}
                  className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  삭제
                </button>
              )}
              {!isOwn && (
                <button
                  onClick={handleReply}
                  className="px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl text-sm font-medium hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl text-sm font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      {isOwn && showReadIndicator && (
        <div className="flex items-end mr-1">
          <span className="text-gray-900 text-xs animate-fade-in">읽음</span>
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
            <div className="text-sm whitespace-pre-wrap">
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
      </div>

      {/* 액션 메뉴 */}
      {showActions && !isDeleted && (
        <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)}>
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-2 flex gap-2 animate-in zoom-in-95 duration-200">
            {isOwn && (
              <>
                {type === 'text' && (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    수정
                  </button>
                )}
                <button
                  onClick={handleDeleteClick}
                  className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  삭제
                </button>
              </>
            )}
              {!isOwn && (
                <button
                  onClick={handleReply}
                  className="px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl text-sm font-medium hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl text-sm font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
