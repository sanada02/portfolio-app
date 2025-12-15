// src/utils/storage.js

export const getPortfolio = () => {
  const data = localStorage.getItem('portfolio');
  return data ? JSON.parse(data) : [];
};

export const savePortfolio = (portfolio) => {
  localStorage.setItem('portfolio', JSON.stringify(portfolio));
};

export const assetTypeNames = {
  stock: '株式',
  etf: 'ETF',
  fund: '投資信託',
  crypto: '仮想通貨'
};

export const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const getSellHistory = () => {
  const data = localStorage.getItem('sellHistory');
  return data ? JSON.parse(data) : [];
};

export const saveSellHistory = (history) => {
  localStorage.setItem('sellHistory', JSON.stringify(history));
};

export const addSellRecord = (record) => {
  const history = getSellHistory();
  history.push(record);
  saveSellHistory(history);
};

// 銘柄のタグを一括更新（同一symbol/isinCdを持つ全銘柄）
export const updateAssetTags = (portfolio, symbolOrIsin, tags) => {
  return portfolio.map(asset => {
    const identifier = asset.symbol || asset.isinCd;
    if (identifier === symbolOrIsin) {
      return { ...asset, tags: tags || [] };
    }
    return asset;
  });
};