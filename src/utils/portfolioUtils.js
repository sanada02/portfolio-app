// src/utils/portfolioUtils.js
import { getSellHistory } from './storage';

/**
 * ポートフォリオを銘柄名で統合
 */
export const getConsolidatedPortfolio = (portfolio) => {
  const sellHistory = getSellHistory();
  const consolidated = {};

  portfolio.forEach(asset => {
    const key = asset.name;

    if (consolidated[key]) {
      const existing = consolidated[key];
      existing.originalQuantity += asset.quantity;
      
      const totalCost = (existing.purchasePrice * existing.quantity) + (asset.purchasePrice * asset.quantity);
      const totalQuantity = existing.quantity + asset.quantity;
      existing.purchasePrice = totalCost / totalQuantity;
      existing.quantity = totalQuantity;
      
      if (new Date(asset.purchaseDate) < new Date(existing.purchaseDate)) {
        existing.purchaseDate = asset.purchaseDate;
      }
      
      existing.assetIds.push(asset.id);
      
      // 購入履歴を保存
      existing.purchaseRecords.push({
        id: asset.id,
        purchaseDate: asset.purchaseDate,
        quantity: asset.quantity,
        purchasePrice: asset.purchasePrice
      });
      
      if (asset.tags) {
        existing.tags = [...new Set([...(existing.tags || []), ...asset.tags])];
      }
      
      if (asset.currentPrice) {
        existing.currentPrice = asset.currentPrice;
      }
    } else {
      consolidated[key] = {
        ...asset,
        assetIds: [asset.id],
        originalQuantity: asset.quantity,
        isConsolidated: true,
        purchaseRecords: [{
          id: asset.id,
          purchaseDate: asset.purchaseDate,
          quantity: asset.quantity,
          purchasePrice: asset.purchasePrice
        }]
      };
    }
  });

  return Object.values(consolidated).map(asset => {
    const soldQuantity = asset.assetIds.reduce((sum, id) => {
      const sold = sellHistory
        .filter(record => record.originalAssetId === id)
        .reduce((total, record) => total + record.quantity, 0);
      return sum + sold;
    }, 0);

    const activeQuantity = asset.quantity - soldQuantity;

    // 購入履歴を購入日順にソート
    if (asset.purchaseRecords) {
      asset.purchaseRecords.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
    }

    return {
      ...asset,
      activeQuantity,
      displayQuantity: asset.quantity,
      soldQuantity
    };
  }).filter(asset => asset.activeQuantity > 0);
};

/**
 * タグ別の分析データを取得
 */
export const getTagAnalysis = (portfolio, exchangeRate) => {
  const tagTotals = {};
  
  portfolio.forEach(asset => {
    if (!asset.tags || asset.tags.length === 0) {
      tagTotals['タグなし'] = (tagTotals['タグなし'] || 0) + (asset.currentPrice || asset.purchasePrice) * asset.activeQuantity;
    } else {
      asset.tags.forEach(tag => {
        const value = asset.currency === 'USD'
          ? (asset.currentPrice || asset.purchasePrice) * asset.activeQuantity * exchangeRate
          : (asset.currentPrice || asset.purchasePrice) * asset.activeQuantity;
        
        tagTotals[tag] = (tagTotals[tag] || 0) + value;
      });
    }
  });
  
  return Object.entries(tagTotals)
    .map(([tag, value]) => ({ tag, value }))
    .sort((a, b) => b.value - a.value);
};

/**
 * 特定のタグを持つ資産を取得
 */
export const getAssetsByTag = (portfolio, selectedTag) => {
  if (!selectedTag) return [];
  
  return portfolio.filter(asset => 
    asset.tags && asset.tags.includes(selectedTag)
  );
};

/**
 * 全てのユニークなタグを取得
 */
export const getAllUniqueTags = (portfolio) => {
  return [...new Set(portfolio.flatMap(a => a.tags || []))];
};