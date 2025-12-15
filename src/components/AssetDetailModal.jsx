// src/components/AssetDetailModal.jsx
import React from 'react';
import { getSellHistoryByAssetId } from '../utils/storage';

const AssetDetailModal = ({ asset, onClose, exchangeRate }) => {
  const sellHistory = getSellHistoryByAssetId(asset.id);

  const formatCurrency = (value, currency) => {
    if (currency === 'USD') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `¥${Math.round(value).toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const currentPrice = asset.currentPrice || asset.purchasePrice;
  const totalInvestment = asset.purchasePrice * asset.displayQuantity;
  const currentValue = currentPrice * asset.activeQuantity;
  const profit = currentValue - (asset.purchasePrice * asset.activeQuantity);
  const profitPercent = (asset.purchasePrice * asset.activeQuantity) > 0 
    ? (profit / (asset.purchasePrice * asset.activeQuantity)) * 100 
    : 0;

  const getProfitClass = (value) => {
    if (value > 0) return 'profit-positive';
    if (value < 0) return 'profit-negative';
    return 'profit-neutral';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-detail" onClick={(e) => e.stopPropagation()}>
        <h2>📊 {asset.name}</h2>
        
        {/* 基本情報 */}
        <div className="detail-section">
          <h3>基本情報</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>銘柄名</label>
              <div className="detail-value">{asset.name}</div>
            </div>
            <div className="detail-item">
              <label>種別</label>
              <div className="detail-value">
                {asset.type === 'stock' ? '株式' :
                 asset.type === 'fund' ? '投資信託' :
                 asset.type === 'etf' ? 'ETF' :
                 asset.type === 'crypto' ? '暗号通貨' : 'その他'}
              </div>
            </div>
            {asset.symbol && (
              <div className="detail-item">
                <label>ティッカー</label>
                <div className="detail-value">{asset.symbol}</div>
              </div>
            )}
            {asset.isinCd && (
              <div className="detail-item">
                <label>ISINコード</label>
                <div className="detail-value">{asset.isinCd}</div>
              </div>
            )}
            <div className="detail-item">
              <label>購入日</label>
              <div className="detail-value">{formatDate(asset.purchaseDate)}</div>
            </div>
            <div className="detail-item">
              <label>通貨</label>
              <div className="detail-value">{asset.currency}</div>
            </div>
          </div>
        </div>

        {/* タグ */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="detail-section">
            <h3>タグ</h3>
            <div className="tag-list">
              {asset.tags.map(tag => (
                <span key={tag} className="tag-badge">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* 保有数量 */}
        <div className="detail-section">
          <h3>保有数量</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>購入数量</label>
              <div className="detail-value">{asset.displayQuantity.toLocaleString()}</div>
            </div>
            {asset.soldQuantity > 0 && (
              <div className="detail-item">
                <label>売却済み数量</label>
                <div className="detail-value profit-negative">
                  {asset.soldQuantity.toLocaleString()}
                </div>
              </div>
            )}
            <div className="detail-item">
              <label>現在保有数量</label>
              <div className="detail-value profit-positive" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {asset.activeQuantity.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 価格情報 */}
        <div className="detail-section">
          <h3>価格情報</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>取得単価</label>
              <div className="detail-value">{formatCurrency(asset.purchasePrice, asset.currency)}</div>
            </div>
            <div className="detail-item">
              <label>現在単価</label>
              <div className="detail-value" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {formatCurrency(currentPrice, asset.currency)}
              </div>
            </div>
            <div className="detail-item">
              <label>取得総額</label>
              <div className="detail-value">{formatCurrency(totalInvestment, asset.currency)}</div>
            </div>
            <div className="detail-item">
              <label>現在評価額</label>
              <div className="detail-value" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {formatCurrency(currentValue, asset.currency)}
              </div>
            </div>
          </div>
        </div>

        {/* 損益情報 */}
        <div className="detail-section">
          <h3>損益情報</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>評価損益</label>
              <div className={`detail-value ${getProfitClass(profit)}`} style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {profit >= 0 ? '+' : ''}{formatCurrency(profit, asset.currency)}
              </div>
            </div>
            <div className="detail-item">
              <label>損益率</label>
              <div className={`detail-value ${getProfitClass(profitPercent)}`} style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* 売却履歴 */}
        {sellHistory.length > 0 && (
          <div className="detail-section">
            <h3>売却履歴</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>売却日</th>
                    <th style={{ textAlign: 'right' }}>数量</th>
                    <th style={{ textAlign: 'right' }}>売却単価</th>
                    <th style={{ textAlign: 'right' }}>売却額</th>
                    <th style={{ textAlign: 'right' }}>損益</th>
                  </tr>
                </thead>
                <tbody>
                  {sellHistory.map((record, index) => {
                    const sellValue = record.sellPrice * record.quantity;
                    const costValue = asset.purchasePrice * record.quantity;
                    const sellProfit = sellValue - costValue;
                    
                    return (
                      <tr key={index}>
                        <td>{formatDate(record.sellDate)}</td>
                        <td style={{ textAlign: 'right' }}>{record.quantity.toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(record.sellPrice, asset.currency)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(sellValue, asset.currency)}</td>
                        <td style={{ textAlign: 'right' }} className={getProfitClass(sellProfit)}>
                          {sellProfit >= 0 ? '+' : ''}{formatCurrency(sellProfit, asset.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 閉じるボタン */}
        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailModal;