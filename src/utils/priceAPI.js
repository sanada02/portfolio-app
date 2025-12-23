// src/utils/priceAPI.js (配当対応版 - regenerateDailySnapshotsを修正)
import { getCache, setCache, clearCache, savePriceHistory, getPriceByDate, getClosestPrice, saveExchangeRate, getLatestExchangeRate, saveDailySnapshot } from './database';
import { getSellHistory } from './storage';
import { fetchYahooFinance, fetchFundData } from './tauriAPI';

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
    const data = await fetchYahooFinance({
      symbol,
      interval: '1d',
      range: '1d'
    });
    
    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }
    
    const quote = data.chart.result[0];
    const meta = quote.meta;

    // 市場の状態を確認（REGULAR = 取引中, POST = 市場終了後, CLOSED = 休場）
    const marketState = meta.marketState;
    const isMarketOpen = marketState === 'REGULAR';

    // 常に最新の価格を使用（regularMarketPriceが利用可能な場合はそれを使用）
    // regularMarketPriceは市場時間外でも当日の終値を保持している
    const price = meta.regularMarketPrice || meta.previousClose;
    const currency = meta.currency;

    const result = {
      price,
      currency,
      marketState,
      isMarketOpen
    };
    
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

    const data = await fetchYahooFinance({
      symbol,
      period1: startDate.toString(),
      period2: endDate.toString(),
      interval: '1d'
    });
    
    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    const meta = result.meta;
    const currency = meta.currency;

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

    // 市場の状態を確認
    const marketState = meta.marketState;
    const isMarketOpen = marketState === 'REGULAR';

    // 常に最新の価格を使用（regularMarketPriceが利用可能な場合はそれを使用）
    const latestPrice = meta.regularMarketPrice || prices[prices.length - 1];

    return {
      price: latestPrice,
      currency,
      marketState,
      isMarketOpen
    };
    
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
    const csvText = await fetchFundData({
      isinCd,
      associFundCd
    });
    
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

    const result = {
      price: latestPrice,
      currency: 'JPY',
      date: latestDate,
      marketState: 'CLOSED',  // 投資信託は常に閉場扱い
      isMarketOpen: false
    };
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
    const fallbackRate = 150;
    
    const today = new Date().toISOString().split('T')[0];
    try {
      await saveExchangeRate(today, fallbackRate);
      await setCache(cacheKey, { rate: fallbackRate });
    } catch (saveError) {
      console.error('フォールバック値の保存に失敗:', saveError);
    }
    
    return fallbackRate;
  }
};

export const getExchangeRateHistory = async (startDate, endDate = null) => {
  try {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(startDate);
    
    const period1 = Math.floor(start.getTime() / 1000);
    const period2 = Math.floor(end.getTime() / 1000);
    
    console.log(`⏳ 為替レート履歴を取得中（${startDate} ～ ${end.toISOString().split('T')[0]}）...`);

    const data = await fetchYahooFinance({
      symbol: 'USDJPY=X',
      period1: period1.toString(),
      period2: period2.toString(),
      interval: '1d'
    });
    
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

    const data = await fetchYahooFinance({
      symbol,
      period1: period1.toString(),
      period2: period2.toString(),
      interval: '1d'
    });
    
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
// 🔥 日次スナップショットを再生成（配当対応版）
// ===========================

export const regenerateDailySnapshots = async (portfolio) => {
  console.log('========================================');
  console.log('📊 日次スナップショットの再生成を開始します（配当対応）');
  console.log('========================================');
  
  if (portfolio.length === 0) {
    return { success: false, message: 'ポートフォリオが空です' };
  }
  
  // 売却履歴と配当データを取得
  const sellHistory = getSellHistory();
  const { getDividends } = await import('./storage');
  const dividends = getDividends();
  
  console.log(`配当データ: ${dividends.length}件`);
  
  // 🔥 直接インポートして無限再帰を防ぐ
  const db = (await import('./database')).default;
  
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
    
    // この日時点での保有銘柄を特定（購入日 <= 現在日）
    const assetsOnDate = portfolio.filter(asset => {
      const purchaseDate = new Date(asset.purchaseDate);
      return purchaseDate <= currentDate;
    });
    
    if (assetsOnDate.length === 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // 🔥 為替レートを直接DBから取得（無限再帰を防ぐ）
    let exchangeRate = 150;
    try {
      // 前後3日以内の最も近い為替レートを取得
      const targetTime = currentDate.getTime();
      const rates = await db.exchangeRates
        .where('date')
        .between(
          new Date(targetTime - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          new Date(targetTime + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        )
        .toArray();
      
      if (rates.length > 0) {
        const closest = rates.reduce((prev, curr) => {
          const prevDiff = Math.abs(new Date(prev.date).getTime() - targetTime);
          const currDiff = Math.abs(new Date(curr.date).getTime() - targetTime);
          return currDiff < prevDiff ? curr : prev;
        });
        exchangeRate = closest.rate;
      }
    } catch (error) {
      console.error(`為替レート取得エラー (${dateStr}):`, error);
    }
    
    // 🔥 この日までの累計配当を計算
    let cumulativeDividends = 0;
    try {
      cumulativeDividends = dividends
        .filter(div => {
          const divDate = new Date(div.date);
          return divDate <= currentDate;
        })
        .reduce((sum, div) => sum + div.amountJPY, 0);
    } catch (error) {
      console.error(`配当累計計算エラー (${dateStr}):`, error);
    }
    
    // 各銘柄のこの日の価格と実質保有数量を計算
    let totalValueJPY = 0;
    let totalValueUSD = 0;
    const breakdown = {};
    const assetBreakdown = {};
    let hasData = false;
    
    for (const asset of assetsOnDate) {
      // この日時点での売却済み数量を計算
      const soldQuantityOnDate = sellHistory
        .filter(record => {
          if (record.originalAssetId !== asset.id) return false;
          const sellDate = new Date(record.sellDate);
          return sellDate <= currentDate;
        })
        .reduce((sum, record) => sum + record.quantity, 0);
      
      // 実質保有数量 = 元の数量 - この日までの売却数量
      const activeQuantity = asset.quantity - soldQuantityOnDate;
      
      // 完全売却済みの場合はスキップ
      if (activeQuantity <= 0) {
        continue;
      }
      
      // 🔥 DBから直接価格を取得（無限再帰を防ぐ）
      let price = asset.purchasePrice; // デフォルト値
      
      try {
        // 前後3日以内の最も近い価格を取得
        const targetTime = currentDate.getTime();
        const priceKey = asset.symbol || asset.isinCd;
        const prices = await db.priceHistory
          .where('[symbol+date]')
          .between(
            [priceKey, new Date(targetTime - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]],
            [priceKey, new Date(targetTime + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]
          )
          .toArray();
        
        if (prices.length > 0) {
          const closest = prices.reduce((prev, curr) => {
            const prevDiff = Math.abs(new Date(prev.date).getTime() - targetTime);
            const currDiff = Math.abs(new Date(curr.date).getTime() - targetTime);
            return currDiff < prevDiff ? curr : prev;
          });
          price = closest.price;
          hasData = true;
        }
      } catch (error) {
        console.error(`価格取得エラー (${asset.name} @ ${dateStr}):`, error);
      }
      
      // 実質保有数量で価値を計算
      const value = asset.currency === 'USD' 
        ? price * activeQuantity * exchangeRate
        : price * activeQuantity;
      
      totalValueJPY += value;
      
      if (asset.currency === 'USD') {
        totalValueUSD += price * activeQuantity;
      }
      
      breakdown[asset.type] = (breakdown[asset.type] || 0) + value;
      
      // 銘柄別データの保存
      const assetKey = asset.symbol || asset.isinCd || asset.id;
      if (!assetBreakdown[assetKey]) {
        assetBreakdown[assetKey] = {
          id: asset.id,
          name: asset.name,
          symbol: asset.symbol,
          type: asset.type,
          tags: asset.tags || [],
          quantity: activeQuantity,
          price: price,
          currency: asset.currency,
          valueJPY: value,
          valueUSD: asset.currency === 'USD' ? price * activeQuantity : 0
        };
      } else {
        // 同じ銘柄が複数の購入記録で存在する場合は合算
        assetBreakdown[assetKey].quantity += activeQuantity;
        assetBreakdown[assetKey].valueJPY += value;
        assetBreakdown[assetKey].valueUSD += asset.currency === 'USD' ? price * activeQuantity : 0;
      }
    }
    
    // データがある場合のみスナップショットを保存（配当累計を含む）
    if (hasData) {
      await saveDailySnapshot(
        dateStr, 
        totalValueJPY, 
        totalValueUSD, 
        breakdown, 
        exchangeRate, 
        assetBreakdown,
        cumulativeDividends  // 🔥 配当累計を追加
      );
      snapshotCount++;
      
      if (snapshotCount % 10 === 0) {
        console.log(`進捗: ${snapshotCount}日分のスナップショットを生成`);
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log('\n========================================');
  console.log(`✓ ${snapshotCount}日分のスナップショットを生成しました（配当累計含む）`);
  console.log('========================================\n');
  
  return {
    success: true,
    snapshotCount
  };
};

// ===========================
// 今日のスナップショットを生成
// ===========================

export const generateTodaySnapshot = async (portfolio, exchangeRate) => {
  console.log('📸 今日のスナップショットを生成中...');

  const today = new Date().toISOString().split('T')[0];

  // 市場が開いている銘柄があるかチェック
  const hasOpenMarket = portfolio.some(asset => asset.isMarketOpen === true);

  if (hasOpenMarket) {
    console.log('⚠ 一部の市場が開場中です。開場中の銘柄は前回の確定価格を使用します。');
  }

  // 売却履歴と配当データを取得
  const sellHistory = getSellHistory();
  const { getDividends } = await import('./storage');
  const dividends = getDividends();

  // 今日までの累計配当を計算
  const todayDate = new Date(today);
  const cumulativeDividends = dividends
    .filter(div => new Date(div.date) <= todayDate)
    .reduce((sum, div) => sum + div.amountJPY, 0);

  // 最新のスナップショットを取得（市場開場中の銘柄の価格用）
  const { getDailySnapshots } = await import('./database');
  const snapshots = await getDailySnapshots(null);
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  // 各銘柄の現在の価格と実質保有数量を計算
  let totalValueJPY = 0;
  let totalValueUSD = 0;
  const breakdown = {};
  const assetBreakdown = {};

  for (const asset of portfolio) {
    // 今日時点での売却済み数量を計算
    const soldQuantityToday = sellHistory
      .filter(record => {
        if (record.originalAssetId !== asset.id) return false;
        const sellDate = new Date(record.sellDate);
        return sellDate <= todayDate;
      })
      .reduce((sum, record) => sum + record.quantity, 0);

    // 実質保有数量 = 元の数量 - 今日までの売却数量
    const activeQuantity = asset.quantity - soldQuantityToday;

    // 完全売却済みの場合はスキップ
    if (activeQuantity <= 0) {
      continue;
    }

    // 市場開場中の銘柄は、最新スナップショットの価格を使用（確定価格のみ記録）
    let priceToUse = asset.currentPrice || asset.purchasePrice;
    if (asset.isMarketOpen === true && latestSnapshot && latestSnapshot.assetBreakdown) {
      const assetKey = asset.symbol || asset.isinCd || asset.id;
      const snapshotAsset = latestSnapshot.assetBreakdown[assetKey];
      if (snapshotAsset && typeof snapshotAsset === 'object' && snapshotAsset.price) {
        priceToUse = snapshotAsset.price;
        console.log(`  ⚠ ${asset.name}: 市場開場中のため前回の確定価格 (${snapshotAsset.price}) を使用`);
      }
    }

    const currentPrice = priceToUse;
    const value = asset.currency === 'USD'
      ? currentPrice * activeQuantity * exchangeRate
      : currentPrice * activeQuantity;

    totalValueJPY += value;

    if (asset.currency === 'USD') {
      totalValueUSD += currentPrice * activeQuantity;
    }

    breakdown[asset.type] = (breakdown[asset.type] || 0) + value;

    // 銘柄別データの保存
    const assetKey = asset.symbol || asset.isinCd || asset.id;
    if (!assetBreakdown[assetKey]) {
      assetBreakdown[assetKey] = {
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        type: asset.type,
        tags: asset.tags || [],
        quantity: activeQuantity,
        price: currentPrice,
        currency: asset.currency,
        valueJPY: value,
        valueUSD: asset.currency === 'USD' ? currentPrice * activeQuantity : 0
      };
    } else {
      // 同じ銘柄が複数の購入記録で存在する場合は合算
      assetBreakdown[assetKey].quantity += activeQuantity;
      assetBreakdown[assetKey].valueJPY += value;
      assetBreakdown[assetKey].valueUSD += asset.currency === 'USD' ? currentPrice * activeQuantity : 0;
    }
  }

  // 今日のスナップショットを保存
  await saveDailySnapshot(
    today,
    totalValueJPY,
    totalValueUSD,
    breakdown,
    exchangeRate,
    assetBreakdown,
    cumulativeDividends
  );

  console.log(`✓ 今日のスナップショット (${today}) を保存しました`);

  return { success: true, date: today };
};

// ===========================
// バッチ更新（全銘柄）
// ===========================

export const updateAllPrices = async (portfolio) => {
  console.log('========================================');
  console.log('📊 価格更新を開始します');
  console.log('========================================');

  // キャッシュをクリアして最新の価格を取得
  await clearCache();

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
          exchangeRate: priceData.currency === 'USD' ? exchangeRate : null,
          marketState: priceData.marketState,
          isMarketOpen: priceData.isMarketOpen || false
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