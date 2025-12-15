// src/App.jsx (完全修正版 - 全幅レイアウト + タブ機能)
import React, { useState, useEffect } from 'react';
import { loadPortfolio, savePortfolio, getSellHistory } from './utils/storage';
import { updateAllPrices, rebuildAllHistory, regenerateDailySnapshots } from './utils/priceAPI';
import { getDailySnapshots } from './utils/database';
import AddAssetModal from './components/AddAssetModal';
import EditAssetModal from './components/EditAssetModal';
import SellAssetModal from './components/SellAssetModal';
import PortfolioTable from './components/PortfolioTable';
import PerformanceChart from './components/PerformanceChart';
import AssetAllocationChart from './components/AssetAllocationChart';
import './App.css';

function App() {
  const [portfolio, setPortfolio] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(150);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshotData, setSnapshotData] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, allocation, tags

  useEffect(() => {
    const loadedPortfolio = loadPortfolio();
    setPortfolio(loadedPortfolio);
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    const snapshots = await getDailySnapshots();
    setSnapshotData(snapshots);
  };

  const handleAddAsset = (newAsset) => {
    const updatedPortfolio = [...portfolio, newAsset];
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
  };

  const handleEditAsset = (editedAsset) => {
    const updatedPortfolio = portfolio.map(asset => 
      asset.id === editedAsset.id ? editedAsset : asset
    );
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
  };

  const handleDeleteAsset = (assetId) => {
    if (window.confirm('本当にこの資産を削除しますか？')) {
      const updatedPortfolio = portfolio.filter(asset => asset.id !== assetId);
      setPortfolio(updatedPortfolio);
      savePortfolio(updatedPortfolio);
    }
  };

  const handleSellAsset = (soldAsset) => {
    const updatedPortfolio = portfolio.map(asset => {
      if (asset.id === soldAsset.id) {
        return {
          ...asset,
          quantity: asset.quantity - soldAsset.soldQuantity
        };
      }
      return asset;
    }).filter(asset => asset.quantity > 0);
    
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
    loadSnapshots();
  };

  const handleUpdatePrices = async () => {
    setIsLoading(true);
    try {
      const result = await updateAllPrices(portfolio);
      setPortfolio(result.portfolio);
      setExchangeRate(result.exchangeRate);
      savePortfolio(result.portfolio);
      
      if (result.errors) {
        alert(`価格更新完了\n\nエラー:\n${result.errors.join('\n')}`);
      } else {
        alert('すべての価格を更新しました！');
      }
      
      await loadSnapshots();
    } catch (error) {
      console.error('価格更新エラー:', error);
      alert('価格更新中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRebuildHistory = async () => {
    if (!window.confirm('全履歴データを再構築しますか？（数分かかる場合があります）')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await rebuildAllHistory(portfolio);
      
      if (result.errors) {
        alert(`履歴再構築完了\n\nエラー:\n${result.errors.join('\n')}`);
      } else {
        alert(`履歴データの取得が完了しました！\n最古の購入日: ${result.oldestDate}`);
      }
    } catch (error) {
      console.error('履歴再構築エラー:', error);
      alert('履歴再構築中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateSnapshots = async () => {
    if (!window.confirm('日次スナップショットを再生成しますか？（数分かかる場合があります）')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await regenerateDailySnapshots(portfolio);
      
      if (result.success) {
        alert(`スナップショット再生成完了！\n${result.snapshotCount}日分のデータを生成しました`);
        await loadSnapshots();
      } else {
        alert(result.message || 'スナップショット再生成に失敗しました');
      }
    } catch (error) {
      console.error('スナップショット再生成エラー:', error);
      alert('スナップショット再生成中にエラーが発生しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setIsEditModalOpen(true);
  };

  const openSellModal = (asset) => {
    setSelectedAsset(asset);
    setIsSellModalOpen(true);
  };

  // 売却履歴を考慮した実質保有銘柄のみ計算
  const getActivePortfolio = () => {
    const sellHistory = getSellHistory();
    
    return portfolio.map(asset => {
      const soldQuantity = sellHistory
        .filter(record => record.originalAssetId === asset.id)
        .reduce((sum, record) => sum + record.quantity, 0);
      
      const activeQuantity = asset.quantity - soldQuantity;
      
      return {
        ...asset,
        activeQuantity,
        displayQuantity: asset.quantity,
        soldQuantity
      };
    }).filter(asset => asset.activeQuantity > 0);
  };

  const activePortfolio = getActivePortfolio();

  // タグ別集計
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

  // 特定タグでフィルター
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
      <header>
        <h1>📊 ポートフォリオ管理システム</h1>
        <div className="header-buttons">
          <button onClick={() => setIsAddModalOpen(true)}>➕ 資産追加</button>
          <button onClick={handleUpdatePrices} disabled={isLoading}>
            {isLoading ? '⏳ 更新中...' : '🔄 価格更新'}
          </button>
          <button onClick={handleRebuildHistory} disabled={isLoading}>
            📚 履歴再構築
          </button>
          <button onClick={handleRegenerateSnapshots} disabled={isLoading}>
            📸 スナップショット再生成
          </button>
        </div>
      </header>

      <main>
        {/* 全幅：ポートフォリオテーブル */}
        <section className="portfolio-section">
          <h2>保有銘柄一覧</h2>
          <PortfolioTable
            portfolio={activePortfolio}
            exchangeRate={exchangeRate}
            onEdit={openEditModal}
            onDelete={handleDeleteAsset}
            onSell={openSellModal}
          />
        </section>

        {/* 全幅：パフォーマンスチャート */}
        <section className="performance-section">
          <h2>📈 パフォーマンス推移</h2>
          <PerformanceChart data={snapshotData} />
        </section>

        {/* 全幅：資産配分（タブ付き） */}
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

                {/* タグごとの詳細分析 */}
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
        />
      )}
    </div>
  );
}

export default App;