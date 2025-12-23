// src/components/PortfolioTable.jsx (期間比較対応版)
import React, { useState, useMemo } from 'react';

const PortfolioTable = ({ portfolio, exchangeRate, periodComparison, periodLabel = '前日比', onEdit, onDelete, onSell, onDetail }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'currentValueJPY', direction: 'desc' });

  const formatCurrency = (value, currency) => {
    if (currency === 'USD') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `¥${Math.round(value).toLocaleString()}`;
  };

  const formatNumber = (value) => {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  };

  // 損益のクラス名を取得
  const getProfitClass = (profit) => {
    if (profit > 0) return 'profit-positive';
    if (profit < 0) return 'profit-negative';
    return 'profit-neutral';
  };

  // 損益率のクラス名を取得
  const getProfitPercentClass = (percent) => {
    if (percent > 0) return 'profit-positive';
    if (percent < 0) return 'profit-negative';
    return 'profit-neutral';
  };

  // ソート処理（空配列の場合も処理）
  const sortedPortfolio = useMemo(() => {
    if (!portfolio || portfolio.length === 0) {
      return [];
    }

    let sortableItems = [...portfolio];
    
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.key) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'quantity':
            aValue = a.activeQuantity;
            bValue = b.activeQuantity;
            break;
          case 'currentPrice':
            aValue = (a.currentPrice || a.purchasePrice) * (a.currency === 'USD' ? exchangeRate : 1);
            bValue = (b.currentPrice || b.purchasePrice) * (b.currency === 'USD' ? exchangeRate : 1);
            break;
          case 'currentValueJPY':
            const aCurrentPrice = a.currentPrice || a.purchasePrice;
            const bCurrentPrice = b.currentPrice || b.purchasePrice;
            aValue = aCurrentPrice * a.activeQuantity * (a.currency === 'USD' ? exchangeRate : 1);
            bValue = bCurrentPrice * b.activeQuantity * (b.currency === 'USD' ? exchangeRate : 1);
            break;
          case 'profit':
            const aProfitValue = ((a.currentPrice || a.purchasePrice) - a.purchasePrice) * a.activeQuantity * (a.currency === 'USD' ? exchangeRate : 1);
            const bProfitValue = ((b.currentPrice || b.purchasePrice) - b.purchasePrice) * b.activeQuantity * (b.currency === 'USD' ? exchangeRate : 1);
            aValue = aProfitValue;
            bValue = bProfitValue;
            break;
          case 'profitPercent':
            const aInvestment = a.purchasePrice * a.activeQuantity;
            const bInvestment = b.purchasePrice * b.activeQuantity;
            const aProfit = ((a.currentPrice || a.purchasePrice) - a.purchasePrice) * a.activeQuantity;
            const bProfit = ((b.currentPrice || b.purchasePrice) - b.purchasePrice) * b.activeQuantity;
            aValue = aInvestment > 0 ? (aProfit / aInvestment) * 100 : 0;
            bValue = bInvestment > 0 ? (bProfit / bInvestment) * 100 : 0;
            break;
          case 'dayChange':
            // 期間比較でソート
            if (periodComparison && periodComparison.assetChanges) {
              aValue = periodComparison.assetChanges[a.id]?.change || 0;
              bValue = periodComparison.assetChanges[b.id]?.change || 0;
            } else {
              aValue = 0;
              bValue = 0;
            }
            break;
          case 'dayChangePercent':
            // 期間比較%でソート
            if (periodComparison && periodComparison.assetChanges) {
              aValue = periodComparison.assetChanges[a.id]?.changePercent || 0;
              bValue = periodComparison.assetChanges[b.id]?.changePercent || 0;
            } else {
              aValue = 0;
              bValue = 0;
            }
            break;
          default:
            aValue = 0;
            bValue = 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return sortableItems;
  }, [portfolio, sortConfig, exchangeRate, periodComparison]);

  // ソート変更ハンドラー
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ソートインジケーター
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return ' ⇅';
    }
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  // 総計算（空配列でも安全）
  const totalInvestment = (portfolio || []).reduce((sum, asset) => {
    const investment = asset.purchasePrice * asset.activeQuantity;
    return sum + (asset.currency === 'USD' ? investment * exchangeRate : investment);
  }, 0);

  const totalCurrentValue = (portfolio || []).reduce((sum, asset) => {
    const currentPrice = asset.currentPrice || asset.purchasePrice;
    const value = currentPrice * asset.activeQuantity;
    return sum + (asset.currency === 'USD' ? value * exchangeRate : value);
  }, 0);

  const totalProfit = totalCurrentValue - totalInvestment;
  const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

  // 空の場合の表示
  if (!portfolio || portfolio.length === 0) {
    return (
      <div className="empty-state">
        <h3>📭 保有銘柄がありません</h3>
        <p>「➕ 資産追加」ボタンから最初の資産を追加しましょう</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th onClick={() => requestSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              銘柄名{getSortIndicator('name')}
            </th>
            <th onClick={() => requestSort('type')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              種別{getSortIndicator('type')}
            </th>
            <th onClick={() => requestSort('quantity')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
              数量{getSortIndicator('quantity')}
            </th>
            <th onClick={() => requestSort('currentPrice')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
              現在単価{getSortIndicator('currentPrice')}
            </th>
            <th onClick={() => requestSort('currentValueJPY')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
              評価額{getSortIndicator('currentValueJPY')}
            </th>
            <th onClick={() => requestSort('profit')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
              損益{getSortIndicator('profit')}
            </th>
            <th onClick={() => requestSort('profitPercent')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
              損益率{getSortIndicator('profitPercent')}
            </th>
            <th onClick={() => requestSort('dayChange')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
              {periodLabel}{getSortIndicator('dayChange')}
            </th>
            <th style={{ textAlign: 'center' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {sortedPortfolio.map((asset) => {
            const currentPrice = asset.currentPrice || asset.purchasePrice;
            const investmentValue = asset.purchasePrice * asset.activeQuantity;
            const currentValue = currentPrice * asset.activeQuantity;
            const profit = currentValue - investmentValue;
            const profitPercent = investmentValue > 0 ? (profit / investmentValue) * 100 : 0;

            // 円換算の評価額
            const currentValueJPY = asset.currency === 'USD' ? currentValue * exchangeRate : currentValue;

            // 期間比較を取得
            const periodChangeData = periodComparison?.assetChanges?.[asset.id];
            const periodChange = periodChangeData?.change || 0;
            const periodChangePercent = periodChangeData?.changePercent || 0;

            return (
              <tr key={asset.id}>
                <td>
                  <div style={{ fontWeight: '600' }}>{asset.name}</div>
                  {asset.tags && asset.tags.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      {asset.tags.map(tag => (
                        <span
                          key={tag}
                          style={{
                            display: 'inline-block',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            marginRight: '4px',
                            fontWeight: '500'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <div>
                    <span style={{
                      background: '#f0f0f0',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {asset.type === 'stock' ? '株式' :
                       asset.type === 'fund' ? '投資信託' :
                       asset.type === 'etf' ? 'ETF' :
                       asset.type === 'crypto' ? '仮想通貨' : 'その他'}
                    </span>
                    {(asset.symbol || asset.isinCd) && (
                      <div style={{
                        fontSize: '10px',
                        color: '#999',
                        marginTop: '4px',
                        fontFamily: 'monospace'
                      }}>
                        {asset.symbol && <span>{asset.symbol}</span>}
                        {asset.symbol && asset.isinCd && <span style={{ margin: '0 4px' }}>·</span>}
                        {asset.isinCd && <span>{asset.isinCd}</span>}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>{formatNumber(asset.activeQuantity)}</td>
                <td style={{ textAlign: 'right', fontWeight: '500' }}>
                  {formatCurrency(currentPrice, asset.currency)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>
                  ¥{Math.round(currentValueJPY).toLocaleString()}
                </td>
                <td style={{ textAlign: 'right' }} className={getProfitClass(profit)}>
                  {profit >= 0 ? '+' : ''}{formatCurrency(profit, asset.currency)}
                </td>
                <td style={{ textAlign: 'right' }} className={getProfitPercentClass(profitPercent)}>
                  {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                </td>
                <td style={{ textAlign: 'right' }}>
                  {periodComparison ? (
                    <div>
                      <div className={getProfitClass(periodChange)} style={{ fontWeight: '600' }}>
                        {periodChange >= 0 ? '+' : ''}¥{Math.round(periodChange).toLocaleString()}
                      </div>
                      <div className={getProfitPercentClass(periodChangePercent)} style={{ fontSize: '11px', marginTop: '2px' }}>
                        ({periodChangePercent >= 0 ? '+' : ''}{periodChangePercent.toFixed(2)}%)
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#999', fontSize: '12px' }}>-</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="detail-btn" onClick={() => onDetail(asset)} style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    }}>
                      詳細
                    </button>
                    <button className="edit-btn" onClick={() => onEdit(asset)}>
                      編集
                    </button>
                    <button className="sell-btn" onClick={() => onSell(asset)}>
                      売却
                    </button>
                    <button className="delete-btn" onClick={() => onDelete(asset.id)}>
                      削除
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
};

export default PortfolioTable;