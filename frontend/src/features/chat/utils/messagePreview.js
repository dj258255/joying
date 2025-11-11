export const MAX_DELETED_CONTENT = '삭제된 메시지입니다.';

export const getMessagePreview = (message) => {
  if (!message) return '';

  if (message.isDeleted) {
    return MAX_DELETED_CONTENT;
  }

  const type = (message.type || '').toString().toLowerCase();

  if (type === 'image') {
    return '📷 이미지';
  }

  if (type === 'file') {
    return message.fileName ? `📎 ${message.fileName}` : '📎 파일';
  }

  if (type === 'system') {
    return message.content || '시스템 메시지';
  }

  if (message.replyTo) {
    return `답장: ${message.content || ''}`.trim();
  }

  return message.content || '';
};

