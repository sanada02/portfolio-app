// src/components/EditAssetModal.jsx (改善版)
import { useState } from 'react';

export default function EditAssetModal({ asset, onClose, onSave, addNotification, portfolio }) {
  const [editingAsset, setEditingAsset] = useState({
    ...asset,
    tags: asset.tags || []
  });
  const [currentTag, setCurrentTag] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingAsset(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    const tag = currentTag.trim();
    if (tag && !editingAsset.tags.includes(tag)) {
      setEditingAsset(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditingAsset(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = () => {
    if (!editingAsset.quantity || !editingAsset.purchasePrice) {
      addNotification('必須項目を入力してください', 'warning');
      return;
    }
    
    // 🔥 改善: タグが変更されているかチェック
    const originalTags = JSON.stringify((asset.tags || []).sort());
    const newTags = JSON.stringify((editingAsset.tags || []).sort());
    const tagsChanged = originalTags !== newTags;
    
    // 🔥 改善: 同一銘柄が複数あるかチェック（portfolioが渡されている場合のみ）
    let applyToAll = false;
    if (tagsChanged && portfolio) {
      const sameAssetCount = portfolio.filter(a => {
        const isSame = a.symbol 
          ? a.symbol === editingAsset.symbol 
          : a.isinCd === editingAsset.isinCd;
        return isSame;
      }).length;
      
      if (sameAssetCount > 1) {
        applyToAll = window.confirm(
          `同じ銘柄が${sameAssetCount}件あります。\n` +
          `すべてに同じタグ（${editingAsset.tags.join(', ')}）を適用しますか？`
        );
      }
    } else if (tagsChanged) {
      // portfolioが渡されていない場合はデフォルトでtrueにする（後方互換性）
      applyToAll = true;
    }
    
    const updatedAsset = {
      ...editingAsset,
      quantity: parseFloat(editingAsset.quantity),
      purchasePrice: parseFloat(editingAsset.purchasePrice),
      currentPrice: editingAsset.currentPrice ? parseFloat(editingAsset.currentPrice) : editingAsset.purchasePrice,
      applyTagsToAll: applyToAll
    };
    
    onSave(updatedAsset);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>銘柄を編集</h2>
        <div className="modal-form">
          <div className="form-group">
            <label>銘柄名</label>
            <input type="text" value={editingAsset.name} disabled className="disabled-input" />
          </div>

          {/* タグ機能 */}
          <div className="form-group">
            <label>タグ <small>(分析用。複数設定可能)</small></label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input 
                type="text" 
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="例: 金, 半導体, 新興国, etc."
                style={{ flex: 1 }}
              />
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleAddTag}
                style={{ whiteSpace: 'nowrap' }}
              >
                追加
              </button>
            </div>
            {editingAsset.tags.length > 0 && (
              <div className="tag-list">
                {editingAsset.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="tag-badge"
                    onClick={() => handleRemoveTag(tag)}
                    style={{ cursor: 'pointer' }}
                    title="クリックで削除"
                  >
                    {tag} ×
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label>購入日</label>
            <input type="date" name="purchaseDate" value={editingAsset.purchaseDate} onChange={handleInputChange} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>数量</label>
              <input type="number" name="quantity" value={editingAsset.quantity} onChange={handleInputChange} step="0.00000001" />
            </div>
            <div className="form-group">
              <label>取得単価 ({editingAsset.currency === 'USD' ? '$' : '¥'})</label>
              <input type="number" name="purchasePrice" value={editingAsset.purchasePrice} onChange={handleInputChange} step="0.01" />
            </div>
          </div>

          <div className="form-group">
            <label>現在単価 ({editingAsset.currency === 'USD' ? '$' : '¥'})</label>
            <input type="number" name="currentPrice" value={editingAsset.currentPrice || ''} onChange={handleInputChange} step="0.01" placeholder="自動更新されます" />
          </div>

          {editingAsset.type === 'fund' && (
            <>
              <div className="form-group">
                <label>ISINコード</label>
                <input type="text" value={editingAsset.isinCd} disabled className="disabled-input" />
              </div>
              <div className="form-group">
                <label>投信協会コード</label>
                <input type="text" value={editingAsset.associFundCd} disabled className="disabled-input" />
              </div>
            </>
          )}

          {editingAsset.symbol && (
            <div className="form-group">
              <label>ティッカーシンボル</label>
              <input type="text" value={editingAsset.symbol} disabled className="disabled-input" />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>キャンセル</button>
            <button type="button" className="btn-primary" onClick={handleSubmit}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}