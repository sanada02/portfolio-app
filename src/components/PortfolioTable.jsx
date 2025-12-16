// src/components/PortfolioTable.jsx (UI改善版)
import React from 'react';

const PortfolioTable = ({ portfolio, exchangeRate, onEdit, onDelete, onSell, onDetail }) => {
  if (!portfolio || portfolio.length === 0) {
    return (
      <div className="empty-state">
        <h3>📭 保有銘柄がありません</h3>
        <p>「➕ 資産追加」ボタンから最初の資産を追加しましょう</p>
      </div>
    );
  }

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

  // 総計算
  const totalInvestment = portfolio.reduce((sum, asset) => {
    const investment = asset.purchasePrice * asset.activeQuantity;
    return sum + (asset.currency === 'USD' ? investment * exchangeRate : investment);
  }, 0);

  const totalCurrentValue = portfolio.reduce((sum, asset) => {
    const currentPrice = asset.currentPrice || asset.purchasePrice;
    const value = currentPrice * asset.activeQuantity;
    return sum + (asset.currency === 'USD' ? value * exchangeRate : value);
  }, 0);

  const totalProfit = totalCurrentValue - totalInvestment;
  const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>銘柄名</th>
            <th>種別</th>
            <th style={{ textAlign: 'right' }}>数量</th>
            <th style={{ textAlign: 'right' }}>取得単価</th>
            <th style={{ textAlign: 'right' }}>現在単価</th>
            <th style={{ textAlign: 'right' }}>評価額</th>
            <th style={{ textAlign: 'right' }}>損益</th>
            <th style={{ textAlign: 'right' }}>損益率</th>
            <th style={{ textAlign: 'center' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((asset) => {
            const currentPrice = asset.currentPrice || asset.purchasePrice;
            const investmentValue = asset.purchasePrice * asset.activeQuantity;
            const currentValue = currentPrice * asset.activeQuantity;
            const profit = currentValue - investmentValue;
            const profitPercent = investmentValue > 0 ? (profit / investmentValue) * 100 : 0;

            // 円換算の評価額
            const currentValueJPY = asset.currency === 'USD' ? currentValue * exchangeRate : currentValue;

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
                </td>
                <td style={{ textAlign: 'right' }}>{formatNumber(asset.activeQuantity)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(asset.purchasePrice, asset.currency)}</td>
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
        <tfoot>
          <tr style={{ background: '#f8f9fa', fontWeight: 'bold', borderTop: '3px solid #dee2e6' }}>
            <td colSpan="5" style={{ textAlign: 'right', padding: '16px 12px' }}>合計</td>
            <td style={{ textAlign: 'right', fontSize: '16px', padding: '16px 12px' }}>
              ¥{Math.round(totalCurrentValue).toLocaleString()}
            </td>
            <td style={{ textAlign: 'right', fontSize: '16px', padding: '16px 12px' }} className={getProfitClass(totalProfit)}>
              {totalProfit >= 0 ? '+' : ''}¥{Math.round(totalProfit).toLocaleString()}
            </td>
            <td style={{ textAlign: 'right', fontSize: '16px', padding: '16px 12px' }} className={getProfitPercentClass(totalProfitPercent)}>
              {totalProfitPercent >= 0 ? '+' : ''}{totalProfitPercent.toFixed(2)}%
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default PortfolioTable;