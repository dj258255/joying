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
    <div className="bg-gray-100 border-l-4 border-blue-500 p-3 mb-2 rounded-r-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs text-gray-600 mb-1">
            {sender?.nickname || '알 수 없음'}에게 답장
          </div>
          <div className="text-sm text-gray-800 line-clamp-2">
            {content}
          </div>
        </div>
        <button
          onClick={onCancel}
          className="ml-2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ReplyMessageView;
