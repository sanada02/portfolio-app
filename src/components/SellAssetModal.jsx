// src/components/SellAssetModal.jsx
import { useState } from 'react';
import { getActiveQuantity } from '../utils/calculations';

export default function SellAssetModal({ asset, sellHistory, onClose, onSell, addNotification, exchangeRate }) {
  const activeQuantity = getActiveQuantity(asset, sellHistory);
  
  const [sellData, setSellData] = useState({
    quantity: '',
    sellPrice: asset.currentPrice || asset.purchasePrice,
    sellDate: new Date().toISOString().split('T')[0]
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSellData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const sellQuantity = parseFloat(sellData.quantity);
    const sellPrice = parseFloat(sellData.sellPrice);

    if (!sellQuantity || sellQuantity <= 0) {
      addNotification('売却数量を入力してください', 'warning');
      return;
    }

    if (sellQuantity > activeQuantity) {
      addNotification(`保有数量(${activeQuantity})を超えて売却することはできません`, 'warning');
      return;
    }

    if (!sellPrice || sellPrice <= 0) {
      addNotification('売却単価を入力してください', 'warning');
      return;
    }

    // 売却益の計算（原通貨建て）
    const purchaseValue = asset.purchasePrice * sellQuantity;
    const sellValue = sellPrice * sellQuantity;
    const profit = sellValue - purchaseValue;

    // 円建て売却益（為替レート適用）
    const profitJPY = asset.currency === 'USD' ? profit * exchangeRate : profit;

    const sellRecord = {
      id: Date.now().toString(),
      originalAssetId: asset.id,
      type: asset.type,
      symbol: asset.symbol,
      isinCd: asset.isinCd,
      name: asset.name,
      quantity: sellQuantity,
      purchasePrice: asset.purchasePrice,
      purchaseDate: asset.purchaseDate,
      sellPrice: sellPrice,
      sellDate: sellData.sellDate,
      currency: asset.currency,
      profit: profit,
      profitJPY: profitJPY,
      profitPercent: (profit / purchaseValue) * 100,
      exchangeRate: asset.currency === 'USD' ? exchangeRate : null
    };

    onSell(sellRecord);
  };

  const sellQuantity = parseFloat(sellData.quantity) || 0;
  const sellPrice = parseFloat(sellData.sellPrice) || 0;
  const purchaseValue = asset.purchasePrice * sellQuantity;
  const sellValue = sellPrice * sellQuantity;
  const profit = sellValue - purchaseValue;
  const profitJPY = asset.currency === 'USD' ? profit * exchangeRate : profit;
  const remainingAfterSell = activeQuantity - sellQuantity;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>銘柄を売却</h2>
        <div className="modal-form">
          <div className="form-group">
            <label>銘柄名</label>
            <input type="text" value={asset.name} disabled className="disabled-input" />
          </div>

          <div className="form-group">
            <label>現在の保有数量</label>
            <input 
              type="text" 
              value={`${activeQuantity} ${asset.currency === 'USD' ? '株' : '口'}`} 
              disabled 
              className="disabled-input" 
            />
            {asset.quantity !== activeQuantity && (
              <small style={{color: '#f59e0b'}}>
                ※ 元の数量: {asset.quantity} (売却済み: {(asset.quantity - activeQuantity).toFixed(8)})
              </small>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>取得単価</label>
              <input type="text" value={`${asset.currency === 'USD' ? '$' : '¥'}${asset.purchasePrice.toLocaleString()}`} disabled className="disabled-input" />
            </div>
            <div className="form-group">
              <label>取得日</label>
              <input type="text" value={asset.purchaseDate} disabled className="disabled-input" />
            </div>
          </div>

          <div className="form-group">
            <label>売却日</label>
            <input type="date" name="sellDate" value={sellData.sellDate} onChange={handleInputChange} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>売却数量</label>
              <input 
                type="number" 
                name="quantity" 
                value={sellData.quantity} 
                onChange={handleInputChange} 
                step="0.00000001" 
                max={activeQuantity}
                placeholder={`最大: ${activeQuantity}`}
              />
            </div>
            <div className="form-group">
              <label>売却単価 ({asset.currency === 'USD' ? '$' : '¥'})</label>
              <input 
                type="number" 
                name="sellPrice" 
                value={sellData.sellPrice} 
                onChange={handleInputChange} 
                step="0.01" 
              />
            </div>
          </div>

          {sellQuantity > 0 && (
            <div className="sell-summary">
              <div className="summary-row">
                <span>売却後の保有数量:</span>
                <strong>{remainingAfterSell.toFixed(8)}</strong>
              </div>
              <div className="summary-row">
                <span>取得金額:</span>
                <span>{asset.currency === 'USD' ? '$' : '¥'}{purchaseValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
              </div>
              <div className="summary-row">
                <span>売却金額:</span>
                <span>{asset.currency === 'USD' ? '$' : '¥'}{sellValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
              </div>
              <div className={`summary-row ${profit >= 0 ? 'profit' : 'loss'}`}>
                <span>売却損益:</span>
                <strong>
                  {profit >= 0 ? '+' : ''}{asset.currency === 'USD' ? '$' : '¥'}{profit.toLocaleString(undefined, {maximumFractionDigits: 2})}
                  ({profit >= 0 ? '+' : ''}{((profit / purchaseValue) * 100).toFixed(2)}%)
                </strong>
              </div>
              {asset.currency === 'USD' && (
                <div className={`summary-row ${profitJPY >= 0 ? 'profit' : 'loss'}`}>
                  <span>売却損益（円）:</span>
                  <strong>
                    {profitJPY >= 0 ? '+' : ''}¥{profitJPY.toLocaleString(undefined, {maximumFractionDigits: 0})}
                  </strong>
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>キャンセル</button>
            <button type="button" className="btn-danger" onClick={handleSubmit}>売却実行</button>
          </div>
        </div>
      </div>
    </div>
  );
}