// src/utils/calculations.js

/**
 * 特定の銘柄の実質保有数量を計算（元の数量 - 売却済み数量）
 * @param {Object} asset - 資産オブジェクト
 * @param {Array} sellHistory - 売却履歴配列（必須）
 * @returns {number} 実質保有数量
 */
export const getActiveQuantity = (asset, sellHistory = []) => {
  if (!sellHistory || sellHistory.length === 0) {
    return asset.quantity;
  }
  
  const soldQuantity = sellHistory
    .filter(record => record.originalAssetId === asset.id)
    .reduce((sum, record) => sum + record.quantity, 0);
  
  return Math.max(0, asset.quantity - soldQuantity);
};

/**
 * 資産の現在価値を計算（売却済み数量を考慮、円建て）
 * @param {Object} asset - 資産オブジェクト
 * @param {Array} sellHistory - 売却履歴配列
 * @param {number} exchangeRate - 為替レート
 * @returns {number} 評価額（円）
 */
export const calculateAssetValue = (asset, sellHistory = [], exchangeRate = 150) => {
  const activeQuantity = getActiveQuantity(asset, sellHistory);
  
  if (activeQuantity <= 0) {
    return 0;
  }
  
  const price = asset.currentPrice || asset.purchasePrice;
  
  if (asset.currency === 'USD') {
    return price * activeQuantity * exchangeRate;
  }
  return price * activeQuantity;
};

/**
 * 資産の元通貨での価値を計算
 * @param {Object} asset - 資産オブジェクト
 * @param {Array} sellHistory - 売却履歴配列
 * @returns {number} 評価額（元通貨）
 */
export const calculateAssetValueInOriginalCurrency = (asset, sellHistory = []) => {
  const activeQuantity = getActiveQuantity(asset, sellHistory);
  
  if (activeQuantity <= 0) {
    return 0;
  }
  
  const price = asset.currentPrice || asset.purchasePrice;
  return price * activeQuantity;
};

/**
 * ポートフォリオ全体の価値を計算（円建て）
 * @param {Array} portfolio - ポートフォリオ配列
 * @param {Array} sellHistory - 売却履歴配列
 * @param {number} exchangeRate - 為替レート
 * @returns {number} 総評価額（円）
 */
export const calculateTotalValue = (portfolio, sellHistory = [], exchangeRate = 150) => {
  return portfolio.reduce((sum, asset) => {
    return sum + calculateAssetValue(asset, sellHistory, exchangeRate);
  }, 0);
};

/**
 * USD建て資産の合計を計算
 * @param {Array} portfolio - ポートフォリオ配列
 * @param {Array} sellHistory - 売却履歴配列
 * @returns {number} USD建て評価額
 */
export const calculateTotalValueUSD = (portfolio, sellHistory = []) => {
  return portfolio
    .filter(asset => asset.currency === 'USD')
    .reduce((sum, asset) => {
      const activeQuantity = getActiveQuantity(asset, sellHistory);
      
      if (activeQuantity <= 0) {
        return sum;
      }
      
      const price = asset.currentPrice || asset.purchasePrice;
      return sum + price * activeQuantity;
    }, 0);
};

/**
 * 総損益を計算（売却済み資産を除外）
 * @param {Array} portfolio - ポートフォリオ配列
 * @param {Array} sellHistory - 売却履歴配列
 * @param {number} exchangeRate - 為替レート
 * @returns {number} 総損益（円）
 */
export const calculateTotalProfitLoss = (portfolio, sellHistory = [], exchangeRate = 150) => {
  return portfolio.reduce((sum, asset) => {
    const activeQuantity = getActiveQuantity(asset, sellHistory);
    
    if (activeQuantity <= 0) {
      return sum;
    }
    
    const currentPrice = asset.currentPrice || asset.purchasePrice;
    const currentValue = asset.currency === 'USD' 
      ? currentPrice * activeQuantity * exchangeRate
      : currentPrice * activeQuantity;
    
    const purchasePriceJPY = asset.currency === 'USD' 
      ? asset.purchasePrice * activeQuantity * exchangeRate
      : asset.purchasePrice * activeQuantity;
    
    return sum + (currentValue - purchasePriceJPY);
  }, 0);
};

/**
 * 銘柄をシンボルでグループ化（売却考慮、完全売却済みを除外）
 * @param {Array} portfolio - ポートフォリオ配列
 * @param {Array} sellHistory - 売却履歴配列
 * @returns {Object} グループ化された資産
 */
export const groupAssetsBySymbol = (portfolio, sellHistory = []) => {
  // 完全売却済みの銘柄を事前にフィルタリング
  const activeAssets = portfolio.filter(asset => {
    const activeQuantity = getActiveQuantity(asset, sellHistory);
    return activeQuantity > 0;
  });
  
  // グループ化
  return activeAssets.reduce((groups, asset) => {
    const key = asset.symbol || asset.isinCd;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(asset);
    return groups;
  }, {});
};

/**
 * 売却履歴から累計損益を計算
 * @param {Array} sellHistory - 売却履歴配列
 * @returns {Object} { totalProfit: 累計損益（円）, count: 売却回数 }
 */
export const calculateSellHistorySummary = (sellHistory = []) => {
  const totalProfit = sellHistory.reduce((sum, record) => sum + record.profitJPY, 0);
  return {
    totalProfit,
    count: sellHistory.length
  };
};