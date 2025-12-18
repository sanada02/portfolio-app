// src/utils/database.js (配当対応版)
import Dexie from 'dexie';

// IndexedDB の初期化
const db = new Dexie('PortfolioDB');

// バージョンを5に変更（スキーマ変更: dailySnapshotsに配当累計追加）
db.version(5).stores({
  // 価格履歴（日次）
  priceHistory: '[symbol+date], symbol, date, price, currency',
  
  // ポートフォリオスナップショット（日次）- 配当累計追加
  dailySnapshots: 'date, totalValueJPY, totalValueUSD, breakdown, exchangeRate, assetBreakdown, cumulativeDividends',
  
  // 為替レート履歴
  exchangeRates: 'date, rate',
  
  // APIキャッシュ（5分間有効）
  apiCache: 'key, data, timestamp'
});

// 旧バージョンとの互換性
db.version(4).stores({
  priceHistory: '[symbol+date], symbol, date, price, currency',
  dailySnapshots: 'date, totalValueJPY, totalValueUSD, breakdown, exchangeRate, assetBreakdown',
  exchangeRates: 'date, rate',
  apiCache: 'key, data, timestamp'
});

db.version(3).stores({
  priceHistory: '[symbol+date], symbol, date, price, currency',
  dailySnapshots: 'date, totalValueJPY, totalValueUSD, breakdown, exchangeRate',
  exchangeRates: 'date, rate',
  apiCache: 'key, data, timestamp'
});

db.version(2).stores({
  priceHistory: '[symbol+date], symbol, date, price, currency',
  dailySnapshots: 'date, totalValueJPY, totalValueUSD, breakdown',
  exchangeRates: 'date, rate',
  apiCache: 'key, data, timestamp'
});

// ===========================
// 価格履歴の操作
// ===========================

// 価格履歴を保存
export const savePriceHistory = async (symbol, date, price, currency = 'JPY') => {
  await db.priceHistory.put({ symbol, date, price, currency });
};

// 特定銘柄の履歴を取得
export const getPriceHistory = async (symbol, days = 30) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await db.priceHistory
    .where('[symbol+date]')
    .between(
      [symbol, startDate.toISOString().split('T')[0]],
      [symbol, endDate.toISOString().split('T')[0]]
    )
    .toArray();
};

// 特定日の価格を取得
export const getPriceByDate = async (symbol, date) => {
  return await db.priceHistory.get({ symbol, date });
};

// ===========================
// 日次スナップショット
// ===========================

/**
 * 日次スナップショットを保存（配当累計対応）
 * @param {string} date - 日付 'YYYY-MM-DD'
 * @param {number} totalValueJPY - 総評価額（円）
 * @param {number} totalValueUSD - USD資産の総評価額
 * @param {Object} breakdown - 種別ごとの内訳
 * @param {number|null} exchangeRate - 為替レート
 * @param {Object|null} assetBreakdown - 銘柄別データ
 * @param {number} cumulativeDividends - この日までの累計配当（円）
 */
export const saveDailySnapshot = async (
  date, 
  totalValueJPY, 
  totalValueUSD, 
  breakdown, 
  exchangeRate = null, 
  assetBreakdown = null,
  cumulativeDividends = 0
) => {
  await db.dailySnapshots.put({ 
    date, 
    totalValueJPY, 
    totalValueUSD, 
    breakdown, 
    exchangeRate, 
    assetBreakdown,
    cumulativeDividends
  });
};

/**
 * 日次スナップショットを取得
 * @param {number|null} days - 取得日数（nullの場合は全データ）
 * @returns {Array} スナップショットの配列
 */
export const getDailySnapshots = async (days = 30) => {
  // daysがnullの場合は全データを取得
  if (days === null) {
    return await db.dailySnapshots
      .orderBy('date')
      .toArray();
  }
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  return await db.dailySnapshots
    .where('date')
    .between(startStr, endStr)
    .sortBy('date');
};

// ===========================
// 為替レート
// ===========================

export const saveExchangeRate = async (date, rate) => {
  await db.exchangeRates.put({ date, rate });
};

export const getExchangeRate = async (date) => {
  return await db.exchangeRates.get(date);
};

export const getLatestExchangeRate = async () => {
  const rates = await db.exchangeRates.orderBy('date').reverse().limit(1).toArray();
  return rates.length > 0 ? rates[0].rate : null;
};

// ===========================
// APIキャッシュ（5分間有効）
// ===========================

export const getCache = async (key) => {
  const cached = await db.apiCache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  const age = now - cached.timestamp;
  
  // 5分（300秒）以上経過していたら無効
  if (age > 5 * 60 * 1000) {
    await db.apiCache.delete(key);
    return null;
  }
  
  return cached.data;
};

export const setCache = async (key, data) => {
  await db.apiCache.put({
    key,
    data,
    timestamp: Date.now()
  });
};

export default db;

// ===========================
// 全履歴データの操作
// ===========================

// 特定銘柄の全履歴を取得（日付範囲指定）
export const getPriceHistoryRange = async (symbol, startDate, endDate) => {
  return await db.priceHistory
    .where('[symbol+date]')
    .between(
      [symbol, startDate],
      [symbol, endDate]
    )
    .toArray();
};

// 特定日に最も近い価格を取得（前後3日以内）
export const getClosestPrice = async (symbol, targetDate) => {
  const target = new Date(targetDate);
  
  // 前後3日分を検索
  const startDate = new Date(target);
  startDate.setDate(startDate.getDate() - 3);
  const endDate = new Date(target);
  endDate.setDate(endDate.getDate() + 3);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  const prices = await db.priceHistory
    .where('[symbol+date]')
    .between([symbol, startStr], [symbol, endStr])
    .toArray();
  
  if (prices.length === 0) return null;
  
  // 最も近い日付を探す
  const targetTime = target.getTime();
  const closest = prices.reduce((prev, curr) => {
    const prevDiff = Math.abs(new Date(prev.date).getTime() - targetTime);
    const currDiff = Math.abs(new Date(curr.date).getTime() - targetTime);
    return currDiff < prevDiff ? curr : prev;
  });
  
  return closest;
};

// 特定日に最も近い為替レートを取得
export const getClosestExchangeRate = async (targetDate) => {
  const target = new Date(targetDate);
  
  // 前後3日分を検索
  const startDate = new Date(target);
  startDate.setDate(startDate.getDate() - 3);
  const endDate = new Date(target);
  endDate.setDate(endDate.getDate() + 3);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  const rates = await db.exchangeRates
    .where('date')
    .between(startStr, endStr)
    .toArray();
  
  if (rates.length === 0) return null;
  
  // 最も近い日付を探す
  const targetTime = target.getTime();
  const closest = rates.reduce((prev, curr) => {
    const prevDiff = Math.abs(new Date(prev.date).getTime() - targetTime);
    const currDiff = Math.abs(new Date(curr.date).getTime() - targetTime);
    return currDiff < prevDiff ? curr : prev;
  });
  
  return closest.rate;
};