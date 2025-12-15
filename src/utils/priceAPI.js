// src/utils/priceAPI.js
import { getCache, setCache, savePriceHistory, getPriceByDate, getClosestPrice, saveExchangeRate, getExchangeRate as getExchangeRateFromDB, saveDailySnapshot } from './database';
import { getSellHistory } from './storage';

// プロキシサーバーのURL
const PROXY_URL = 'http://localhost:3001';

// ===========================
// Yahoo Finance API（プロキシ経由）
// ===========================

// 現在価格を取得
export const getCurrentPrice = async (symbol) => {
  const cacheKey = `price_${symbol}`;
  
  // キャッシュチェック
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`✓ キャッシュから取得: ${symbol}`);
    return cached;
  }
  
  try {
    const url = `${PROXY_URL}/api/yahoo?symbol=${symbol}&interval=1d&range=1d`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }
    
    const quote = data.chart.result[0];
    const meta = quote.meta;
    const price = meta.regularMarketPrice || meta.previousClose;
    const currency = meta.currency;
    
    const result = { price, currency };
    
    // キャッシュに保存
    await setCache(cacheKey, result);
    
    // 今日の価格として履歴に保存
    const today = new Date().toISOString().split('T')[0];
    await savePriceHistory(symbol, today, price, currency);
    
    console.log(`✓ 価格取得成功: ${symbol} = ${currency} ${price}`);
    return result;
    
  } catch (error) {
    console.error(`✗ 価格取得エラー (${symbol}):`, error.message);
    return null;
  }
};

// 履歴データを取得
export const getHistoricalPrices = async (symbol, days = 30) => {
  try {
    // DBに昨日のデータがあるかチェック
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const existingPrice = await getPriceByDate(symbol, yesterdayStr);
    
    // 昨日のデータがあれば、今日分だけ取得
    if (existingPrice) {
      console.log(`✓ ${symbol}: 既存データあり。今日分のみ取得`);
      return await getCurrentPrice(symbol);
    }
    
    // データがない場合は全期間取得
    console.log(`⏳ ${symbol}: 履歴データを取得中（${days}日分）...`);
    
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
    
    const url = `${PROXY_URL}/api/yahoo?symbol=${symbol}&period1=${startDate}&period2=${endDate}&interval=1d`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    const currency = result.meta.currency;
    
    // 履歴を保存
    let savedCount = 0;
    for (let i = 0; i < timestamps.length; i++) {
      if (prices[i] !== null) {
        const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        await savePriceHistory(symbol, date, prices[i], currency);
        savedCount++;
      }
    }
    
    console.log(`✓ ${symbol}: ${savedCount}日分の履歴を保存`);
    
    const latestPrice = prices[prices.length - 1];
    return { price: latestPrice, currency };
    
  } catch (error) {
    console.error(`✗ 履歴取得エラー (${symbol}):`, error.message);
    // フォールバック: 現在価格だけ取得
    return await getCurrentPrice(symbol);
  }
};

// ===========================
// 投資信託 CSV API（プロキシ経由）
// ===========================

export const getFundPrice = async (isinCd, associFundCd) => {
  const cacheKey = `fund_${isinCd}`;
  
  // キャッシュチェック（1日1回）
  const cached = await getCache(cacheKey);
  if (cached) {
    const cachedDate = new Date(cached.date);
    const today = new Date();
    if (cachedDate.toDateString() === today.toDateString()) {
      console.log(`✓ キャッシュから取得: ${isinCd}`);
      return cached;
    }
  }
  
  try {
    const url = `${PROXY_URL}/api/fund?isinCd=${isinCd}&associFundCd=${associFundCd}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const csvText = await response.text();
    
    console.log('CSV生データ（最初の3行）:', csvText.split('\n').slice(0, 3).join('\n'));
    
    // CSV解析 - 全行を処理
    const lines = csvText.trim().split('\n');
    const dataLines = lines.filter(line => !line.startsWith('年月日') && line.trim());
    
    if (dataLines.length === 0) {
      throw new Error('CSVデータが空です');
    }
    
    let savedCount = 0;
    let latestPrice = null;
    let latestDate = null;
    
    // 全ての行を処理して履歴を保存
    for (const line of dataLines) {
      const columns = line.split(',');
      
      if (columns.length < 2) continue;
      
      const dateStr = columns[0].trim().replace(/"/g, '');
      const priceStr = columns[1].trim().replace(/"/g, '').replace(/,/g, '');
      
      // 日付解析
      let date;
      let dateMatch = dateStr.match(/(\d+)年(\d+)月(\d+)日/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        date = `${year}-${month}-${day}`;
      } else {
        dateMatch = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        if (dateMatch) {
          const year = dateMatch[1];
          const month = dateMatch[2].padStart(2, '0');
          const day = dateMatch[3].padStart(2, '0');
          date = `${year}-${month}-${day}`;
        } else {
          continue;
        }
      }
      
      const price = parseFloat(priceStr);
      if (isNaN(price)) continue;
      
      // 履歴に保存
      await savePriceHistory(isinCd, date, price, 'JPY');
      savedCount++;
      
      // 最新の価格を記録
      if (!latestDate || date > latestDate) {
        latestDate = date;
        latestPrice = price;
      }
    }
    
    console.log(`✓ 投資信託取得成功: ${isinCd} = ¥${latestPrice} (${latestDate}) - ${savedCount}日分の履歴を保存`);
    
    const result = { price: latestPrice, currency: 'JPY', date: latestDate };
    await setCache(cacheKey, result);
    
    return result;
    
  } catch (error) {
    console.error(`✗ 投資信託取得エラー (${isinCd}):`, error.message);
    throw error;
  }
};

// ===========================
// 為替レート取得
// ===========================

export const getExchangeRate = async () => {
  const cacheKey = 'exchange_rate_USDJPY';
  
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`✓ 為替レートをキャッシュから取得: ¥${cached.rate}`);
    return cached.rate;
  }
  
  try {
    const result = await getCurrentPrice('USDJPY=X');
    
    if (!result || !result.price) {
      throw new Error('為替レートの取得に失敗');
    }
    
    const rate = result.price;
    await setCache(cacheKey, { rate });
    
    console.log(`✓ 為替レート取得成功: ¥${rate}`);
    return rate;
    
  } catch (error) {
    console.error('✗ 為替レート取得エラー:', error.message);
    console.log('⚠ フォールバック値を使用: ¥150');
    return 150;
  }
};

export const getExchangeRateHistory = async (startDate, endDate = null) => {
  try {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(startDate);
    
    const period1 = Math.floor(start.getTime() / 1000);
    const period2 = Math.floor(end.getTime() / 1000);
    
    console.log(`⏳ 為替レート履歴を取得中（${startDate} ～ ${end.toISOString().split('T')[0]}）...`);
    
    const url = `${PROXY_URL}/api/yahoo?symbol=USDJPY=X&period1=${period1}&period2=${period2}&interval=1d`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    
    // 為替レート履歴を保存
    let savedCount = 0;
    for (let i = 0; i < timestamps.length; i++) {
      if (prices[i] !== null) {
        const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        await saveExchangeRate(date, prices[i]);
        savedCount++;
      }
    }
    
    console.log(`✓ 為替レート: ${savedCount}日分の履歴を保存`);
    
    return { success: true, count: savedCount };
    
  } catch (error) {
    console.error('✗ 為替レート履歴取得エラー:', error.message);
    return null;
  }
};

// ===========================
// 全履歴取得
// ===========================

export const getFullHistoricalPrices = async (symbol, startDate, endDate = null) => {
  try {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(startDate);
    
    const period1 = Math.floor(start.getTime() / 1000);
    const period2 = Math.floor(end.getTime() / 1000);
    
    console.log(`⏳ ${symbol}: 全履歴データを取得中（${startDate} ～ ${end.toISOString().split('T')[0]}）...`);
    
    const url = `${PROXY_URL}/api/yahoo?symbol=${symbol}&period1=${period1}&period2=${period2}&interval=1d`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    const currency = result.meta.currency;
    
    // 全履歴を保存
    let savedCount = 0;
    for (let i = 0; i < timestamps.length; i++) {
      if (prices[i] !== null) {
        const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        await savePriceHistory(symbol, date, prices[i], currency);
        savedCount++;
      }
    }
    
    console.log(`✓ ${symbol}: ${savedCount}日分の全履歴を保存`);
    
    return { success: true, count: savedCount, currency };
    
  } catch (error) {
    console.error(`✗ 全履歴取得エラー (${symbol}):`, error.message);
    return null;
  }
};

export const getPriceAtDate = async (symbol, date) => {
  const cacheKey = `price_${symbol}_${date}`;
  
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`✓ キャッシュから取得: ${symbol} @ ${date}`);
    return cached;
  }
  
  const dbPrice = await getPriceByDate(symbol, date);
  if (dbPrice) {
    console.log(`✓ DBから取得: ${symbol} @ ${date} = ${dbPrice.currency} ${dbPrice.price}`);
    return { price: dbPrice.price, currency: dbPrice.currency };
  }
  
  console.log(`⏳ ${symbol}: ${date}の価格を取得するため履歴をダウンロード中...`);
  
  const purchaseDate = new Date(date);
  const startDate = new Date(purchaseDate);
  startDate.setMonth(startDate.getMonth() - 1);
  
  await getFullHistoricalPrices(symbol, startDate.toISOString().split('T')[0], date);
  
  const closestPrice = await getClosestPrice(symbol, date);
  
  if (closestPrice) {
    const result = { price: closestPrice.price, currency: closestPrice.currency };
    await setCache(cacheKey, result);
    return result;
  }
  
  return null;
};

// ===========================
// 全履歴データの再構築
// ===========================

export const rebuildAllHistory = async (portfolio) => {
  console.log('========================================');
  console.log('📊 全履歴データの再構築を開始します');
  console.log('========================================');
  
  if (portfolio.length === 0) {
    return { success: false, message: 'ポートフォリオが空です' };
  }
  
  const oldestPurchaseDate = portfolio.reduce((oldest, asset) => {
    const purchaseDate = new Date(asset.purchaseDate);
    return !oldest || purchaseDate < oldest ? purchaseDate : oldest;
  }, null);
  
  console.log(`最古の購入日: ${oldestPurchaseDate.toISOString().split('T')[0]}`);
  
  const hasUSD = portfolio.some(asset => asset.currency === 'USD');
  if (hasUSD) {
    console.log('\n為替レート履歴を取得中...');
    await getExchangeRateHistory(oldestPurchaseDate.toISOString().split('T')[0]);
  }
  
  const errors = [];
  
  for (let i = 0; i < portfolio.length; i++) {
    const asset = portfolio[i];
    console.log(`\n[${i + 1}/${portfolio.length}] ${asset.name} の履歴を取得中...`);
    
    try {
      if (asset.type === 'fund') {
        await getFundPrice(asset.isinCd, asset.associFundCd);
      } else {
        const startDate = asset.purchaseDate;
        await getFullHistoricalPrices(asset.symbol, startDate);
      }
    } catch (error) {
      console.error(`✗ ${asset.name}: ${error.message}`);
      errors.push(`${asset.name}: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n========================================');
  console.log('✓ 全履歴データの取得が完了しました');
  console.log('========================================\n');
  
  return {
    success: true,
    oldestDate: oldestPurchaseDate.toISOString().split('T')[0],
    errors: errors.length > 0 ? errors : null
  };
};

// ===========================
// 🔥 日次スナップショットを再生成（売却対応版）
// ===========================

export const regenerateDailySnapshots = async (portfolio) => {
  console.log('========================================');
  console.log('📊 日次スナップショットの再生成を開始します');
  console.log('========================================');
  
  if (portfolio.length === 0) {
    return { success: false, message: 'ポートフォリオが空です' };
  }
  
  // 売却履歴を取得
  const sellHistory = getSellHistory();
  
  // 動的インポート
  const { getClosestExchangeRate } = await import('./database');
  
  // 最も古い購入日を特定
  const oldestPurchaseDate = portfolio.reduce((oldest, asset) => {
    const purchaseDate = new Date(asset.purchaseDate);
    return !oldest || purchaseDate < oldest ? purchaseDate : oldest;
  }, null);
  
  const today = new Date();
  const startDate = new Date(oldestPurchaseDate);
  
  console.log(`期間: ${startDate.toISOString().split('T')[0]} ～ ${today.toISOString().split('T')[0]}`);
  
  let snapshotCount = 0;
  const currentDate = new Date(startDate);
  
  // 日付を1日ずつ進めながらスナップショットを生成
  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // 🔥 この日時点での保有銘柄を特定（購入日 <= 現在日）
    const assetsOnDate = portfolio.filter(asset => {
      const purchaseDate = new Date(asset.purchaseDate);
      return purchaseDate <= currentDate;
    });
    
    if (assetsOnDate.length === 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // この日の為替レートを取得
    const exchangeRate = await getClosestExchangeRate(dateStr) || 150;
    
    // 各銘柄のこの日の価格と実質保有数量を計算
    let totalValueJPY = 0;
    let totalValueUSD = 0;
    const breakdown = {};
    let hasData = false;
    
    for (const asset of assetsOnDate) {
      // 🔥 この日時点での売却済み数量を計算
      const soldQuantityOnDate = sellHistory
        .filter(record => {
          // この銘柄の売却記録のみ
          if (record.originalAssetId !== asset.id) return false;
          // この日より前または同日に売却されたもの
          const sellDate = new Date(record.sellDate);
          return sellDate <= currentDate;
        })
        .reduce((sum, record) => sum + record.quantity, 0);
      
      // 🔥 実質保有数量 = 元の数量 - この日までの売却数量
      const activeQuantity = asset.quantity - soldQuantityOnDate;
      
      // 完全売却済みの場合はスキップ
      if (activeQuantity <= 0) {
        continue;
      }
      
      // DBから最も近い日の価格を取得
      const priceData = await getClosestPrice(asset.symbol || asset.isinCd, dateStr);
      
      let price = null;
      if (priceData) {
        price = priceData.price;
        hasData = true;
      } else {
        // データがなければ取得単価を使用
        price = asset.purchasePrice;
      }
      
      // 🔥 実質保有数量で価値を計算
      const value = asset.currency === 'USD' 
        ? price * activeQuantity * exchangeRate
        : price * activeQuantity;
      
      totalValueJPY += value;
      
      if (asset.currency === 'USD') {
        totalValueUSD += price * activeQuantity;
      }
      
      breakdown[asset.type] = (breakdown[asset.type] || 0) + value;
    }
    
    // データがある場合のみスナップショットを保存
    if (hasData) {
      await saveDailySnapshot(dateStr, totalValueJPY, totalValueUSD, breakdown);
      snapshotCount++;
      
      if (snapshotCount % 10 === 0) {
        console.log(`進捗: ${snapshotCount}日分のスナップショットを生成`);
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log('\n========================================');
  console.log(`✓ ${snapshotCount}日分のスナップショットを生成しました`);
  console.log('========================================\n');
  
  return {
    success: true,
    snapshotCount
  };
};

// ===========================
// バッチ更新（全銘柄）
// ===========================

export const updateAllPrices = async (portfolio) => {
  console.log('========================================');
  console.log('📊 価格更新を開始します');
  console.log('========================================');
  
  const exchangeRate = await getExchangeRate();
  const results = [];
  const errors = [];
  
  for (let i = 0; i < portfolio.length; i++) {
    const asset = portfolio[i];
    console.log(`\n[${i + 1}/${portfolio.length}] ${asset.name}`);
    
    let priceData;
    
    try {
      if (asset.type === 'fund') {
        priceData = await getFundPrice(asset.isinCd, asset.associFundCd);
      } else {
        priceData = await getHistoricalPrices(asset.symbol, 30);
      }
      
      if (priceData) {
        results.push({
          ...asset,
          currentPrice: priceData.price,
          currency: priceData.currency,
          exchangeRate: priceData.currency === 'USD' ? exchangeRate : null
        });
      } else {
        console.log(`⚠ ${asset.name}: 価格取得失敗、前回の値を使用`);
        results.push(asset);
        errors.push(`${asset.name}: 価格取得に失敗しました`);
      }
    } catch (error) {
      console.log(`✗ ${asset.name}: エラー - ${error.message}`);
      results.push(asset);
      errors.push(`${asset.name}: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n========================================');
  console.log('✓ 価格更新が完了しました');
  console.log('========================================\n');
  
  return { 
    portfolio: results, 
    exchangeRate,
    errors: errors.length > 0 ? errors : null
  };
};