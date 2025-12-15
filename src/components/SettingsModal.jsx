// src/components/SettingsModal.jsx
import { useRef } from 'react';
import { Download, Upload, History } from 'lucide-react';
import { exportBackup, importBackup, clearAllData } from '../utils/backup';

export default function SettingsModal({ 
  onClose, 
  portfolio, 
  dailyHistory, 
  isUpdating, 
  setIsUpdating,
  loadDailyHistory,
  addNotification 
}) {
  const fileInputRef = useRef(null);

  const handleExportBackup = async () => {
    try {
      const result = await exportBackup();
      addNotification(`バックアップが完了しました！保存されたレコード数: ${result.recordCount}`, 'success');
    } catch (error) {
      addNotification('バックアップに失敗しました: ' + error.message, 'error');
    }
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!window.confirm('現在のデータは上書きされます。続けますか？')) {
      event.target.value = '';
      return;
    }
    try {
      const result = await importBackup(file);
      addNotification(`バックアップを復元しました！銘柄数: ${result.portfolioCount}、価格履歴: ${result.priceHistoryCount}件`, 'success');
      window.location.reload();
    } catch (error) {
      addNotification('復元に失敗しました: ' + error.message, 'error');
    }
    event.target.value = '';
  };

  const handleClearAllData = async () => {
    if (!window.confirm('全てのデータを削除します。本当によろしいですか？\n\n※バックアップを取っておくことをおすすめします')) return;
    if (!window.confirm('最終確認: この操作は取り消せません。削除しますか？')) return;
    try {
      await clearAllData();
      addNotification('全てのデータを削除しました', 'success');
      window.location.reload();
    } catch (error) {
      addNotification('削除に失敗しました: ' + error.message, 'error');
    }
  };

  const handleRebuildHistory = async () => {
    if (portfolio.length === 0) {
      addNotification('銘柄が登録されていません', 'warning');
      return;
    }
    
    if (!window.confirm('全銘柄の購入日から現在までの履歴データを取得します。\n\n時間がかかる場合がありますがよろしいですか？')) {
      return;
    }
    
    setIsUpdating(true);
    onClose();
    
    try {
      addNotification('履歴データの取得を開始しています...', 'info');
      
      const { rebuildAllHistory, regenerateDailySnapshots } = await import('../utils/priceAPI');
      const historyResult = await rebuildAllHistory(portfolio);
      
      if (historyResult.errors) {
        historyResult.errors.forEach(error => {
          addNotification(error, 'error');
        });
      }
      
      addNotification('日次スナップショットを生成しています...', 'info');
      
      const snapshotResult = await regenerateDailySnapshots(portfolio);
      
      if (snapshotResult.success) {
        await loadDailyHistory();
        addNotification(`履歴再構築完了！${snapshotResult.snapshotCount}日分のデータを生成しました`, 'success');
      }
    } catch (error) {
      console.error('履歴再構築エラー:', error);
      addNotification('履歴の再構築に失敗しました: ' + error.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCheckDatabase = async () => {
    const db = (await import('../utils/database')).default;
    const priceCount = await db.priceHistory.count();
    const snapshotCount = await db.dailySnapshots.count();
    const rateCount = await db.exchangeRates.count();
    alert(`データベース状態:\n\n価格履歴: ${priceCount}件\n日次スナップショット: ${snapshotCount}件\n為替レート: ${rateCount}件`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-settings" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ 設定</h2>
        
        <div className="settings-section">
          <h3>📦 バックアップ</h3>
          <p className="settings-description">ポートフォリオデータと価格履歴を保存・復元できます</p>
          <div className="settings-buttons">
            <button className="btn-primary" onClick={handleExportBackup}>
              <Download size={20} />バックアップをダウンロード
            </button>
            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload size={20} />バックアップから復元
            </button>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportBackup} />
          </div>
        </div>
        
        <div className="settings-section">
          <h3>📈 履歴データ</h3>
          <p className="settings-description">購入日から現在までの全履歴データを取得し、日次グラフを生成します（売却も反映されます）</p>
          <button className="btn-primary" onClick={handleRebuildHistory} disabled={isUpdating}>
            <History size={20} />
            {isUpdating ? '処理中...' : '履歴を再構築'}
          </button>
        </div>

        <div className="settings-section">
          <h3>🗑️ データ管理</h3>
          <p className="settings-description">全てのデータを削除します（復元できません）</p>
          <button className="btn-danger" onClick={handleClearAllData}>全データを削除</button>
        </div>

        <div className="settings-section">
          <h3>ℹ️ ストレージ情報</h3>
          <div className="storage-info">
            <div className="info-item">
              <span>保有銘柄数:</span>
              <strong>{portfolio.length}銘柄</strong>
            </div>
            <div className="info-item">
              <span>記録日数:</span>
              <strong>{dailyHistory.length}日</strong>
            </div>
          </div>
          <button 
            className="btn-secondary" 
            style={{marginTop: '1rem', width: '100%'}}
            onClick={handleCheckDatabase}
          >
            データベース状態を確認
          </button>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}