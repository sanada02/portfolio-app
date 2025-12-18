// src/utils/storage.js (バグ修正版 + 配当機能)
const PORTFOLIO_KEY = 'portfolio_data';
const SELL_HISTORY_KEY = 'sell_history';
const DIVIDENDS_KEY = 'dividends_data';

// 資産タイプの表示名
export const assetTypeNames = {
  stock: '株式',
  fund: '投資信託',
  etf: 'ETF',
  crypto: '仮想通貨',
  other: 'その他'
};

// 🔥 修正: より安全なID生成（カウンターを追加して重複を防止）
let idCounter = 0;
export const generateId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const counter = (idCounter++).toString(36);
  return `${timestamp}_${counter}_${random}`;
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
    const updatedHistory = history.map((record) => {
      if (!record.id) {
        needsSave = true;
        return {
          ...record,
          id: generateId()
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
    const newRecord = {
      id: generateId(),
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

// ===========================
// 配当データ管理
// ===========================

/**
 * 全配当データを取得
 * @returns {Array} 配当データの配列
 */
export const getDividends = () => {
  try {
    const saved = localStorage.getItem(DIVIDENDS_KEY);
    const dividends = saved ? JSON.parse(saved) : [];
    
    // IDがない古いデータに対してIDを付与
    let needsSave = false;
    const updatedDividends = dividends.map((dividend) => {
      if (!dividend.id) {
        needsSave = true;
        return {
          ...dividend,
          id: generateId()
        };
      }
      return dividend;
    });
    
    // IDを追加した場合は保存
    if (needsSave) {
      saveDividends(updatedDividends);
    }
    
    // 日付順にソート（古い順）
    return updatedDividends.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  } catch (error) {
    console.error('配当データの読み込みエラー:', error);
    return [];
  }
};

/**
 * 配当データを保存
 * @param {Array} dividends - 配当データの配列
 * @returns {boolean} 成功したかどうか
 */
export const saveDividends = (dividends) => {
  try {
    localStorage.setItem(DIVIDENDS_KEY, JSON.stringify(dividends));
    return true;
  } catch (error) {
    console.error('配当データの保存エラー:', error);
    return false;
  }
};

/**
 * 配当を追加
 * @param {Object} dividendData - 配当データ { assetId, date, amountJPY }
 * @returns {Object|null} 追加された配当データ
 */
export const addDividend = (dividendData) => {
  try {
    const { assetId, date, amountJPY } = dividendData;
    
    // バリデーション
    if (!assetId || !date || typeof amountJPY !== 'number') {
      throw new Error('無効な配当データです');
    }
    
    if (amountJPY <= 0) {
      throw new Error('配当金額は0より大きい必要があります');
    }
    
    const dividends = getDividends();
    const newDividend = {
      id: generateId(),
      assetId,
      date,
      amountJPY,
      createdAt: new Date().toISOString()
    };
    
    dividends.push(newDividend);
    saveDividends(dividends);
    
    console.log('✓ 配当を追加しました:', newDividend);
    return newDividend;
  } catch (error) {
    console.error('配当の追加エラー:', error);
    return null;
  }
};

/**
 * 配当を更新
 * @param {string} dividendId - 配当ID
 * @param {Object} updates - 更新データ { date?, amountJPY? }
 * @returns {boolean} 成功したかどうか
 */
export const updateDividend = (dividendId, updates) => {
  try {
    const dividends = getDividends();
    const index = dividends.findIndex(d => d.id === dividendId);
    
    if (index === -1) {
      throw new Error('配当が見つかりません');
    }
    
    // バリデーション
    if (updates.amountJPY !== undefined && updates.amountJPY <= 0) {
      throw new Error('配当金額は0より大きい必要があります');
    }
    
    dividends[index] = {
      ...dividends[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    saveDividends(dividends);
    console.log('✓ 配当を更新しました:', dividends[index]);
    return true;
  } catch (error) {
    console.error('配当の更新エラー:', error);
    return false;
  }
};

/**
 * 配当を削除
 * @param {string} dividendId - 配当ID
 * @returns {boolean} 成功したかどうか
 */
export const deleteDividend = (dividendId) => {
  try {
    const dividends = getDividends();
    const filtered = dividends.filter(d => d.id !== dividendId);
    
    if (filtered.length === dividends.length) {
      throw new Error('配当が見つかりません');
    }
    
    saveDividends(filtered);
    console.log('✓ 配当を削除しました:', dividendId);
    return true;
  } catch (error) {
    console.error('配当の削除エラー:', error);
    return false;
  }
};

/**
 * 特定銘柄の配当を取得
 * @param {string} assetId - 銘柄ID
 * @returns {Array} 配当データの配列（日付順）
 */
export const getDividendsByAssetId = (assetId) => {
  try {
    const dividends = getDividends();
    return dividends.filter(d => d.assetId === assetId);
  } catch (error) {
    console.error('銘柄別配当の取得エラー:', error);
    return [];
  }
};

/**
 * 統合銘柄（複数のassetIdを持つ）の配当を取得
 * @param {Array} assetIds - 銘柄IDの配列
 * @returns {Array} 配当データの配列（日付順）
 */
export const getDividendsByAssetIds = (assetIds) => {
  try {
    const dividends = getDividends();
    return dividends.filter(d => assetIds.includes(d.assetId));
  } catch (error) {
    console.error('統合銘柄の配当取得エラー:', error);
    return [];
  }
};

/**
 * 特定銘柄の合計配当を計算
 * @param {string|Array} assetIdOrIds - 銘柄ID または 銘柄IDの配列
 * @returns {number} 合計配当金額（JPY）
 */
export const getTotalDividends = (assetIdOrIds) => {
  try {
    const dividends = Array.isArray(assetIdOrIds)
      ? getDividendsByAssetIds(assetIdOrIds)
      : getDividendsByAssetId(assetIdOrIds);
    
    return dividends.reduce((sum, d) => sum + d.amountJPY, 0);
  } catch (error) {
    console.error('合計配当の計算エラー:', error);
    return 0;
  }
};

/**
 * 全銘柄の合計配当を計算
 * @returns {number} 全体の合計配当金額（JPY）
 */
export const getAllTotalDividends = () => {
  try {
    const dividends = getDividends();
    return dividends.reduce((sum, d) => sum + d.amountJPY, 0);
  } catch (error) {
    console.error('全体合計配当の計算エラー:', error);
    return 0;
  }
};

/**
 * 期間内の配当を取得
 * @param {string} startDate - 開始日 'YYYY-MM-DD'
 * @param {string} endDate - 終了日 'YYYY-MM-DD'
 * @returns {Array} 配当データの配列
 */
export const getDividendsByDateRange = (startDate, endDate) => {
  try {
    const dividends = getDividends();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return dividends.filter(d => {
      const divDate = new Date(d.date);
      return divDate >= start && divDate <= end;
    });
  } catch (error) {
    console.error('期間内配当の取得エラー:', error);
    return [];
  }
};

/**
 * 配当データをクリア
 * @returns {boolean} 成功したかどうか
 */
export const clearDividends = () => {
  try {
    localStorage.removeItem(DIVIDENDS_KEY);
    return true;
  } catch (error) {
    console.error('配当データのクリアエラー:', error);
    return false;
  }
};

// ===========================
// 既存機能
// ===========================

// すべてのデータをクリア
export const clearAllData = () => {
  try {
    localStorage.removeItem(PORTFOLIO_KEY);
    localStorage.removeItem(SELL_HISTORY_KEY);
    localStorage.removeItem(DIVIDENDS_KEY);
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
    const dividends = getDividends();
    return {
      portfolio,
      sellHistory,
      dividends,
      exportDate: new Date().toISOString(),
      version: '1.1.0' // 🔥 配当機能追加でバージョンアップ
    };
  } catch (error) {
    console.error('データのエクスポートエラー:', error);
    return null;
  }
};

// データのインポート
export const importData = (data) => {
  try {
    // 🔥 修正: データの検証を追加
    if (!data || typeof data !== 'object') {
      throw new Error('無効なデータ形式です');
    }
    
    if (data.portfolio && Array.isArray(data.portfolio)) {
      savePortfolio(data.portfolio);
    }
    if (data.sellHistory && Array.isArray(data.sellHistory)) {
      saveSellHistory(data.sellHistory);
    }
    if (data.dividends && Array.isArray(data.dividends)) {
      saveDividends(data.dividends);
    }
    return true;
  } catch (error) {
    console.error('データのインポートエラー:', error);
    return false;
  }
};

// ユーティリティ: 資産の検索
export const findAssetById = (portfolio, assetId) => {
  if (!portfolio || !Array.isArray(portfolio)) {
    return null;
  }
  return portfolio.find(asset => asset.id === assetId);
};

// ユーティリティ: 資産の重複チェック
export const isDuplicateAsset = (portfolio, symbol, isinCd) => {
  if (!portfolio || !Array.isArray(portfolio)) {
    return false;
  }
  return portfolio.some(asset => {
    if (symbol && asset.symbol) {
      return asset.symbol === symbol;
    }
    if (isinCd && asset.isinCd) {
      return asset.isinCd === isinCd;
    }
    return false;
  });
};