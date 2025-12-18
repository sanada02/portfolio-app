// src/components/EditDividendModal.jsx
import React, { useState } from 'react';
import { getTodayJST } from '../utils/dateUtils';

const EditDividendModal = ({ dividend, onClose, onSave, addNotification }) => {
  const [formData, setFormData] = useState({
    date: dividend.date,
    amountJPY: dividend.amountJPY
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // バリデーション
    if (!formData.date) {
      addNotification('配当受取日を入力してください', 'warning');
      return;
    }

    const amount = parseFloat(formData.amountJPY);
    if (!amount || amount <= 0 || isNaN(amount)) {
      addNotification('配当金額は正の数値を入力してください', 'warning');
      return;
    }

    // 日付が未来でないかチェック
    const dividendDate = new Date(formData.date + 'T00:00:00+09:00');
    const today = new Date();
    const todayJST = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    todayJST.setHours(0, 0, 0, 0);

    if (dividendDate > todayJST) {
      addNotification('配当受取日が未来の日付になっています', 'warning');
      return;
    }

    // 更新データを作成
    const updates = {
      date: formData.date,
      amountJPY: amount
    };

    onSave(dividend.id, updates);
  };

  // 元の配当金額との差分を計算
  const originalAmount = dividend.amountJPY;
  const newAmount = parseFloat(formData.amountJPY) || 0;
  const difference = newAmount - originalAmount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>✏️ 配当を編集</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>配当受取日 *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                max={getTodayJST()}
                required
              />
            </div>

            <div className="form-group">
              <label>配当金額 (円) *</label>
              <input
                type="number"
                name="amountJPY"
                value={formData.amountJPY}
                onChange={handleInputChange}
                step="0.01"
                min="0.01"
                required
              />
            </div>
          </div>

          {/* 変更プレビュー */}
          {difference !== 0 && (
            <div style={{
              background: difference > 0 ? '#d1fae5' : '#fee2e2',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '20px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                変更内容
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>変更前</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    ¥{originalAmount.toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: '20px', color: '#6c757d' }}>→</div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>変更後</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: difference > 0 ? '#10b981' : '#ef4444' }}>
                    ¥{newAmount.toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ 
                marginTop: '12px', 
                paddingTop: '12px', 
                borderTop: '1px solid rgba(0,0,0,0.1)',
                fontSize: '14px',
                fontWeight: '600',
                color: difference > 0 ? '#10b981' : '#ef4444'
              }}>
                差額: {difference > 0 ? '+' : ''}¥{difference.toLocaleString()}
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
            <strong>⚠️ 注意:</strong> この変更は配当累計とパフォーマンス計算に影響します。
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

export default EditDividendModal;