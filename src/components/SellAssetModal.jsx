// src/components/SellAssetModal.jsx (修正版)
import React, { useState } from 'react';
import { addSellRecord } from '../utils/storage';
import { getTodayJST } from '../utils/dateUtils';

const SellAssetModal = ({ asset, onClose, onSell, exchangeRate, addNotification }) => {
  const [sellQuantity, setSellQuantity] = useState('');
  const [sellPrice, setSellPrice] = useState(asset.currentPrice || asset.purchasePrice);
  const [sellDate, setSellDate] = useState(getTodayJST());

  const handleSubmit = (e) => {
    e.preventDefault();

    const quantity = parseFloat(sellQuantity);

    if (!quantity || quantity <= 0) {
      addNotification('売却数量を入力してください', 'warning');
      return;
    }

    if (quantity > asset.activeQuantity) {
      addNotification(`売却数量が保有数量(${asset.activeQuantity})を超えています`, 'error');
      return;
    }

    if (!sellPrice || sellPrice <= 0) {
      addNotification('売却単価を入力してください', 'warning');
      return;
    }

    // 統合銘柄の場合は、最初のIDに対して売却記録を作成
    // （実際には複数IDがある場合でも、まとめて1つの売却記録として扱う）
    const targetAssetId = asset.assetIds ? asset.assetIds[0] : asset.id;

    // 売却記録を保存
    const sellRecord = {
      originalAssetId: targetAssetId,
      assetName: asset.name,
      symbol: asset.symbol || asset.isinCd,
      quantity: quantity,
      purchasePrice: asset.purchasePrice,
      sellPrice: parseFloat(sellPrice),
      sellDate: sellDate,
      currency: asset.currency,
      profit: (parseFloat(sellPrice) - asset.purchasePrice) * quantity
    };

    addSellRecord(sellRecord);

    // 親コンポーネントに通知
    onSell({
      ...asset,
      soldQuantity: quantity
    });

    addNotification(`${asset.name}を${quantity}売却しました`, 'success');
    onClose();
  };

  const formatCurrency = (value) => {
    if (asset.currency === 'USD') {
      return `$${value}`;
    }
    if (asset.currency === 'HKD') {
      return `HK$${value}`;
    }
    return `¥${value}`;
  };

  const estimatedProfit = sellPrice && sellQuantity
    ? (parseFloat(sellPrice) - asset.purchasePrice) * parseFloat(sellQuantity)
    : 0;

  const estimatedProfitPercent = asset.purchasePrice > 0
    ? ((parseFloat(sellPrice) - asset.purchasePrice) / asset.purchasePrice) * 100
    : 0;

  const getProfitClass = (value) => {
    if (value > 0) return 'profit-positive';
    if (value < 0) return 'profit-negative';
    return 'profit-neutral';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>💰 資産を売却</h2>

        <div className="asset-info" style={{
          background: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            {asset.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#6c757d' }}>保有数量: </span>
              <span style={{ fontWeight: 'bold' }}>{asset.activeQuantity.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ color: '#6c757d' }}>取得単価: </span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(asset.purchasePrice)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>売却数量 *</label>
              <input
                type="number"
                value={sellQuantity}
                onChange={(e) => setSellQuantity(e.target.value)}
                step="0.00000001"
                max={asset.activeQuantity}
                placeholder={`最大: ${asset.activeQuantity}`}
                required
              />
            </div>

            <div className="form-group">
              <label>売却単価 ({asset.currency}) *</label>
              <input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>売却日 *</label>
            <input
              type="date"
              value={sellDate}
              onChange={(e) => setSellDate(e.target.value)}
              required
            />
          </div>

          {/* 予想損益表示 */}
          {sellQuantity && sellPrice && (
            <div style={{
              background: estimatedProfit >= 0 ? '#d1fae5' : '#fee2e2',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '20px'
            }}>
              <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>予想損益</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>損益額</div>
                  <div className={getProfitClass(estimatedProfit)} style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {estimatedProfit >= 0 ? '+' : ''}{formatCurrency(estimatedProfit.toFixed(2))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>損益率</div>
                  <div className={getProfitClass(estimatedProfitPercent)} style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {estimatedProfitPercent >= 0 ? '+' : ''}{estimatedProfitPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn-primary">
              売却実行
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellAssetModal;