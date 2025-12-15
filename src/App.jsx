import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Plus, History } from 'lucide-react';
import { updateAllPrices } from './utils/priceAPI';
import { getDailySnapshots } from './utils/database';
import { getPortfolio, savePortfolio, getSellHistory, saveSellHistory, addSellRecord, updateAssetTags } from './utils/storage';
import { calculateTotalValue, calculateTotalValueUSD, calculateTotalProfitLoss } from './utils/calculations';
import Notification from './components/Notification';
import SummaryCards from './components/SummaryCards';
import TrendChart from './components/TrendChart';
import AssetChart from './components/AssetChart';
import TagComparisonChart from './components/TagComparisonChart';
import PortfolioTable from './components/PortfolioTable';
import AddAssetModal from './components/AddAssetModal';
import EditAssetModal from './components/EditAssetModal';
import SellAssetModal from './components/SellAssetModal';
import SellHistoryModal from './components/SellHistoryModal';
import SettingsModal from './components/SettingsModal';
import './App.css';

function App() {
  const [portfolio, setPortfolio] = useState([]);
  const [sellHistory, setSellHistory] = useState([]);
  const [dailyHistory, setDailyHistory] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(150);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isSellHistoryOpen, setIsSellHistoryOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [sellingAsset, setSellingAsset] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedPortfolio = getPortfolio();
      setPortfolio(savedPortfolio);
      
      const savedSellHistory = getSellHistory();
      setSellHistory(savedSellHistory);
      
      await loadDailyHistory();
    } catch (error) {
      console.error('初期化エラー:', error);
    }
  };

  const loadDailyHistory = async () => {
    try {
      const history = await getDailySnapshots(30);
      setDailyHistory(history);
    } catch (error) {
      console.error('日次履歴の読み込みエラー:', error);
    }
  };

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleUpdatePrices = async () => {
    setIsUpdating(true);
    try {
      if (portfolio.length === 0) {
        addNotification('更新する銘柄がありません', 'warning');
        return;
      }
      addNotification('価格更新を開始しています...', 'info');
      const result = await updateAllPrices(portfolio);
      setPortfolio(result.portfolio);
      setExchangeRate(result.exchangeRate);
      savePortfolio(result.portfolio);
      setLastUpdateTime(new Date());
      await loadDailyHistory();
      
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => addNotification(error, 'error'));
        addNotification(`価格更新完了（${result.errors.length}件のエラー）`, 'warning');
      } else {
        addNotification('価格更新が完了しました！', 'success');
      }
    } catch (error) {
      console.error('価格更新エラー:', error);
      addNotification('価格の更新に失敗しました: ' + error.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddAsset = (newAsset) => {
    const updatedPortfolio = [...portfolio, newAsset];
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
    addNotification(`${newAsset.name} を追加しました`, 'success');
  };

  const handleEditAsset = (asset) => {
    setEditingAsset({...asset});
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedAsset) => {
    const identifier = updatedAsset.symbol || updatedAsset.isinCd;
    let updatedPortfolio = updateAssetTags(portfolio, identifier, updatedAsset.tags);
    
    updatedPortfolio = updatedPortfolio.map(asset => 
      asset.id === updatedAsset.id ? updatedAsset : asset
    );
    
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
    setIsEditModalOpen(false);
    setEditingAsset(null);
    addNotification('銘柄を更新しました（同一銘柄のタグも更新）', 'success');
  };

  const handleDeleteAsset = (id) => {
    if (window.confirm('この銘柄を削除しますか？')) {
      const updatedPortfolio = portfolio.filter(asset => asset.id !== id);
      setPortfolio(updatedPortfolio);
      savePortfolio(updatedPortfolio);
      addNotification('銘柄を削除しました', 'success');
    }
  };

  const handleSellAsset = (asset) => {
    setSellingAsset(asset);
    setIsSellModalOpen(true);
  };

  const handleCompleteSell = (sellRecord) => {
    const remainingQuantity = sellingAsset.quantity - sellRecord.quantity;
    
    let updatedPortfolio;
    if (remainingQuantity > 0) {
      updatedPortfolio = portfolio.map(asset =>
        asset.id === sellingAsset.id 
          ? { ...asset, quantity: remainingQuantity }
          : asset
      );
    } else {
      updatedPortfolio = portfolio.filter(asset => asset.id !== sellingAsset.id);
    }
    
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
    
    addSellRecord(sellRecord);
    setSellHistory([...sellHistory, sellRecord]);
    
    setIsSellModalOpen(false);
    setSellingAsset(null);
    
    const profitText = sellRecord.profitJPY >= 0 
      ? `+${sellRecord.profitJPY.toLocaleString()}` 
      : sellRecord.profitJPY.toLocaleString();
    addNotification(
      `${sellRecord.name} を売却しました（損益: ¥${profitText}）`, 
      sellRecord.profitJPY >= 0 ? 'success' : 'warning'
    );
  };

  const handleDeleteSellRecord = (id) => {
    const updatedHistory = sellHistory.filter(record => record.id !== id);
    setSellHistory(updatedHistory);
    saveSellHistory(updatedHistory);
    addNotification('売却記録を削除しました', 'success');
  };

  const totalValueJPY = calculateTotalValue(portfolio, sellHistory, exchangeRate);
  const totalValueUSD = calculateTotalValueUSD(portfolio, sellHistory);
  const totalProfitLoss = calculateTotalProfitLoss(portfolio, sellHistory, exchangeRate);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>💼 ポートフォリオ管理</h1>
          <div className="header-actions">
            {lastUpdateTime && (
              <span className="last-update">
                最終更新: {lastUpdateTime.toLocaleTimeString('ja-JP')}
              </span>
            )}
            <button className="btn-settings" onClick={() => setIsSellHistoryOpen(true)} title="売却履歴">
              <History size={20} />
            </button>
            <button className="btn-settings" onClick={() => setIsSettingsOpen(true)} title="設定">
              <Settings size={20} />
            </button>
            <button className="btn-refresh" onClick={handleUpdatePrices} disabled={isUpdating}>
              <RefreshCw size={20} className={isUpdating ? 'spinning' : ''} />
              {isUpdating ? '更新中...' : '価格更新'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <SummaryCards
          totalValueJPY={totalValueJPY}
          totalValueUSD={totalValueUSD}
          totalProfitLoss={totalProfitLoss}
          exchangeRate={exchangeRate}
          portfolioCount={portfolio.length}
          historyDays={dailyHistory.length}
        />

        <TrendChart dailyHistory={dailyHistory} />

        <AssetChart portfolio={portfolio} sellHistory={sellHistory} exchangeRate={exchangeRate} />

        <div className="section">
          <div className="section-header">
            <h2>保有銘柄</h2>
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={20} />銘柄を追加
            </button>
          </div>
          <PortfolioTable
            portfolio={portfolio}
            sellHistory={sellHistory}
            exchangeRate={exchangeRate}
            onEdit={handleEditAsset}
            onDelete={handleDeleteAsset}
            onSell={handleSellAsset}
          />
        </div>

        <TagComparisonChart portfolio={portfolio} sellHistory={sellHistory} exchangeRate={exchangeRate} />
      </main>

      {isModalOpen && (
        <AddAssetModal
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddAsset}
          addNotification={addNotification}
        />
      )}

      {isEditModalOpen && editingAsset && (
        <EditAssetModal
          asset={editingAsset}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEdit}
          addNotification={addNotification}
        />
      )}

      {isSellModalOpen && sellingAsset && (
        <SellAssetModal
          asset={sellingAsset}
          sellHistory={sellHistory}
          exchangeRate={exchangeRate}
          onClose={() => setIsSellModalOpen(false)}
          onSell={handleCompleteSell}
          addNotification={addNotification}
        />
      )}

      {isSellHistoryOpen && (
        <SellHistoryModal
          sellHistory={sellHistory}
          onClose={() => setIsSellHistoryOpen(false)}
          onDelete={handleDeleteSellRecord}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          portfolio={portfolio}
          dailyHistory={dailyHistory}
          isUpdating={isUpdating}
          setIsUpdating={setIsUpdating}
          loadDailyHistory={loadDailyHistory}
          addNotification={addNotification}
        />
      )}

      <Notification notifications={notifications} onRemove={removeNotification} />
    </div>
  );
}

export default App;