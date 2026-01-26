// src/utils/calculations.js (HKD対応版)

// 為替レートを取得するヘルパー関数
// exchangeRatesはオブジェクト { USD: 150, HKD: 20 } または単一の数値（後方互換性のため）
const getExchangeRateForCurrency = (currency, exchangeRates) => {
  if (currency === 'JPY') return 1;

  // exchangeRatesがオブジェクトの場合
  if (typeof exchangeRates === 'object' && exchangeRates !== null) {
    return exchangeRates[currency] || 1;
  }

  // 後方互換性: exchangeRatesが数値の場合はUSD用として扱う
  if (typeof exchangeRates === 'number' && currency === 'USD') {
    return exchangeRates;
  }

  return 1;
};

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

// 資産の現在価値を計算（売却済み数量を考慮）- 複数通貨対応
export const calculateAssetValue = (asset, sellHistory, exchangeRates) => {
  const activeQuantity = getActiveQuantity(asset, sellHistory);
  const price = asset.currentPrice || asset.purchasePrice;
  const rate = getExchangeRateForCurrency(asset.currency, exchangeRates);

  return price * activeQuantity * rate;
};

// 資産の元通貨での価値を計算
export const calculateAssetValueInOriginalCurrency = (asset, sellHistory) => {
  const activeQuantity = getActiveQuantity(asset, sellHistory);
  const price = asset.currentPrice || asset.purchasePrice;
  return price * activeQuantity;
};

// ポートフォリオ全体の価値を計算（円建て）- 複数通貨対応
export const calculateTotalValue = (portfolio, sellHistory, exchangeRates) => {
  return portfolio.reduce((sum, asset) => {
    return sum + calculateAssetValue(asset, sellHistory, exchangeRates);
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

// HKD建て資産の合計を計算
export const calculateTotalValueHKD = (portfolio, sellHistory) => {
  return portfolio
    .filter(asset => asset.currency === 'HKD')
    .reduce((sum, asset) => {
      const activeQuantity = getActiveQuantity(asset, sellHistory);
      const price = asset.currentPrice || asset.purchasePrice;
      return sum + price * activeQuantity;
    }, 0);
};

// 総損益を計算（売却済み資産を除外）- 複数通貨対応
export const calculateTotalProfitLoss = (portfolio, sellHistory, exchangeRates) => {
  return portfolio.reduce((sum, asset) => {
    const activeQuantity = getActiveQuantity(asset, sellHistory);

    if (activeQuantity <= 0) {
      return sum; // 完全売却済みの場合はスキップ
    }

    const rate = getExchangeRateForCurrency(asset.currency, exchangeRates);
    const currentPrice = asset.currentPrice || asset.purchasePrice;
    const currentValue = currentPrice * activeQuantity * rate;
    const purchasePriceJPY = asset.purchasePrice * activeQuantity * rate;

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

// 通貨シンボルを取得
export const getCurrencySymbol = (currency) => {
  switch (currency) {
    case 'USD': return '$';
    case 'HKD': return 'HK$';
    case 'JPY': return '¥';
    default: return '¥';
  }
};