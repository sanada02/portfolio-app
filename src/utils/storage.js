// src/utils/storage.js
const PORTFOLIO_KEY = 'portfolio_data';
const SELL_HISTORY_KEY = 'sell_history';

// 資産タイプの表示名
export const assetTypeNames = {
  stock: '株式',
  fund: '投資信託',
  etf: 'ETF',
  crypto: '仮想通貨',
  other: 'その他'
};

// ポートフォリオの読み込み
export const loadPortfolio = () => {
  try {
    const saved = localStorage.getItem(PORTFOLIO_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('ポートフォリオの読み込みエラー:', error);
    return [];
  }
};

// ポートフォリオの保存
export const savePortfolio = (portfolio) => {
  try {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
    return true;
  } catch (error) {
    console.error('ポートフォリオの保存エラー:', error);
    return false;
  }
};

// 売却履歴の読み込み
export const getSellHistory = () => {
  try {
    const saved = localStorage.getItem(SELL_HISTORY_KEY);
    const history = saved ? JSON.parse(saved) : [];
    
    // IDがない古いデータに対してIDを付与
    let needsSave = false;
    const updatedHistory = history.map((record, index) => {
      if (!record.id) {
        needsSave = true;
        return {
          ...record,
          id: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`
        };
      }
      return record;
    });
    
    // IDを追加した場合は保存
    if (needsSave) {
      saveSellHistory(updatedHistory);
    }
    
    return updatedHistory;
  } catch (error) {
    console.error('売却履歴の読み込みエラー:', error);
    return [];
  }
};

// 売却履歴の保存
export const saveSellHistory = (sellHistory) => {
  try {
    localStorage.setItem(SELL_HISTORY_KEY, JSON.stringify(sellHistory));
    return true;
  } catch (error) {
    console.error('売却履歴の保存エラー:', error);
    return false;
  }
};

// 売却記録を追加
export const addSellRecord = (record) => {
  try {
    const history = getSellHistory();
    // より確実なID生成（ミリ秒 + ランダム文字列）
    const newRecord = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...record
    };
    history.push(newRecord);
    saveSellHistory(history);
    return newRecord;
  } catch (error) {
    console.error('売却記録の追加エラー:', error);
    return null;
  }
};

// 特定の資産IDの売却履歴を取得
export const getSellHistoryByAssetId = (assetId) => {
  try {
    const history = getSellHistory();
    return history.filter(record => record.originalAssetId === assetId);
  } catch (error) {
    console.error('売却履歴の取得エラー:', error);
    return [];
  }
};

// 売却履歴をクリア
export const clearSellHistory = () => {
  try {
    localStorage.removeItem(SELL_HISTORY_KEY);
    return true;
  } catch (error) {
    console.error('売却履歴のクリアエラー:', error);
    return false;
  }
};

// すべてのデータをクリア
export const clearAllData = () => {
  try {
    localStorage.removeItem(PORTFOLIO_KEY);
    localStorage.removeItem(SELL_HISTORY_KEY);
    return true;
  } catch (error) {
    console.error('データのクリアエラー:', error);
    return false;
  }
};

// データのエクスポート
export const exportData = () => {
  try {
    const portfolio = loadPortfolio();
    const sellHistory = getSellHistory();
    return {
      portfolio,
      sellHistory,
      exportDate: new Date().toISOString()
    };
  } catch (error) {
    console.error('データのエクスポートエラー:', error);
    return null;
  }
};

// データのインポート
export const importData = (data) => {
  try {
    if (data.portfolio) {
      savePortfolio(data.portfolio);
    }
    if (data.sellHistory) {
      saveSellHistory(data.sellHistory);
    }
    return true;
  } catch (error) {
    console.error('データのインポートエラー:', error);
    return false;
  }
};

// ユーティリティ: IDの生成
export const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ユーティリティ: 資産の検索
export const findAssetById = (portfolio, assetId) => {
  return portfolio.find(asset => asset.id === assetId);
};

// ユーティリティ: 資産の重複チェック
export const isDuplicateAsset = (portfolio, symbol, isinCd) => {
  return portfolio.some(asset => {
    if (symbol) {
      return asset.symbol === symbol;
    }
    if (isinCd) {
      return asset.isinCd === isinCd;
    }
    return false;
  });
};