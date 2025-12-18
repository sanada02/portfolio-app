// src/components/AddDividendModal.jsx
import React, { useState } from 'react';
import { getTodayJST } from '../utils/dateUtils';

const AddDividendModal = ({ onClose, onAdd, portfolio, addNotification }) => {
  const [formData, setFormData] = useState({
    assetId: '',
    date: getTodayJST(),
    amountJPY: ''
  });

  const [selectedAssetName, setSelectedAssetName] = useState('');

  // 統合銘柄（同じ名前の銘柄をグループ化）
  const consolidatedAssets = React.useMemo(() => {
    if (!portfolio || portfolio.length === 0) return [];
    
    const grouped = {};
    portfolio.forEach(asset => {
      const key = asset.name;
      if (!grouped[key]) {
        grouped[key] = {
          name: asset.name,
          assetIds: [asset.id],
          symbol: asset.symbol || asset.isinCd,
          type: asset.type
        };
      } else {
        grouped[key].assetIds.push(asset.id);
      }
    });
    
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [portfolio]);

  const handleAssetChange = (e) => {
    const selectedName = e.target.value;
    setSelectedAssetName(selectedName);
    
    if (selectedName) {
      const asset = consolidatedAssets.find(a => a.name === selectedName);
      if (asset) {
        // 統合銘柄の場合は最初のIDを使用
        setFormData(prev => ({
          ...prev,
          assetId: asset.assetIds[0]
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        assetId: ''
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // バリデーション
    if (!formData.assetId) {
      addNotification('銘柄を選択してください', 'warning');
      return;
    }

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

    // 配当データを作成
    const dividendData = {
      assetId: formData.assetId,
      date: formData.date,
      amountJPY: amount
    };

    onAdd(dividendData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>💰 配当を追加</h2>

        {consolidatedAssets.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6c757d'
          }}>
            <p>銘柄が登録されていません</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              先に「資産追加」から銘柄を登録してください
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>銘柄 *</label>
              <select
                value={selectedAssetName}
                onChange={handleAssetChange}
                required
              >
                <option value="">-- 銘柄を選択 --</option>
                {consolidatedAssets.map((asset) => (
                  <option key={asset.name} value={asset.name}>
                    {asset.name} ({asset.symbol || asset.type})
                  </option>
                ))}
              </select>
              {selectedAssetName && (
                <small style={{ 
                  display: 'block', 
                  marginTop: '6px', 
                  color: '#6c757d',
                  fontSize: '12px' 
                }}>
                  {(() => {
                    const asset = consolidatedAssets.find(a => a.name === selectedAssetName);
                    if (asset && asset.assetIds.length > 1) {
                      return `※ この銘柄は${asset.assetIds.length}回の購入記録があります`;
                    }
                    return null;
                  })()}
                </small>
              )}
            </div>

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
                  placeholder="1000"
                  required
                />
              </div>
            </div>

            {/* プレビュー */}
            {formData.amountJPY && parseFloat(formData.amountJPY) > 0 && (
              <div style={{
                background: '#e0e7ff',
                padding: '16px',
                borderRadius: '8px',
                marginTop: '20px'
              }}>
                <div style={{ fontSize: '14px', color: '#4338ca', marginBottom: '8px' }}>
                  配当金額
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4338ca' }}>
                  ¥{parseFloat(formData.amountJPY).toLocaleString()}
                </div>
              </div>
            )}

            <div style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              marginTop: '20px',
              fontSize: '13px',
              color: '#6c757d'
            }}>
              <strong>💡 ヒント:</strong>
              <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                <li>配当は税引後の実際に受け取った金額を入力してください</li>
                <li>配当は評価額には影響せず、パフォーマンス分析でのみ使用されます</li>
                <li>配当受取日は過去の日付のみ選択可能です</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                キャンセル
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={!formData.assetId || !formData.date || !formData.amountJPY}
              >
                追加
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddDividendModal;