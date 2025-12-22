// src/utils/dateUtils.js
// 日本時間 (GMT+9) 対応のユーティリティ関数

/**
 * 日本時間の今日の日付を取得（YYYY-MM-DD形式）
 */
export const getTodayJST = () => {
  const now = new Date();
  const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  
  const year = jstDate.getFullYear();
  const month = String(jstDate.getMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 日付文字列を日本時間でフォーマット
 */
export const formatDateJST = (dateStr, options = {}) => {
  const date = new Date(dateStr);
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
    ...options
  };
  
  return date.toLocaleDateString('ja-JP', defaultOptions);
};

/**
 * 日付文字列を日本時間の日時でフォーマット
 */
export const formatDateTimeJST = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Tokyo'
  });
};

/**
 * 日本時間で日付を比較
 */
export const compareDatesJST = (date1Str, date2Str) => {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  
  // 日本時間の日付部分のみを取得
  const jst1 = new Date(d1.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const jst2 = new Date(d2.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  
  jst1.setHours(0, 0, 0, 0);
  jst2.setHours(0, 0, 0, 0);
  
  return jst1.getTime() - jst2.getTime();
};

/**
 * 日本時間で日付範囲を生成
 */
export const generateDateRangeJST = (startDateStr, endDateStr) => {
  const dates = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  // 日本時間で正規化
  const jstStart = new Date(start.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const jstEnd = new Date(end.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  
  jstStart.setHours(0, 0, 0, 0);
  jstEnd.setHours(0, 0, 0, 0);
  
  const current = new Date(jstStart);
  
  while (current <= jstEnd) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

/**
 * 日本時間で最も古い日付を取得
 */
export const getOldestDateJST = (dates) => {
  if (!dates || dates.length === 0) return null;
  
  return dates.reduce((oldest, current) => {
    return compareDatesJST(current, oldest) < 0 ? current : oldest;
  });
};

/**
 * 日本時間でN日前の日付を取得
 */
export const getDaysAgoJST = (days) => {
  const now = new Date();
  const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  jstNow.setDate(jstNow.getDate() - days);
  
  const year = jstNow.getFullYear();
  const month = String(jstNow.getMonth() + 1).padStart(2, '0');
  const day = String(jstNow.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 日付文字列が有効かチェック
 */
export const isValidDateStr = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * ISO文字列を日本時間の日付に変換
 */
export const isoToJSTDate = (isoStr) => {
  const date = new Date(isoStr);
  const jstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  
  const year = jstDate.getFullYear();
  const month = String(jstDate.getMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 日本時間で日付範囲の日数を計算
 */
export const daysBetweenJST = (startDateStr, endDateStr) => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const jstStart = new Date(start.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const jstEnd = new Date(end.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

  jstStart.setHours(0, 0, 0, 0);
  jstEnd.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(jstEnd - jstStart);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * 日本時間で今年の最初の日を取得
 */
export const getYearStartJST = () => {
  const now = new Date();
  const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

  const year = jstNow.getFullYear();
  return `${year}-01-01`;
};

/**
 * 期間タイプに応じた比較開始日を取得
 * @param {'day' | 'week' | 'month' | 'year'} periodType
 * @returns {string} YYYY-MM-DD形式の日付
 */
export const getComparisonStartDate = (periodType) => {
  switch (periodType) {
    case 'day':
      return getDaysAgoJST(1);
    case 'week':
      return getDaysAgoJST(7);
    case 'month':
      return getDaysAgoJST(30);
    case 'year':
      return getYearStartJST();
    default:
      return getDaysAgoJST(1);
  }
};