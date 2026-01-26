// src/components/SellHistoryModal.jsx
import { Trash2 } from 'lucide-react';
import { assetTypeNames } from '../utils/storage';

export default function SellHistoryModal({ sellHistory, onClose, onDelete }) {
  if (sellHistory.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
          <h2>📊 売却履歴</h2>
          <p className="empty-message">売却履歴がありません</p>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>閉じる</button>
          </div>
        </div>
      </div>
    );
  }

  // 合計損益を計算
  const totalProfitJPY = sellHistory.reduce((sum, record) => sum + record.profitJPY, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <h2>📊 売却履歴</h2>

        <div className="sell-history-summary">
          <div className="summary-card">
            <span>売却回数</span>
            <strong>{sellHistory.length}回</strong>
          </div>
          <div className="summary-card">
            <span>合計損益（円）</span>
            <strong className={totalProfitJPY >= 0 ? 'profit' : 'loss'}>
              {totalProfitJPY >= 0 ? '+' : ''}¥{totalProfitJPY.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </strong>
          </div>
        </div>

        <div className="table-container" style={{ maxHeight: '400px', overflow: 'auto' }}>
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>売却日</th>
                <th>種類</th>
                <th>銘柄名</th>
                <th>数量</th>
                <th>取得単価</th>
                <th>売却単価</th>
                <th>損益</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sellHistory.map((record) => (
                <tr key={record.id}>
                  <td>{record.sellDate}</td>
                  <td>
                    <span className="asset-type-badge">{assetTypeNames[record.type]}</span>
                  </td>
                  <td>
                    <div>
                      <div className="asset-name">{record.name}</div>
                      <div className="asset-symbol">{record.symbol || record.isinCd}</div>
                      <small style={{ color: '#999' }}>取得日: {record.purchaseDate}</small>
                    </div>
                  </td>
                  <td>{record.quantity}</td>
                  <td>{record.currency === 'USD' ? '$' : record.currency === 'HKD' ? 'HK$' : '¥'}{record.purchasePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td>{record.currency === 'USD' ? '$' : record.currency === 'HKD' ? 'HK$' : '¥'}{record.sellPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className={record.profitJPY >= 0 ? 'profit' : 'loss'}>
                    {record.profitJPY >= 0 ? '+' : ''}¥{record.profitJPY.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <br />
                    <small>({record.profitPercent >= 0 ? '+' : ''}{record.profitPercent.toFixed(2)}%)</small>
                    {(record.currency === 'USD' || record.currency === 'HKD') && (
                      <>
                        <br />
                        <small style={{ color: '#999' }}>
                          {record.profit >= 0 ? '+' : ''}{record.currency === 'USD' ? '$' : 'HK$'}{record.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </small>
                      </>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => {
                        if (window.confirm('この売却記録を削除しますか？')) {
                          onDelete(record.id);
                        }
                      }}
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}