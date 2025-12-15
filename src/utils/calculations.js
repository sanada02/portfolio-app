// src/utils/calculations.js

// 特定の銘柄の実質保有数量を計算（元の数量 - 売却済み数量）
export const getActiveQuantity = (asset, sellHistory) => {
  if (!sellHistory || sellHistory.length === 0) {
    return asset.quantity;
  }
  
  const soldQuantity = sellHistory
    .filter(record => record.originalAssetId === asset.id)
    .reduce((sum, record) => sum + record.quantity, 0);
  
  return asset.quantity - soldQuantity;
};

// 資産の現在価値を計算（売却済み数量を考慮）
export const calculateAssetValue = (asset, sellHistory, exchangeRate) => {
  const activeQuantity = getActiveQuantity(asset, sellHistory);
  const price = asset.currentPrice || asset.purchasePrice;
  
  if (asset.currency === 'USD') {
    return price * activeQuantity * exchangeRate;
  }
  return price * activeQuantity;
};

// 資産の元通貨での価値を計算
export const calculateAssetValueInOriginalCurrency = (asset, sellHistory) => {
  const activeQuantity = getActiveQuantity(asset, sellHistory);
  const price = asset.currentPrice || asset.purchasePrice;
  return price * activeQuantity;
};

// ポートフォリオ全体の価値を計算（円建て）
export const calculateTotalValue = (portfolio, sellHistory, exchangeRate) => {
  return portfolio.reduce((sum, asset) => {
    return sum + calculateAssetValue(asset, sellHistory, exchangeRate);
  }, 0);
};

// USD建て資産の合計を計算
export const calculateTotalValueUSD = (portfolio, sellHistory) => {
  return portfolio
    .filter(asset => asset.currency === 'USD')
    .reduce((sum, asset) => {
      const activeQuantity = getActiveQuantity(asset, sellHistory);
      const price = asset.currentPrice || asset.purchasePrice;
      return sum + price * activeQuantity;
    }, 0);
};

// 総損益を計算（売却済み資産を除外）
export const calculateTotalProfitLoss = (portfolio, sellHistory, exchangeRate) => {
  return portfolio.reduce((sum, asset) => {
    const activeQuantity = getActiveQuantity(asset, sellHistory);
    
    if (activeQuantity <= 0) {
      return sum; // 完全売却済みの場合はスキップ
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

// 銘柄をシンボルでグループ化（売却考慮）
export const groupAssetsBySymbol = (portfolio, sellHistory) => {
  return portfolio.reduce((groups, asset) => {
    const activeQuantity = getActiveQuantity(asset, sellHistory);
    
    // 完全売却済みの銘柄は表示しない
    if (activeQuantity <= 0) {
      return groups;
    }
    
    const key = asset.symbol || asset.isinCd;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(asset);
    return groups;
  }, {});
};