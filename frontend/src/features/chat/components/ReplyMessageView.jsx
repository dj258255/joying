/**
 * ReplyMessageView Component
 * 답장 메시지 뷰 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {Object} props.replyTo - 답장 대상 메시지
 * @param {Function} props.onCancel - 답장 취소 핸들러
 */
const ReplyMessageView = ({ replyTo, onCancel }) => {
  if (!replyTo) return null;

  const { content, sender } = replyTo;

  return (
    <div className="bg-blue-50/80 border-l-4 border-blue-400 p-3 mb-2 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            {sender?.nickname || '알 수 없음'}에게 답장
          </div>
          <div className="text-sm text-gray-700 line-clamp-2 bg-white/50 p-2 rounded">
            {content}
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ReplyMessageView;
