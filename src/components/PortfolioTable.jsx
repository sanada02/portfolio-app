// src/components/PortfolioTable.jsx
import { Edit, Trash2, TrendingDown } from 'lucide-react';
import { assetTypeNames } from '../utils/storage';
import { calculateAssetValue, getActiveQuantity } from '../utils/calculations';
import { getTagColor } from '../utils/tags';

export default function PortfolioTable({ portfolio, sellHistory = [], exchangeRate, onEdit, onDelete, onSell }) {
  
  const calculateProfitLoss = (asset) => {
    const currentValue = calculateAssetValue(asset, sellHistory, exchangeRate);
    const purchaseValue = asset.currency === 'USD' 
      ? asset.purchasePrice * asset.quantity * exchangeRate
      : asset.purchasePrice * asset.quantity;
    return currentValue - purchaseValue;
  };

  const calculateProfitLossPercent = (asset) => {
    const profitLoss = calculateProfitLoss(asset);
    const purchaseValue = asset.currency === 'USD' 
      ? asset.purchasePrice * asset.quantity * exchangeRate
      : asset.purchasePrice * asset.quantity;
    return purchaseValue > 0 ? (profitLoss / purchaseValue) * 100 : 0;
  };

  // アクティブな銘柄のみ表示（完全売却済みを除外）
  const activePortfolio = portfolio.filter(asset => {
    const activeQty = getActiveQuantity(asset, sellHistory);
    return activeQty > 0;
  });

  if (activePortfolio.length === 0) {
    return <p className="empty-message">銘柄がありません</p>;
  }

  return (
    <div className="portfolio-table-container">
      <table className="portfolio-table">
        <thead>
          <tr>
            <th>銘柄名</th>
            <th>種類</th>
            <th className="text-right">数量</th>
            <th className="text-right">取得単価</th>
            <th className="text-right">現在単価</th>
            <th className="text-right">評価額</th>
            <th className="text-right">損益</th>
            <th className="text-right">損益率</th>
            <th className="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {activePortfolio.map(asset => {
            const activeQty = getActiveQuantity(asset, sellHistory);
            const currentValue = calculateAssetValue(asset, sellHistory, exchangeRate);
            const profitLoss = calculateProfitLoss(asset);
            const profitLossPercent = calculateProfitLossPercent(asset);
            const currencySymbol = asset.currency === 'USD' ? '$' : '¥';

            return (
              <tr key={asset.id}>
                <td>
                  <div className="asset-name">{asset.name}</div>
                  {asset.symbol && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {asset.symbol}
                    </div>
                  )}
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="asset-tags">
                      {asset.tags.map((tag, index) => (
                        <span
                          key={`${asset.id}-tag-${index}`}
                          className="tag-badge"
                          style={{ backgroundColor: getTagColor(tag) }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <span className="asset-type">{assetTypeNames[asset.type]}</span>
                </td>
                <td className="text-right">
                  {activeQty.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                </td>
                <td className="text-right">
                  {currencySymbol}{asset.purchasePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
                <td className="text-right">
                  {currencySymbol}{(asset.currentPrice || asset.purchasePrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
                <td className="text-right">
                  ¥{currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className={`text-right ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
                  {profitLoss >= 0 ? '+' : ''}¥{profitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className={`text-right ${profitLossPercent >= 0 ? 'positive' : 'negative'}`}>
                  {profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
                </td>
                <td>
                  <div className="actions">
                    <button className="btn-edit" onClick={() => onEdit(asset)} title="編集">
                      <Edit size={16} />
                    </button>
                    <button className="btn-sell" onClick={() => onSell(asset)} title="売却">
                      <TrendingDown size={16} />
                    </button>
                    <button className="btn-delete" onClick={() => onDelete(asset.id)} title="削除">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}