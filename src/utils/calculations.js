// src/utils/calculations.js

export const calculateAssetValue = (asset, exchangeRate) => {
  const price = asset.currentPrice || asset.purchasePrice;
  const quantity = asset.quantity;
  if (asset.currency === 'USD') {
    return price * quantity * exchangeRate;
  }
  return price * quantity;
};

export const calculateAssetValueInOriginalCurrency = (asset) => {
  const price = asset.currentPrice || asset.purchasePrice;
  return price * asset.quantity;
};

export const calculateTotalValue = (portfolio, exchangeRate) => {
  return portfolio.reduce((sum, asset) => sum + calculateAssetValue(asset, exchangeRate), 0);
};

export const calculateTotalValueUSD = (portfolio) => {
  return portfolio
    .filter(asset => asset.currency === 'USD')
    .reduce((sum, asset) => {
      const price = asset.currentPrice || asset.purchasePrice;
      return sum + price * asset.quantity;
    }, 0);
};

export const calculateTotalProfitLoss = (portfolio, exchangeRate) => {
  return portfolio.reduce((sum, asset) => {
    const currentValue = calculateAssetValue(asset, exchangeRate);
    const purchasePriceJPY = asset.currency === 'USD' 
      ? asset.purchasePrice * asset.quantity * exchangeRate
      : asset.purchasePrice * asset.quantity;
    return sum + (currentValue - purchasePriceJPY);
  }, 0);
};

export const groupAssetsBySymbol = (portfolio) => {
  return portfolio.reduce((groups, asset) => {
    const key = asset.symbol || asset.isinCd;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(asset);
    return groups;
  }, {});
};