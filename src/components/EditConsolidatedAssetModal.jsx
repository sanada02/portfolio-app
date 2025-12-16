// src/components/EditConsolidatedAssetModal.jsx
import React, { useState } from 'react';

const EditConsolidatedAssetModal = ({ asset, portfolio, onClose, onSave, addNotification }) => {
  const [formData, setFormData] = useState({
    name: asset.name,
    symbol: asset.symbol || '',
    isinCd: asset.isinCd || '',
    currentPrice: asset.currentPrice || '',
    tags: asset.tags || []
  });

  const [currentTag, setCurrentTag] = useState('');
  const [showSymbolWarning, setShowSymbolWarning] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    // 銘柄名の重複チェック（自分自身を除く）
    const assetIds = asset.assetIds || [asset.id];
    const isDuplicate = portfolio.some(a => 
      !assetIds.includes(a.id) && 
      a.name === formData.name
    );

    if (isDuplicate) {
      addNotification('同じ銘柄名が既に存在します', 'error');
      return;
    }

    // 全ての関連する購入記録を更新
    onSave({
      assetIds: assetIds,
      updates: {
        name: formData.name,
        symbol: formData.symbol,
        isinCd: formData.isinCd,
        currentPrice: formData.currentPrice ? parseFloat(formData.currentPrice) : null,
        tags: formData.tags
      }
    });

    onClose();
  };

  const handleAddTag = () => {
    if (currentTag && !formData.tags.includes(currentTag)) {
      setFormData({ ...formData, tags: [...formData.tags, currentTag] });
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSymbolChange = (e) => {
    setFormData({ ...formData, symbol: e.target.value });
    setShowSymbolWarning(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>✏️ 銘柄情報を編集</h2>
        
        {asset.isConsolidated && (
          <div style={{
            background: '#e0e7ff',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#4338ca',
            fontSize: '14px'
          }}>
            ℹ️ この編集は統合された全ての購入記録（{asset.assetIds?.length || 1}件）に適用されます
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>銘柄名 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: Apple Inc."
              required
            />
          </div>

          {asset.type === 'stock' && (
            <div className="form-group">
              <label>ティッカーシンボル</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={handleSymbolChange}
                placeholder="例: AAPL"
              />
              {showSymbolWarning && formData.symbol && (
                <div style={{
                  background: '#fff3cd',
                  padding: '10px',
                  borderRadius: '6px',
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#856404',
                  border: '1px solid #ffeeba'
                }}>
                  <strong>⚠️ 警告:</strong> ティッカーシンボルを変更すると、価格自動取得が正しく動作しなくなる可能性があります。変更する場合は、正確なシンボルを入力してください。
                </div>
              )}
            </div>
          )}

          {(asset.type === 'fund' || asset.type === 'etf') && (
            <div className="form-group">
              <label>ISINコード</label>
              <input
                type="text"
                value={formData.isinCd}
                onChange={(e) => setFormData({ ...formData, isinCd: e.target.value })}
                placeholder="例: JP90C000FJ38"
              />
            </div>
          )}

          <div className="form-group">
            <label>現在単価 ({asset.currency}) <small>（任意・手動更新用）</small></label>
            <input
              type="number"
              value={formData.currentPrice}
              onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
              step="0.01"
              placeholder="自動取得されない場合に入力"
            />
            <small style={{ color: '#6c757d', fontSize: '12px', display: 'block', marginTop: '6px' }}>
              ※ 空欄の場合は価格更新ボタンで自動取得されます
            </small>
          </div>

          {/* タグ */}
          <div className="form-group">
            <label>タグ</label>
            <div className="tags-input-container">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="タグを入力してEnter"
              />
              <button type="button" onClick={handleAddTag}>
                追加
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="tag-list">
                {formData.tags.map(tag => (
                  <span key={tag} className="tag-badge" onClick={() => handleRemoveTag(tag)}>
                    {tag} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{
            background: '#f8f9fa',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '20px',
            fontSize: '13px',
            color: '#6c757d'
          }}>
            <strong>編集できない項目:</strong>
            <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
              <li>購入日（個別購入記録から編集）</li>
              <li>数量（個別購入記録から編集）</li>
              <li>取得単価（個別購入記録から編集）</li>
              <li>通貨（変更不可）</li>
            </ul>
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

export default EditConsolidatedAssetModal;