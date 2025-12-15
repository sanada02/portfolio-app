// src/components/TagManagementModal.jsx
import { useState } from 'react';
import { X, Edit2, Trash2, Check } from 'lucide-react';
import { getTags, updateTag, deleteTag } from '../utils/tags';

export default function TagManagementModal({ onClose, onUpdate, addNotification }) {
  const [tags, setTags] = useState(getTags());
  const [editingTag, setEditingTag] = useState(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (tag) => {
    setEditingTag(tag.id);
    setEditName(tag.name);
  };

  const handleSaveEdit = (tagId) => {
    if (!editName.trim()) {
      addNotification('タグ名を入力してください', 'warning');
      return;
    }

    const updatedTags = updateTag(tagId, editName.trim());
    setTags(updatedTags);
    setEditingTag(null);
    setEditName('');
    onUpdate();
    addNotification('タグを更新しました', 'success');
  };

  const handleDelete = (tagId, tagName) => {
    if (window.confirm(`タグ「${tagName}」を削除しますか？\n※ このタグが付けられた銘柄からタグが削除されます`)) {
      const updatedTags = deleteTag(tagId);
      setTags(updatedTags);
      onUpdate();
      addNotification(`タグ「${tagName}」を削除しました`, 'success');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>タグ管理</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-form">
          <div className="tag-management-list">
            {tags.length === 0 ? (
              <p className="empty-message">タグがありません</p>
            ) : (
              tags.map(tag => (
                <div key={tag.id} className="tag-management-item">
                  {editingTag === tag.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(tag.id)}
                        className="tag-edit-input"
                        autoFocus
                      />
                      <button
                        className="btn-icon-small btn-success"
                        onClick={() => handleSaveEdit(tag.id)}
                        title="保存"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className="btn-icon-small btn-secondary"
                        onClick={() => {
                          setEditingTag(null);
                          setEditName('');
                        }}
                        title="キャンセル"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="tag-color-preview"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="tag-name">{tag.name}</span>
                      <div className="tag-actions">
                        <button
                          className="btn-icon-small"
                          onClick={() => handleStartEdit(tag)}
                          title="編集"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon-small btn-danger"
                          onClick={() => handleDelete(tag.id, tag.name)}
                          title="削除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>閉じる</button>
          </div>
        </div>
      </div>
    </div>
  );
}