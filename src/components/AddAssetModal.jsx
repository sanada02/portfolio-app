// src/components/AddAssetModal.jsx
import { useState } from 'react';

export default function AddAssetModal({ onClose, onAdd, addNotification }) {
  const [formData, setFormData] = useState({
    type: 'stock',
    symbol: '',
    name: '',
    quantity: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    currency: 'JPY',
    isinCd: '',
    associFundCd: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setFormData(prev => ({
      ...prev,
      type,
      currency: type === 'fund' ? 'JPY' : prev.currency
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.quantity || !formData.purchaseDate) {
      addNotification('必須項目を入力してください（銘柄名、数量、購入日）', 'warning');
      return;
    }
    if (formData.type === 'fund' && (!formData.isinCd || !formData.associFundCd)) {
      addNotification('投資信託の場合、ISINコードと投信協会コードが必要です', 'warning');
      return;
    }
    if (formData.type !== 'fund' && !formData.symbol) {
      addNotification('ティッカーシンボルを入力してください', 'warning');
      return;
    }
    
    let purchasePrice = formData.purchasePrice ? parseFloat(formData.purchasePrice) : null;
    
    if (!purchasePrice) {
      addNotification('購入日の価格を取得しています...', 'info');
      try {
        const { getPriceAtDate } = await import('../utils/priceAPI');
        const priceData = await getPriceAtDate(
          formData.type === 'fund' ? formData.isinCd : formData.symbol,
          formData.purchaseDate
        );
        
        if (priceData) {
          purchasePrice = priceData.price;
          addNotification(`購入日の価格を取得しました: ${priceData.currency} ${purchasePrice.toLocaleString()}`, 'success');
        } else {
          addNotification('購入日の価格が取得できませんでした。手動で入力してください。', 'error');
          return;
        }
      } catch (error) {
        console.error('価格取得エラー:', error);
        addNotification('価格取得に失敗しました: ' + error.message, 'error');
        return;
      }
    }
    
    const newAsset = {
      id: Date.now().toString(),
      type: formData.type,
      symbol: formData.symbol,
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      purchasePrice: purchasePrice,
      currentPrice: purchasePrice,
      currency: formData.currency,
      purchaseDate: formData.purchaseDate,
      ...(formData.type === 'fund' && {
        isinCd: formData.isinCd,
        associFundCd: formData.associFundCd
      })
    };
    
    onAdd(newAsset);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>銘柄を追加</h2>
        <div className="modal-form">
          <div className="form-group">
            <label>種類</label>
            <select name="type" value={formData.type} onChange={handleTypeChange}>
              <option value="stock">株式</option>
              <option value="etf">ETF</option>
              <option value="fund">投資信託</option>
              <option value="crypto">仮想通貨</option>
            </select>
          </div>

          {formData.type !== 'fund' ? (
            <>
              <div className="form-group">
                <label>ティッカーシンボル</label>
                <input type="text" name="symbol" value={formData.symbol} onChange={handleInputChange} placeholder="例: 7203.T (日本株), AAPL (米国株), BTC-JPY" />
                <small className="form-hint">日本株: 7203.T | 米国株: AAPL | 仮想通貨: BTC-JPY</small>
              </div>
              <div className="form-group">
                <label>通貨</label>
                <select name="currency" value={formData.currency} onChange={handleInputChange}>
                  <option value="JPY">円 (JPY)</option>
                  <option value="USD">ドル (USD)</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>ISINコード</label>
                <input type="text" name="isinCd" value={formData.isinCd} onChange={handleInputChange} placeholder="例: JP90C000RGT5" />
              </div>
              <div className="form-group">
                <label>投信協会コード</label>
                <input type="text" name="associFundCd" value={formData.associFundCd} onChange={handleInputChange} placeholder="例: 9I312252" />
              </div>
            </>
          )}

          <div className="form-group">
            <label>銘柄名</label>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="例: トヨタ自動車, Apple Inc." />
          </div>

          <div className="form-group">
            <label>購入日 <span className="required">*必須</span></label>
            <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>数量</label>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} step="0.00000001" placeholder="100" />
            </div>
            <div className="form-group">
              <label>取得単価 ({formData.currency === 'USD' ? '$' : '¥'}) <small>※空欄で自動取得</small></label>
              <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleInputChange} step="0.01" placeholder="空欄で自動取得" />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>キャンセル</button>
            <button type="button" className="btn-primary" onClick={handleSubmit}>追加</button>
          </div>
        </div>
      </div>
    </div>
  );
}