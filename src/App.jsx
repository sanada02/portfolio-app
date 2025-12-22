// src/App.jsx (配当機能統合版)
import React, { useState, useEffect, useRef } from 'react';
import { loadPortfolio, savePortfolio, exportData, importData, getSellHistory, addDividend, updateDividend, deleteDividend } from './utils/storage';
import { updateAllPrices, rebuildAllHistory, regenerateDailySnapshots, generateTodaySnapshot } from './utils/priceAPI';
import { getDailySnapshots, clearAllIndexedDB } from './utils/database';
import { getConsolidatedPortfolio, getTagAnalysis, getAssetsByTag, getAllUniqueTags } from './utils/portfolioUtils';
import { usePortfolioHandlers } from './hooks/usePortfolioHandlers';
import AddAssetModal from './components/AddAssetModal';
import EditConsolidatedAssetModal from './components/EditConsolidatedAssetModal';
import EditPurchaseRecordModal from './components/EditPurchaseRecordModal';
import EditSellRecordModal from './components/EditSellRecordModal';
import SellAssetModal from './components/SellAssetModal';
import AssetDetailModal from './components/AssetDetailModal';
import AddDividendModal from './components/AddDividendModal';
import EditDividendModal from './components/EditDividendModal';
import PortfolioSummaryAndTable from './components/PortfolioSummaryAndTable';
import PerformanceChart from './components/PerformanceChart';
import AssetAllocationChart from './components/AssetAllocationChart';
import Toast from './components/Toast';
import './App.css';

function App() {
  // ========== State Management ==========
  const [portfolio, setPortfolio] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditConsolidatedModalOpen, setIsEditConsolidatedModalOpen] = useState(false);
  const [isEditPurchaseModalOpen, setIsEditPurchaseModalOpen] = useState(false);
  const [isEditSellRecordModalOpen, setIsEditSellRecordModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddDividendModalOpen, setIsAddDividendModalOpen] = useState(false);
  const [isEditDividendModalOpen, setIsEditDividendModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedSellRecord, setSelectedSellRecord] = useState(null);
  const [selectedDividend, setSelectedDividend] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(150);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshotData, setSnapshotData] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [toasts, setToasts] = useState([]);
  const [excludeCrypto, setExcludeCrypto] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sellHistory, setSellHistory] = useState([]);
  const fileInputRef = useRef(null);

  // ========== Initialize ==========
  useEffect(() => {
    const loadedPortfolio = loadPortfolio();
    setPortfolio(loadedPortfolio);
    
    const loadedSellHistory = getSellHistory();
    setSellHistory(loadedSellHistory);
    
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    const snapshots = await getDailySnapshots(null);
    setSnapshotData(snapshots);
  };

  // ========== Toast Notifications ==========
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // ========== Portfolio Handlers (Custom Hook) ==========
  const {
    handleAddAsset,
    handleEditConsolidatedAsset,
    handleEditPurchaseRecord,
    handleDeletePurchase,
    handleDeleteSellRecord,
    handleDeleteAsset: deleteAsset,
    handleSellAsset,
    handleSaveSellRecord
  } = usePortfolioHandlers(portfolio, setPortfolio, addNotification, loadSnapshots);

  const handleDeleteAsset = (assetId) => {
    deleteAsset(assetId, () => getConsolidatedPortfolio(portfolio));
  };

  // ========== Dividend Handlers ==========
  
  const handleAddDividend = (dividendData) => {
    const result = addDividend(dividendData);
    if (result) {
      addNotification('配当を追加しました', 'success');
      setIsAddDividendModalOpen(false);
      loadSnapshots();
    } else {
      addNotification('配当の追加に失敗しました', 'error');
    }
  };

  const handleEditDividend = (dividend) => {
    setSelectedDividend(dividend);
    setIsEditDividendModalOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleSaveDividend = (dividendId, updates) => {
    const success = updateDividend(dividendId, updates);
    if (success) {
      addNotification('配当を更新しました', 'success');
      setIsEditDividendModalOpen(false);
      setSelectedDividend(null);
      loadSnapshots();
    } else {
      addNotification('配当の更新に失敗しました', 'error');
    }
  };

  const handleDeleteDividend = (dividendId) => {
    const success = deleteDividend(dividendId);
    if (success) {
      addNotification('配当を削除しました', 'success');
      loadSnapshots();
    } else {
      addNotification('配当の削除に失敗しました', 'error');
    }
  };

  // ========== Price & History Updates ==========
  const handleUpdatePrices = async () => {
    setIsLoading(true);
    try {
      const result = await updateAllPrices(portfolio);
      setPortfolio(result.portfolio);
      setExchangeRate(result.exchangeRate);
      savePortfolio(result.portfolio);

      // 価格更新後、今日のスナップショットを生成
      const snapshotResult = await generateTodaySnapshot(result.portfolio, result.exchangeRate);

      let notificationMessage = '';
      let notificationType = 'success';

      if (result.errors) {
        notificationMessage = `価格更新完了\n\nエラー:\n${result.errors.join('\n')}`;
        notificationType = 'warning';
      } else {
        notificationMessage = 'すべての価格を更新しました！';
      }

      // スナップショット作成結果を通知に追加
      if (snapshotResult && !snapshotResult.success) {
        notificationMessage += '\n\n' + snapshotResult.message;
        if (notificationType === 'success') {
          notificationType = 'info';
        }
      }

      addNotification(notificationMessage, notificationType);

      await loadSnapshots();
    } catch (error) {
      console.error('価格更新エラー:', error);
      addNotification('価格更新中にエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRebuildHistoryAndSnapshots = async () => {
    if (!window.confirm('全履歴データとスナップショットを再構築しますか？\n（数分かかる場合があります）')) {
      return;
    }

    setIsLoading(true);
    try {
      addNotification('📚 履歴データを取得中...', 'info');
      const historyResult = await rebuildAllHistory(portfolio);
      
      if (historyResult.errors) {
        addNotification(`履歴取得完了（一部エラーあり）\n\nエラー:\n${historyResult.errors.join('\n')}`, 'warning');
      } else {
        addNotification(`履歴データの取得が完了しました！\n最古の購入日: ${historyResult.oldestDate}`, 'success');
      }

      addNotification('📸 スナップショットを再生成中...', 'info');
      const snapshotResult = await regenerateDailySnapshots(portfolio);
      
      if (snapshotResult.success) {
        addNotification(`✅ 全再構築完了！\n${snapshotResult.snapshotCount}日分のデータを生成しました`, 'success');
        await loadSnapshots();
      } else {
        addNotification('スナップショット再生成に失敗しました', 'error');
      }
    } catch (error) {
      console.error('履歴再構築エラー:', error);
      addNotification('履歴再構築中にエラーが発生しました: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== Data Management ==========
  const handleClearAllData = async () => {
    if (!window.confirm(
      '⚠️ すべてのデータを削除しますか？\n\n' +
      '以下のデータが完全に削除されます：\n' +
      '• ポートフォリオデータ（保有銘柄、購入記録）\n' +
      '• 売却履歴\n' +
      '• 配当データ\n' +
      '• 価格履歴（IndexedDB）\n' +
      '• 日次スナップショット\n' +
      '• 為替レート履歴\n' +
      '• APIキャッシュ\n\n' +
      'この操作は取り消せません。'
    )) {
      return;
    }

    // 二重確認
    if (!window.confirm(
      '本当によろしいですか？\n\n' +
      'すべてのデータが完全に削除されます。\n' +
      '事前にバックアップを取得することをお勧めします。'
    )) {
      return;
    }

    try {
      setIsLoading(true);

      // IndexedDBのデータを削除
      const indexedDBSuccess = await clearAllIndexedDB();

      // localStorageのデータを削除
      localStorage.clear();

      if (indexedDBSuccess) {
        addNotification(
          '✅ すべてのデータを削除しました\n\nページをリロードします...',
          'success'
        );

        // 2秒後にリロード
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error('IndexedDBの削除に失敗しました');
      }
    } catch (error) {
      console.error('データ削除エラー:', error);
      addNotification('データ削除中にエラーが発生しました: ' + error.message, 'error');
      setIsLoading(false);
    }
  };

  // ========== Backup & Import ==========
  const handleExportBackup = () => {
    try {
      const data = exportData();
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      addNotification('バックアップをダウンロードしました', 'success');
    } catch (error) {
      console.error('バックアップエラー:', error);
      addNotification('バックアップの作成に失敗しました', 'error');
    }
  };

  const handleImportBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (!data.portfolio || !Array.isArray(data.portfolio)) {
          throw new Error('無効なバックアップファイルです');
        }

        if (!window.confirm(
          `バックアップをインポートしますか？\n\n` +
          `銘柄数: ${data.portfolio.length}\n` +
          `売却履歴: ${data.sellHistory?.length || 0}件\n` +
          `配当データ: ${data.dividends?.length || 0}件\n` +
          `バックアップ日時: ${new Date(data.exportDate).toLocaleString('ja-JP')}\n\n` +
          `現在のデータは上書きされます。`
        )) {
          return;
        }

        const success = importData(data);
        
        if (success) {
          const loadedPortfolio = loadPortfolio();
          setPortfolio(loadedPortfolio);
          loadSnapshots();
          addNotification('バックアップをインポートしました', 'success');
        } else {
          throw new Error('インポートに失敗しました');
        }
      } catch (error) {
        console.error('インポートエラー:', error);
        addNotification('バックアップの読み込みに失敗しました: ' + error.message, 'error');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // ========== Modal Handlers ==========
  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setIsEditConsolidatedModalOpen(true);
  };

  const openSellModal = (asset) => {
    setSelectedAsset(asset);
    setIsSellModalOpen(true);
  };

  const openDetailModal = (asset) => {
    setSelectedAsset(asset);
    setIsDetailModalOpen(true);
  };

  const handleEditPurchase = (purchaseRecord) => {
    const originalAsset = portfolio.find(a => a.id === purchaseRecord.id);
    
    if (originalAsset) {
      setSelectedAsset(originalAsset);
      setIsEditPurchaseModalOpen(true);
      setIsDetailModalOpen(false);
    } else {
      addNotification('購入記録が見つかりませんでした', 'error');
    }
  };

  const handleEditSellRecord = (sellRecord) => {
    setSelectedSellRecord(sellRecord);
    setIsEditSellRecordModalOpen(true);
    setIsDetailModalOpen(false);
  };

  // ========== Tag Management ==========
  const handleToggleTag = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleSelectAllTags = () => {
    if (selectedTags.length === allTags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags([...allTags]);
    }
  };

  // ========== Computed Data ==========
  const activePortfolio = getConsolidatedPortfolio(portfolio);
  const filteredPortfolio = excludeCrypto 
    ? activePortfolio.filter(asset => asset.type !== 'crypto')
    : activePortfolio;
  const tagAnalysis = getTagAnalysis(activePortfolio, exchangeRate);
  const allTags = getAllUniqueTags(portfolio);

  // ========== Render ==========
  return (
    <div className="App">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportBackup}
        style={{ display: 'none' }}
      />

      {/* Header */}
      <header>
        <h1>📊 ポートフォリオ管理システム</h1>
        <div className="header-buttons">
          <button onClick={() => setIsAddModalOpen(true)}>➕ 資産追加</button>
          <button onClick={() => setIsAddDividendModalOpen(true)}>💰 配当追加</button>
          <button onClick={handleUpdatePrices} disabled={isLoading}>
            {isLoading ? '⏳ 更新中...' : '🔄 価格更新'}
          </button>
          <button onClick={handleRebuildHistoryAndSnapshots} disabled={isLoading}>
            {isLoading ? '⏳ 処理中...' : '🔄 履歴再構築'}
          </button>
          <button onClick={handleExportBackup} disabled={isLoading}>
            💾 バックアップ
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            📥 インポート
          </button>
          <button
            onClick={handleClearAllData}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            🗑️ 全データ削除
          </button>
        </div>
      </header>

      <main>
        {/* Portfolio Table */}
        <section className="portfolio-section">
          <h2>保有銘柄一覧</h2>
          <PortfolioSummaryAndTable
            portfolio={activePortfolio}
            exchangeRate={exchangeRate}
            snapshotData={snapshotData}
            onEdit={openEditModal}
            onDelete={handleDeleteAsset}
            onSell={openSellModal}
            onDetail={openDetailModal}
          />
        </section>

        {/* Performance Chart */}
        <section className="performance-section">
          <h2>📈 パフォーマンス推移</h2>
          <PerformanceChart 
            data={snapshotData} 
            portfolio={activePortfolio}
            rawPortfolio={portfolio}
            exchangeRate={exchangeRate}
            sellHistory={sellHistory}
          />
        </section>

        {/* Asset Allocation */}
        <section className="allocation-section">
          <div className="tabs">
            <button 
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              全体配分
            </button>
            <button 
              className={activeTab === 'allocation' ? 'active' : ''}
              onClick={() => setActiveTab('allocation')}
            >
              資産種別
            </button>
            <button 
              className={activeTab === 'tags' ? 'active' : ''}
              onClick={() => setActiveTab('tags')}
            >
              タグ別分析
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'overview' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>🍰 全体資産配分</h2>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    background: excludeCrypto ? '#e0e7ff' : '#f3f4f6',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="checkbox"
                      checked={excludeCrypto}
                      onChange={(e) => setExcludeCrypto(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    仮想通貨を除外
                  </label>
                </div>
                <AssetAllocationChart portfolio={filteredPortfolio} exchangeRate={exchangeRate} />
              </div>
            )}

            {activeTab === 'allocation' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>📊 資産種別配分</h2>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    background: excludeCrypto ? '#e0e7ff' : '#f3f4f6',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="checkbox"
                      checked={excludeCrypto}
                      onChange={(e) => setExcludeCrypto(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    仮想通貨を除外
                  </label>
                </div>
                <AssetAllocationChart 
                  portfolio={filteredPortfolio} 
                  exchangeRate={exchangeRate}
                  groupBy="type"
                />
              </div>
            )}

            {activeTab === 'tags' && (
              <div>
                <h2>🏷️ タグ別分析</h2>
                
                {allTags.length > 0 ? (
                  <>
                    <div style={{
                      background: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '10px',
                      marginBottom: '30px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '16px'
                      }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                          分析するタグを選択
                        </h3>
                        <button
                          onClick={handleSelectAllTags}
                          style={{
                            padding: '6px 12px',
                            fontSize: '13px',
                            background: selectedTags.length === allTags.length ? '#667eea' : 'white',
                            color: selectedTags.length === allTags.length ? 'white' : '#667eea',
                            border: '2px solid #667eea',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                        >
                          {selectedTags.length === allTags.length ? '✓ すべて選択中' : 'すべて選択'}
                        </button>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        {allTags.map(tag => {
                          const isSelected = selectedTags.includes(tag);
                          const tagAssets = getAssetsByTag(activePortfolio, tag);
                          
                          return (
                            <label
                              key={tag}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                background: isSelected ? '#e0e7ff' : 'white',
                                border: `2px solid ${isSelected ? '#667eea' : '#e5e7eb'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: isSelected ? '600' : '400',
                                color: isSelected ? '#4338ca' : '#6b7280'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleTag(tag)}
                                style={{ cursor: 'pointer' }}
                              />
                              <span>{tag}</span>
                              <span style={{
                                fontSize: '12px',
                                color: isSelected ? '#818cf8' : '#9ca3af',
                                marginLeft: '4px'
                              }}>
                                ({tagAssets.length})
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      
                      {selectedTags.length > 0 && (
                        <div style={{
                          marginTop: '12px',
                          padding: '10px',
                          background: '#e0e7ff',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#4338ca'
                        }}>
                          ✓ {selectedTags.length}個のタグを選択中
                        </div>
                      )}
                    </div>

                    {selectedTags.length > 0 ? (
                      <>
                        <AssetAllocationChart
                          portfolio={activePortfolio.filter(asset => 
                            asset.tags && asset.tags.some(tag => selectedTags.includes(tag))
                          )}
                          exchangeRate={exchangeRate}
                          groupBy="tags"
                          selectedTags={selectedTags}
                        />
                        
                        <div className="tag-details" style={{marginTop: '30px'}}>
                          <h3>タグ別内訳</h3>
                          {selectedTags.map(tag => {
                            const tagAssets = getAssetsByTag(activePortfolio, tag);
                            if (tagAssets.length === 0) return null;
                            
                            return (
                              <details key={tag} style={{marginBottom: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px'}}>
                                <summary style={{cursor: 'pointer', fontWeight: 'bold'}}>
                                  🏷️ {tag} ({tagAssets.length}銘柄)
                                </summary>
                                <div style={{marginTop: '15px'}}>
                                  <AssetAllocationChart
                                    portfolio={tagAssets}
                                    exchangeRate={exchangeRate}
                                    groupBy="name"
                                  />
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: '#f8f9fa',
                        borderRadius: '10px',
                        color: '#6b7280'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏷️</div>
                        <h3 style={{ marginBottom: '8px', color: '#374151' }}>タグを選択してください</h3>
                        <p style={{ fontSize: '14px' }}>
                          上のタグ一覧から分析したいタグを選択すると、円グラフが表示されます
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                    タグが設定された銘柄がありません
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modals */}
      {isAddModalOpen && (
        <AddAssetModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddAsset}
          exchangeRate={exchangeRate}
          addNotification={addNotification}
          portfolio={portfolio}
        />
      )}

      {isAddDividendModalOpen && (
        <AddDividendModal
          onClose={() => setIsAddDividendModalOpen(false)}
          onAdd={handleAddDividend}
          portfolio={portfolio}
          addNotification={addNotification}
        />
      )}

      {isEditDividendModalOpen && selectedDividend && (
        <EditDividendModal
          dividend={selectedDividend}
          onClose={() => {
            setIsEditDividendModalOpen(false);
            setSelectedDividend(null);
          }}
          onSave={handleSaveDividend}
          addNotification={addNotification}
        />
      )}

      {isEditConsolidatedModalOpen && selectedAsset && (
        <EditConsolidatedAssetModal
          asset={selectedAsset}
          portfolio={portfolio}
          onClose={() => {
            setIsEditConsolidatedModalOpen(false);
            setSelectedAsset(null);
          }}
          onSave={handleEditConsolidatedAsset}
          addNotification={addNotification}
        />
      )}

      {isEditPurchaseModalOpen && selectedAsset && (
        <EditPurchaseRecordModal
          asset={selectedAsset}
          onClose={() => {
            setIsEditPurchaseModalOpen(false);
            setSelectedAsset(null);
          }}
          onSave={handleEditPurchaseRecord}
          addNotification={addNotification}
        />
      )}

      {isEditSellRecordModalOpen && selectedSellRecord && (
        <EditSellRecordModal
          sellRecord={selectedSellRecord}
          currency={selectedSellRecord.currency}
          onClose={() => {
            setIsEditSellRecordModalOpen(false);
            setSelectedSellRecord(null);
          }}
          onSave={handleSaveSellRecord}
          addNotification={addNotification}
        />
      )}

      {isSellModalOpen && selectedAsset && (
        <SellAssetModal
          asset={selectedAsset}
          onClose={() => {
            setIsSellModalOpen(false);
            setSelectedAsset(null);
          }}
          onSell={handleSellAsset}
          exchangeRate={exchangeRate}
          addNotification={addNotification}
        />
      )}

      {isDetailModalOpen && selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedAsset(null);
          }}
          exchangeRate={exchangeRate}
          onEditPurchase={handleEditPurchase}
          onDeletePurchase={handleDeletePurchase}
          onEditSellRecord={handleEditSellRecord}
          onDeleteSellRecord={handleDeleteSellRecord}
          onEditDividend={handleEditDividend}
          onDeleteDividend={handleDeleteDividend}
        />
      )}
    </div>
  );
}

export default App;