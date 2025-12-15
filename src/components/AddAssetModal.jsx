// src/components/AddAssetModal.jsx (改善版)
import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

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
    associFundCd: '',
    tags: []
  });

  const [validationStatus, setValidationStatus] = useState(null); // 'checking' | 'valid' | 'invalid' | null
  const [validationMessage, setValidationMessage] = useState('');
  const [currentTag, setCurrentTag] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // シンボルやコードが変更されたら検証状態をリセット
    if (name === 'symbol' || name === 'isinCd' || name === 'associFundCd') {
      setValidationStatus(null);
      setValidationMessage('');
    }
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setFormData(prev => ({
      ...prev,
      type,
      currency: type === 'fund' ? 'JPY' : prev.currency
    }));
    setValidationStatus(null);
    setValidationMessage('');
  };

  const handleAddTag = () => {
    const tag = currentTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
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

  // API検証
  const handleValidate = async () => {
    if (formData.type === 'fund') {
      if (!formData.isinCd || !formData.associFundCd) {
        setValidationMessage('ISINコードと投信協会コードを入力してください');
        return;
      }
    } else {
      if (!formData.symbol) {
        setValidationMessage('ティッカーシンボルを入力してください');
        return;
      }
    }

    setValidationStatus('checking');
    setValidationMessage('価格情報を確認中...');

    try {
      if (formData.type === 'fund') {
        // 投資信託の検証
        const { getFundPrice } = await import('../utils/priceAPI');
        const result = await getFundPrice(formData.isinCd, formData.associFundCd);
        
        if (result && result.price) {
          setValidationStatus('valid');
          setValidationMessage(`✓ 確認完了: ¥${result.price.toLocaleString()} (${result.date})`);
          
          // 価格が取得できた場合、フォームに反映
          if (!formData.purchasePrice) {
            setFormData(prev => ({ ...prev, purchasePrice: result.price.toString() }));
          }
        } else {
          throw new Error('価格情報を取得できませんでした');
        }
      } else {
        // 株式・ETF・仮想通貨の検証
        const { getCurrentPrice } = await import('../utils/priceAPI');
        const result = await getCurrentPrice(formData.symbol);
        
        if (result && result.price) {
          setValidationStatus('valid');
          setValidationMessage(`✓ 確認完了: ${result.currency} ${result.price.toLocaleString()}`);
          
          // 🔥 改善: 通貨がまだJPYのままの場合のみ上書き
          setFormData(prev => {
            const shouldUpdateCurrency = prev.currency === 'JPY' || prev.type === 'fund';
            return {
              ...prev, 
              currency: shouldUpdateCurrency ? result.currency : prev.currency,
              purchasePrice: !prev.purchasePrice ? result.price.toString() : prev.purchasePrice
            };
          });
        } else {
          throw new Error('価格情報を取得できませんでした');
        }
      }
    } catch (error) {
      console.error('検証エラー:', error);
      setValidationStatus('invalid');
      setValidationMessage(`✗ エラー: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.quantity || !formData.purchaseDate) {
      addNotification('必須項目を入力してください(銘柄名、数量、購入日)', 'warning');
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

    // 🔥 改善: 購入日が未来でないかチェック
    const purchaseDate = new Date(formData.purchaseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (purchaseDate > today) {
      addNotification('購入日が未来の日付になっています', 'warning');
      return;
    }

    // 🔥 改善: 数量が負の値でないかチェック
    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      addNotification('数量は正の数値を入力してください', 'warning');
      return;
    }

    // 検証が失敗している場合は確認
    if (validationStatus === 'invalid') {
      const confirmed = window.confirm(
        '価格情報の取得に失敗していますが、このまま追加しますか？\n\n' +
        '※価格情報が取得できない場合、正確な評価額が表示されない可能性があります。'
      );
      if (!confirmed) return;
    }

    // 未検証の場合も確認
    if (validationStatus === null) {
      const confirmed = window.confirm(
        '価格情報の確認を行っていませんが、このまま追加しますか？\n\n' +
        '※「価格を確認」ボタンで事前に検証することをおすすめします。'
      );
      if (!confirmed) return;
    }
    
    let purchasePrice = formData.purchasePrice ? parseFloat(formData.purchasePrice) : null;
    
    // 🔥 改善: 取得単価のバリデーション
    if (purchasePrice && (isNaN(purchasePrice) || purchasePrice <= 0)) {
      addNotification('取得単価は正の数値を入力してください', 'warning');
      return;
    }
    
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
      quantity: quantity,
      purchasePrice: purchasePrice,
      currentPrice: purchasePrice,
      currency: formData.currency,
      purchaseDate: formData.purchaseDate,
      tags: formData.tags,
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
                <input 
                  type="text" 
                  name="symbol" 
                  value={formData.symbol} 
                  onChange={handleInputChange} 
                  placeholder="例: 7203.T (日本株), AAPL (米国株), BTC-JPY" 
                />
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
                <input 
                  type="text" 
                  name="isinCd" 
                  value={formData.isinCd} 
                  onChange={handleInputChange} 
                  placeholder="例: JP90C000RGT5" 
                />
              </div>
              <div className="form-group">
                <label>投信協会コード</label>
                <input 
                  type="text" 
                  name="associFundCd" 
                  value={formData.associFundCd} 
                  onChange={handleInputChange} 
                  placeholder="例: 9I312252" 
                />
              </div>
            </>
          )}

          {/* 検証ボタンとステータス */}
          <div className="form-group">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleValidate}
              disabled={validationStatus === 'checking'}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {validationStatus === 'checking' && <Loader size={16} className="spinning" />}
              {validationStatus === 'valid' && <CheckCircle size={16} style={{color: '#10b981'}} />}
              {validationStatus === 'invalid' && <AlertCircle size={16} style={{color: '#ef4444'}} />}
              価格を確認
            </button>
            {validationMessage && (
              <small 
                className="form-hint" 
                style={{ 
                  color: validationStatus === 'valid' ? '#10b981' : 
                         validationStatus === 'invalid' ? '#ef4444' : '#666',
                  marginTop: '0.5rem',
                  display: 'block'
                }}
              >
                {validationMessage}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>銘柄名</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange} 
              placeholder="例: トヨタ自動車, Apple Inc." 
            />
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
            {formData.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {formData.tags.map(tag => (
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
            <label>購入日 <span className="required">*必須</span></label>
            <input 
              type="date" 
              name="purchaseDate" 
              value={formData.purchaseDate} 
              onChange={handleInputChange} 
              max={new Date().toISOString().split('T')[0]}
            />
            <small className="form-hint">※未来の日付は選択できません</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>数量</label>
              <input 
                type="number" 
                name="quantity" 
                value={formData.quantity} 
                onChange={handleInputChange} 
                step="0.00000001" 
                min="0.00000001"
                placeholder="100" 
              />
            </div>
            <div className="form-group">
              <label>取得単価 ({formData.currency === 'USD' ? '$' : '¥'}) <small>※空欄で自動取得</small></label>
              <input 
                type="number" 
                name="purchasePrice" 
                value={formData.purchasePrice} 
                onChange={handleInputChange} 
                step="0.01" 
                min="0.01"
                placeholder="空欄で自動取得" 
              />
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