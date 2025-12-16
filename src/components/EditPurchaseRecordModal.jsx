// src/components/EditPurchaseRecordModal.jsx
import React, { useState } from 'react';
import { getTodayJST } from '../utils/dateUtils';

const EditPurchaseRecordModal = ({ asset, onClose, onSave, addNotification }) => {
  const [formData, setFormData] = useState({
    purchaseDate: asset.purchaseDate,
    quantity: asset.quantity,
    purchasePrice: asset.purchasePrice
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const quantity = parseFloat(formData.quantity);
    const purchasePrice = parseFloat(formData.purchasePrice);

    if (!quantity || quantity <= 0) {
      addNotification('数量を入力してください', 'warning');
      return;
    }

    if (!purchasePrice || purchasePrice <= 0) {
      addNotification('取得単価を入力してください', 'warning');
      return;
    }

    const updatedAsset = {
      ...asset,
      purchaseDate: formData.purchaseDate,
      quantity: quantity,
      purchasePrice: purchasePrice
    };

    onSave(updatedAsset);
    onClose();
  };

  const formatCurrency = (value) => {
    if (asset.currency === 'USD') {
      return `$${value}`;
    }
    return `¥${value}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>✏️ 購入記録を編集</h2>
        
        <div className="asset-info" style={{
          background: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            {asset.name}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            {asset.symbol || asset.isinCd || ''}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>購入日 *</label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>数量 *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                step="0.00000001"
                required
              />
            </div>

            <div className="form-group">
              <label>取得単価 ({asset.currency}) *</label>
              <input
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                step="0.01"
                required
              />
            </div>
          </div>

          {/* 取得総額プレビュー */}
          {formData.quantity && formData.purchasePrice && (
            <div style={{
              background: '#e0e7ff',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '20px'
            }}>
              <div style={{ fontSize: '14px', color: '#4338ca', marginBottom: '8px' }}>取得総額</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4338ca' }}>
                {formatCurrency((parseFloat(formData.quantity) * parseFloat(formData.purchasePrice)).toFixed(2))}
              </div>
            </div>
          )}

          <div style={{
            background: '#fff3cd',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '20px',
            fontSize: '13px',
            color: '#856404'
          }}>
            <strong>⚠️ 注意:</strong> この編集は個別の購入記録のみに適用されます。統合銘柄の総数量と平均取得単価は自動で再計算されます。
          </div>

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

export default EditPurchaseRecordModal;