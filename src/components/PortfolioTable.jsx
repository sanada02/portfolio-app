// src/components/PortfolioTable.jsx
import { useState } from 'react';
import { Edit2, Trash2, ChevronDown, ChevronRight, Info, TrendingDown } from 'lucide-react';
import { assetTypeNames } from '../utils/storage';
import { groupAssetsBySymbol, getActiveQuantity } from '../utils/calculations';

export default function PortfolioTable({ portfolio, sellHistory, exchangeRate, onEdit, onDelete, onSell }) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedDetails, setExpandedDetails] = useState({});

  const toggleGroupExpand = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDetailExpand = (id) => {
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const groupedPortfolio = groupAssetsBySymbol(portfolio, sellHistory);

  if (Object.keys(groupedPortfolio).length === 0) {
    return (
      <p className="empty-message">
        まだ銘柄が登録されていません。<br />
        「銘柄を追加」ボタンから登録してください。
      </p>
    );
  }

  return (
    <div className="table-container">
      <table className="portfolio-table">
        <thead>
          <tr>
            <th style={{width: '40px'}}></th>
            <th>種類</th>
            <th>銘柄名</th>
            <th>保有数量</th>
            <th>平均取得単価</th>
            <th>現在単価</th>
            <th>評価額</th>
            <th>損益</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedPortfolio).map(([key, assets]) => {
            const isExpanded = expandedGroups[key];
            const hasMultiple = assets.length > 1;
            
            // 単一銘柄の詳細表示フラグ
            const singleAssetDetailExpanded = !hasMultiple && expandedDetails[assets[0].id];
            
            // グループの合計を計算（実質保有数量を使用）
            const totalActiveQuantity = assets.reduce((sum, a) => sum + getActiveQuantity(a, sellHistory), 0);
            const totalPurchaseValue = assets.reduce((sum, a) => {
              const activeQty = getActiveQuantity(a, sellHistory);
              return sum + (a.currency === 'USD' 
                ? a.purchasePrice * activeQty * exchangeRate
                : a.purchasePrice * activeQty);
            }, 0);
            const avgPurchasePrice = totalPurchaseValue / totalActiveQuantity / (assets[0].currency === 'USD' ? exchangeRate : 1);
            
            const currentPriceToUse = assets[0].currentPrice || assets[0].purchasePrice;
            const totalCurrentValue = assets.reduce((sum, a) => {
              const activeQty = getActiveQuantity(a, sellHistory);
              const price = a.currentPrice || a.purchasePrice;
              return sum + (a.currency === 'USD' ? price * activeQty * exchangeRate : price * activeQty);
            }, 0);
            
            const totalProfitLoss = totalCurrentValue - totalPurchaseValue;
            const profitLossPercent = (totalProfitLoss / totalPurchaseValue) * 100;

            return (
              <>
                <tr key={key} className={hasMultiple ? 'grouped-row' : ''}>
                  <td>
                    {hasMultiple ? (
                      <button 
                        className="expand-btn"
                        onClick={() => toggleGroupExpand(key)}
                        title={isExpanded ? '折りたたむ' : '展開する'}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    ) : (
                      <button 
                        className="expand-btn info-btn"
                        onClick={() => toggleDetailExpand(assets[0].id)}
                        title="詳細を表示"
                      >
                        <Info size={16} />
                      </button>
                    )}
                  </td>
                  <td>
                    <span className="asset-type-badge">{assetTypeNames[assets[0].type]}</span>
                    {hasMultiple && <span className="group-count">{assets.length}件</span>}
                  </td>
                  <td>
                    <div>
                      <div className="asset-name">{assets[0].name}</div>
                      <div className="asset-symbol">{assets[0].symbol || assets[0].isinCd}</div>
                      {assets[0].tags && assets[0].tags.length > 0 && (
                        <div className="tag-list" style={{marginTop: '0.5rem'}}>
                          {assets[0].tags.map(tag => (
                            <span key={tag} className="tag-badge" style={{fontSize: '0.75rem'}}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {totalActiveQuantity.toFixed(8)}
                    {assets.reduce((sum, a) => sum + a.quantity, 0) !== totalActiveQuantity && (
                      <div style={{fontSize: '0.75rem', color: '#999'}}>
                        (購入: {assets.reduce((sum, a) => sum + a.quantity, 0).toFixed(8)})
                      </div>
                    )}
                  </td>
                  <td>{assets[0].currency === 'USD' ? '$' : '¥'}{avgPurchasePrice.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                  <td>{assets[0].currency === 'USD' ? '$' : '¥'}{currentPriceToUse.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                  <td>
                    ¥{totalCurrentValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    {assets[0].currency === 'USD' && (
                      <div className="currency-original">
                        ${(totalActiveQuantity * currentPriceToUse).toLocaleString(undefined, {maximumFractionDigits: 2})}
                      </div>
                    )}
                  </td>
                  <td className={totalProfitLoss >= 0 ? 'profit' : 'loss'}>
                    {totalProfitLoss >= 0 ? '+' : ''}¥{totalProfitLoss.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    <br /><small>({profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)</small>
                  </td>
                  <td>
                    {!hasMultiple && (
                      <>
                        <button className="btn-icon btn-sell" onClick={() => onSell(assets[0])} title="売却">
                          <TrendingDown size={16} />
                        </button>
                        <button className="btn-icon" onClick={() => onEdit(assets[0])} title="編集">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => onDelete(assets[0].id)} title="削除">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
                
                {/* 単一銘柄の詳細表示 */}
                {!hasMultiple && singleAssetDetailExpanded && (
                  <tr className="detail-row">
                    <td></td>
                    <td colSpan="8">
                      <div className="asset-details">
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">購入日:</span>
                            <span className="detail-value">{assets[0].purchaseDate}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">元の数量:</span>
                            <span className="detail-value">{assets[0].quantity}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">売却済み:</span>
                            <span className="detail-value">
                              {(assets[0].quantity - getActiveQuantity(assets[0], sellHistory)).toFixed(8)}
                            </span>
                          </div>
                          {assets[0].symbol && (
                            <div className="detail-item">
                              <span className="detail-label">ティッカー:</span>
                              <span className="detail-value">{assets[0].symbol}</span>
                            </div>
                          )}
                          {assets[0].isinCd && (
                            <div className="detail-item">
                              <span className="detail-label">ISINコード:</span>
                              <span className="detail-value">{assets[0].isinCd}</span>
                            </div>
                          )}
                          {assets[0].associFundCd && (
                            <div className="detail-item">
                              <span className="detail-label">投信協会コード:</span>
                              <span className="detail-value">{assets[0].associFundCd}</span>
                            </div>
                          )}
                          <div className="detail-item">
                            <span className="detail-label">通貨:</span>
                            <span className="detail-value">{assets[0].currency}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                
                {/* 複数銘柄の展開表示 */}
                {hasMultiple && isExpanded && assets.map((asset) => {
                  const activeQty = getActiveQuantity(asset, sellHistory);
                  const currentPrice = asset.currentPrice || asset.purchasePrice;
                  const currentValue = asset.currency === 'USD' ? currentPrice * activeQty * exchangeRate : currentPrice * activeQty;
                  const purchaseValue = asset.currency === 'USD' ? asset.purchasePrice * activeQty * exchangeRate : asset.purchasePrice * activeQty;
                  const profitLoss = currentValue - purchaseValue;
                  const profitPercent = (profitLoss / purchaseValue) * 100;
                  
                  return (
                    <tr key={asset.id} className="detail-row">
                      <td></td>
                      <td></td>
                      <td>
                        <div className="detail-info">
                          <small>購入日: {asset.purchaseDate}</small>
                          <small>元の数量: {asset.quantity}</small>
                          {asset.quantity !== activeQty && (
                            <small style={{color: '#f59e0b'}}>売却済み: {(asset.quantity - activeQty).toFixed(8)}</small>
                          )}
                          {asset.associFundCd && <small>投信協会: {asset.associFundCd}</small>}
                        </div>
                      </td>
                      <td>{activeQty.toFixed(8)}</td>
                      <td>{asset.currency === 'USD' ? '$' : '¥'}{asset.purchasePrice.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                      <td>{asset.currency === 'USD' ? '$' : '¥'}{currentPrice.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                      <td>¥{currentValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                      <td className={profitLoss >= 0 ? 'profit' : 'loss'}>
                        {profitLoss >= 0 ? '+' : ''}¥{profitLoss.toLocaleString(undefined, {maximumFractionDigits: 0})}
                        <br /><small>({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)</small>
                      </td>
                      <td>
                        <button className="btn-icon btn-sell" onClick={() => onSell(asset)} title="売却">
                          <TrendingDown size={16} />
                        </button>
                        <button className="btn-icon" onClick={() => onEdit(asset)} title="編集">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => onDelete(asset.id)} title="削除">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}