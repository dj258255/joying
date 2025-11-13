/**
 * CourierSelect Component
 * 택배사 선택 및 운송장 번호 입력 컴포넌트
 */

import React from 'react';

const courierOptions = [
  { value: 'cj', label: 'CJ대한통운' },
  { value: 'post', label: '우체국택배' },
  { value: 'lotte', label: '롯데택배' },
  { value: 'hanjin', label: '한진택배' },
  { value: 'logen', label: '로젠택배' },
];

/**
 * @param {Object} props
 * @param {string} props.courier - 선택된 택배사 코드
 * @param {Function} props.onCourierChange - 택배사 변경 핸들러
 * @param {string} props.trackingNumber - 운송장 번호
 * @param {Function} props.onTrackingNumberChange - 운송장 번호 변경 핸들러
 * @param {string} props.type - 타입 ('outbound' | 'return')
 */
const CourierSelect = ({
  courier,
  onCourierChange,
  trackingNumber,
  onTrackingNumberChange,
  type = 'outbound'
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          택배사 선택 *
        </label>
        <select
          value={courier}
          onChange={(e) => onCourierChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">택배사를 선택하세요</option>
          {courierOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          운송장 번호 *
        </label>
        <input
          type="text"
          value={trackingNumber}
          onChange={(e) => onTrackingNumberChange(e.target.value.replace(/\D/g, ''))}
          placeholder="숫자만 입력하세요"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-500 mt-1">
          {type === 'outbound' ? '발송' : '반납'} 송장번호를 정확히 입력해주세요
        </p>
      </div>
    </div>
  );
};

export default CourierSelect;
export { courierOptions };
