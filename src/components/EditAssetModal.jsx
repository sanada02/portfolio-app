// src/components/EditAssetModal.jsx
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { getTags, addTag, getTagColor } from '../utils/tags';

export default function EditAssetModal({ asset, onClose, onSave, addNotification }) {
  const [editingAsset, setEditingAsset] = useState({...asset, tags: asset.tags || []});
  const [availableTags, setAvailableTags] = useState(getTags());
  const [newTagName, setNewTagName] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingAsset(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleTag = (tagName) => {
    const currentTags = editingAsset.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];
    setEditingAsset(prev => ({ ...prev, tags: newTags }));
  };

  const handleAddNewTag = () => {
    if (!newTagName.trim()) return;
    
    const updatedTags = addTag(newTagName.trim());
    setAvailableTags(updatedTags);
    
    // 新しいタグを自動的に選択
    setEditingAsset(prev => ({
      ...prev,
      tags: [...(prev.tags || []), newTagName.trim()]
    }));
    
    setNewTagName('');
    setShowTagInput(false);
    addNotification(`タグ "${newTagName.trim()}" を追加しました`, 'success');
  };

  const handleSubmit = () => {
    if (!editingAsset.quantity || !editingAsset.purchasePrice) {
      addNotification('必須項目を入力してください', 'warning');
      return;
    }
    
    const updatedAsset = {
      ...editingAsset,
      quantity: parseFloat(editingAsset.quantity),
      purchasePrice: parseFloat(editingAsset.purchasePrice),
      currentPrice: editingAsset.currentPrice ? parseFloat(editingAsset.currentPrice) : editingAsset.purchasePrice
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
          
          <div className="form-group">
            <label>タグ</label>
            <div className="tag-container">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-pill ${editingAsset.tags?.includes(tag.name) ? 'active' : ''}`}
                  style={{
                    backgroundColor: editingAsset.tags?.includes(tag.name) ? tag.color : '#f3f4f6',
                    color: editingAsset.tags?.includes(tag.name) ? 'white' : '#666'
                  }}
                  onClick={() => handleToggleTag(tag.name)}
                >
                  {tag.name}
                </button>
              ))}
              
              {showTagInput ? (
                <div className="tag-input-group">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddNewTag()}
                    placeholder="新しいタグ名"
                    className="tag-input"
                    autoFocus
                  />
                  <button type="button" onClick={handleAddNewTag} className="btn-tag-add">
                    <Plus size={16} />
                  </button>
                  <button type="button" onClick={() => {setShowTagInput(false); setNewTagName('');}} className="btn-tag-cancel">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button type="button" className="tag-pill-add" onClick={() => setShowTagInput(true)}>
                  <Plus size={16} /> 新規タグ
                </button>
              )}
            </div>
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