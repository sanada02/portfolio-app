// src/App.jsx (購入記録管理機能追加版)
import React, { useState, useEffect, useRef } from 'react';
import { loadPortfolio, savePortfolio, getSellHistory, saveSellHistory, exportData, importData } from './utils/storage';
import { updateAllPrices, rebuildAllHistory, regenerateDailySnapshots } from './utils/priceAPI';
import { getDailySnapshots } from './utils/database';
import AddAssetModal from './components/AddAssetModal';
import EditAssetModal from './components/EditAssetModal';
import SellAssetModal from './components/SellAssetModal';
import AssetDetailModal from './components/AssetDetailModal';
import PortfolioTable from './components/PortfolioTable';
import PerformanceChart from './components/PerformanceChart';
import AssetAllocationChart from './components/AssetAllocationChart';
import Toast from './components/Toast';
import './App.css';

function App() {
  const [portfolio, setPortfolio] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(150);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshotData, setSnapshotData] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [toasts, setToasts] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadedPortfolio = loadPortfolio();
    setPortfolio(loadedPortfolio);
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    const snapshots = await getDailySnapshots();
    setSnapshotData(snapshots);
  };

  // トースト通知を追加
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  // トーストを削除
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleAddAsset = (newAsset) => {
    const updatedPortfolio = [...portfolio, newAsset];
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
    addNotification('資産を追加しました', 'success');
  };

  const handleEditAsset = (editedAsset) => {
    const updatedPortfolio = portfolio.map(asset => 
      asset.id === editedAsset.id ? editedAsset : asset
    );
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
    addNotification('資産を更新しました', 'success');
  };

  // 🔥 個別購入記録の削除
  const handleDeletePurchase = (purchaseId) => {
    if (window.confirm('この購入記録を削除しますか？\n\n注意: この操作は取り消せません。')) {
      const updatedPortfolio = portfolio.filter(asset => asset.id !== purchaseId);
      setPortfolio(updatedPortfolio);
      savePortfolio(updatedPortfolio);
      addNotification('購入記録を削除しました', 'success');
    }
  };

  const handleDeleteAsset = (assetId) => {
    // 統合銘柄の場合はassetIdsを持っている
    const asset = getConsolidatedPortfolio().find(a => {
      if (a.assetIds) {
        return a.assetIds.includes(assetId) || a.id === assetId;
      }
      return a.id === assetId;
    });

    if (!asset) return;

    const assetIdsToDelete = asset.assetIds || [assetId];
    
    if (window.confirm(
      asset.assetIds 
        ? `「${asset.name}」の全ての購入記録（${asset.assetIds.length}件）を削除しますか？`
        : `本当にこの資産を削除しますか？`
    )) {
      const updatedPortfolio = portfolio.filter(a => !assetIdsToDelete.includes(a.id));
      setPortfolio(updatedPortfolio);
      savePortfolio(updatedPortfolio);
      addNotification('資産を削除しました', 'success');
    }
  };

  const handleSellAsset = (soldAsset) => {
    // portfolioのquantityは変更せず、売却履歴のみで管理
    setPortfolio([...portfolio]);
    loadSnapshots();
    addNotification('資産を売却しました', 'success');
  };

  const handleUpdatePrices = async () => {
    setIsLoading(true);
    try {
      const result = await updateAllPrices(portfolio);
      setPortfolio(result.portfolio);
      setExchangeRate(result.exchangeRate);
      savePortfolio(result.portfolio);
      
      if (result.errors) {
        addNotification(`価格更新完了\n\nエラー:\n${result.errors.join('\n')}`, 'warning');
      } else {
        addNotification('すべての価格を更新しました！', 'success');
      }
      
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

  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setIsEditModalOpen(true);
  };

  const openSellModal = (asset) => {
    setSelectedAsset(asset);
    setIsSellModalOpen(true);
  };

  const openDetailModal = (asset) => {
    setSelectedAsset(asset);
    setIsDetailModalOpen(true);
  };

  // 🔥 個別購入記録の編集
  const handleEditPurchase = (purchaseRecord) => {
    console.log('Edit purchase:', purchaseRecord); // デバッグ用
    
    // 元のポートフォリオから該当のassetを見つける
    const originalAsset = portfolio.find(a => a.id === purchaseRecord.id);
    
    console.log('Found asset:', originalAsset); // デバッグ用
    
    if (originalAsset) {
      setSelectedAsset(originalAsset);
      setIsEditModalOpen(true);
      setIsDetailModalOpen(false); // 詳細モーダルを閉じる
    } else {
      addNotification('購入記録が見つかりませんでした', 'error');
    }
  };

  const getConsolidatedPortfolio = () => {
    const sellHistory = getSellHistory();
    const consolidated = {};

    portfolio.forEach(asset => {
      const key = asset.name;

      if (consolidated[key]) {
        const existing = consolidated[key];
        existing.originalQuantity += asset.quantity;
        
        const totalCost = (existing.purchasePrice * existing.quantity) + (asset.purchasePrice * asset.quantity);
        const totalQuantity = existing.quantity + asset.quantity;
        existing.purchasePrice = totalCost / totalQuantity;
        existing.quantity = totalQuantity;
        
        if (new Date(asset.purchaseDate) < new Date(existing.purchaseDate)) {
          existing.purchaseDate = asset.purchaseDate;
        }
        
        existing.assetIds.push(asset.id);
        
        // 購入履歴を保存
        existing.purchaseRecords.push({
          id: asset.id,
          purchaseDate: asset.purchaseDate,
          quantity: asset.quantity,
          purchasePrice: asset.purchasePrice
        });
        
        if (asset.tags) {
          existing.tags = [...new Set([...(existing.tags || []), ...asset.tags])];
        }
        
        if (asset.currentPrice) {
          existing.currentPrice = asset.currentPrice;
        }
      } else {
        consolidated[key] = {
          ...asset,
          assetIds: [asset.id],
          originalQuantity: asset.quantity,
          isConsolidated: true,
          purchaseRecords: [{
            id: asset.id,
            purchaseDate: asset.purchaseDate,
            quantity: asset.quantity,
            purchasePrice: asset.purchasePrice
          }]
        };
      }
    });

    return Object.values(consolidated).map(asset => {
      const soldQuantity = asset.assetIds.reduce((sum, id) => {
        const sold = sellHistory
          .filter(record => record.originalAssetId === id)
          .reduce((total, record) => total + record.quantity, 0);
        return sum + sold;
      }, 0);

      const activeQuantity = asset.quantity - soldQuantity;

      // 購入履歴を購入日順にソート
      if (asset.purchaseRecords) {
        asset.purchaseRecords.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
      }

      return {
        ...asset,
        activeQuantity,
        displayQuantity: asset.quantity,
        soldQuantity
      };
    }).filter(asset => asset.activeQuantity > 0);
  };

  const activePortfolio = getConsolidatedPortfolio();

  const getTagAnalysis = () => {
    const tagTotals = {};
    
    activePortfolio.forEach(asset => {
      if (!asset.tags || asset.tags.length === 0) {
        tagTotals['タグなし'] = (tagTotals['タグなし'] || 0) + (asset.currentPrice || asset.purchasePrice) * asset.activeQuantity;
      } else {
        asset.tags.forEach(tag => {
          const value = asset.currency === 'USD'
            ? (asset.currentPrice || asset.purchasePrice) * asset.activeQuantity * exchangeRate
            : (asset.currentPrice || asset.purchasePrice) * asset.activeQuantity;
          
          tagTotals[tag] = (tagTotals[tag] || 0) + value;
        });
      }
    });
    
    return Object.entries(tagTotals)
      .map(([tag, value]) => ({ tag, value }))
      .sort((a, b) => b.value - a.value);
  };

  const getAssetsByTag = (selectedTag) => {
    if (!selectedTag) return [];
    
    return activePortfolio.filter(asset => 
      asset.tags && asset.tags.includes(selectedTag)
    );
  };

  const tagAnalysis = getTagAnalysis();
  const allTags = [...new Set(portfolio.flatMap(a => a.tags || []))];

  return (
    <div className="App">
      {/* トースト通知コンテナ */}
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

      {/* 非表示のファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportBackup}
        style={{ display: 'none' }}
      />

      <header>
        <h1>📊 ポートフォリオ管理システム</h1>
        <div className="header-buttons">
          <button onClick={() => setIsAddModalOpen(true)}>➕ 資産追加</button>
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
        </div>
      </header>

      <main>
        <section className="portfolio-section">
          <h2>保有銘柄一覧</h2>
          <PortfolioTable
            portfolio={activePortfolio}
            exchangeRate={exchangeRate}
            onEdit={openEditModal}
            onDelete={handleDeleteAsset}
            onSell={openSellModal}
            onDetail={openDetailModal}
          />
        </section>

        <section className="performance-section">
          <h2>📈 パフォーマンス推移</h2>
          <PerformanceChart data={snapshotData} />
        </section>

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
                <h2>🍰 全体資産配分</h2>
                <AssetAllocationChart portfolio={activePortfolio} exchangeRate={exchangeRate} />
              </div>
            )}

            {activeTab === 'allocation' && (
              <div>
                <h2>📊 資産種別配分</h2>
                <AssetAllocationChart 
                  portfolio={activePortfolio} 
                  exchangeRate={exchangeRate}
                  groupBy="type"
                />
              </div>
            )}

            {activeTab === 'tags' && (
              <div>
                <h2>🏷️ タグ別分析</h2>
                {tagAnalysis.length > 0 ? (
                  <AssetAllocationChart
                    portfolio={activePortfolio}
                    exchangeRate={exchangeRate}
                    groupBy="tags"
                  />
                ) : (
                  <p style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                    タグが設定された銘柄がありません
                  </p>
                )}

                {allTags.length > 0 && (
                  <div className="tag-details" style={{marginTop: '30px'}}>
                    <h3>タグ内訳</h3>
                    {allTags.map(tag => {
                      const tagAssets = getAssetsByTag(tag);
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
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {isAddModalOpen && (
        <AddAssetModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddAsset}
          exchangeRate={exchangeRate}
          addNotification={addNotification}
        />
      )}

      {isEditModalOpen && selectedAsset && (
        <EditAssetModal
          asset={selectedAsset}
          portfolio={portfolio}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAsset(null);
          }}
          onSave={handleEditAsset}
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
        />
      )}
    </div>
  );
}

export default App;