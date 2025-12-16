// src/components/EditSellRecordModal.jsx
import React, { useState } from 'react';
import { getSellHistory, saveSellHistory } from '../utils/storage';
import { getTodayJST } from '../utils/dateUtils';

const EditSellRecordModal = ({ sellRecord, onClose, onSave, currency, addNotification }) => {
  const [formData, setFormData] = useState({
    quantity: sellRecord.quantity,
    sellPrice: sellRecord.sellPrice,
    sellDate: sellRecord.sellDate
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const quantity = parseFloat(formData.quantity);
    const sellPrice = parseFloat(formData.sellPrice);

    if (!quantity || quantity <= 0) {
      addNotification('売却数量を入力してください', 'warning');
      return;
    }

    if (!sellPrice || sellPrice <= 0) {
      addNotification('売却単価を入力してください', 'warning');
      return;
    }

    // 売却履歴を更新
    const allSellHistory = getSellHistory();
    const updatedHistory = allSellHistory.map(record => {
      if (record.id === sellRecord.id) {
        return {
          ...record,
          quantity: quantity,
          sellPrice: sellPrice,
          sellDate: formData.sellDate,
          profit: (sellPrice - record.purchasePrice) * quantity
        };
      }
      return record;
    });

    saveSellHistory(updatedHistory);
    onSave();
    onClose();
    addNotification('売却記録を更新しました', 'success');
  };

  const formatCurrency = (value) => {
    if (currency === 'USD') {
      return `$${value}`;
    }
    return `¥${value}`;
  };

  const profit = (parseFloat(formData.sellPrice) - sellRecord.purchasePrice) * parseFloat(formData.quantity);
  const profitPercent = sellRecord.purchasePrice > 0
    ? ((parseFloat(formData.sellPrice) - sellRecord.purchasePrice) / sellRecord.purchasePrice) * 100
    : 0;

  const getProfitClass = (value) => {
    if (value > 0) return 'profit-positive';
    if (value < 0) return 'profit-negative';
    return 'profit-neutral';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>✏️ 売却記録を編集</h2>
        
        <div className="asset-info" style={{
          background: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            {sellRecord.assetName}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#6c757d' }}>取得単価: </span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(sellRecord.purchasePrice)}</span>
            </div>
            <div>
              <span style={{ color: '#6c757d' }}>元の売却日: </span>
              <span style={{ fontWeight: 'bold' }}>{new Date(sellRecord.sellDate).toLocaleDateString('ja-JP')}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>売却数量 *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                step="0.00000001"
                required
              />
            </div>

            <div className="form-group">
              <label>売却単価 ({currency}) *</label>
              <input
                type="number"
                value={formData.sellPrice}
                onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>売却日 *</label>
            <input
              type="date"
              value={formData.sellDate}
              onChange={(e) => setFormData({ ...formData, sellDate: e.target.value })}
              required
            />
          </div>

          {/* 損益プレビュー */}
          {formData.quantity && formData.sellPrice && (
            <div style={{
              background: profit >= 0 ? '#d1fae5' : '#fee2e2',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '20px'
            }}>
              <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>予想損益</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>損益額</div>
                  <div className={getProfitClass(profit)} style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {profit >= 0 ? '+' : ''}{formatCurrency(profit.toFixed(2))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>損益率</div>
                  <div className={getProfitClass(profitPercent)} style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
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
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSellRecordModal;