// src/hooks/usePortfolioHandlers.js
import { savePortfolio, getSellHistory, saveSellHistory } from '../utils/storage';

export const usePortfolioHandlers = (portfolio, setPortfolio, addNotification, loadSnapshots) => {
  // 資産追加
  const handleAddAsset = (newAsset) => {
    const updatedPortfolio = [...portfolio, newAsset];
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
    addNotification('資産を追加しました', 'success');
  };

  // 統合銘柄の編集（全購入記録に適用）
  const handleEditConsolidatedAsset = (editData) => {
    const { assetIds, updates } = editData;
    
    const updatedPortfolio = portfolio.map(asset => {
      if (assetIds.includes(asset.id)) {
        return {
          ...asset,
          name: updates.name,
          symbol: updates.symbol,
          isinCd: updates.isinCd,
          associFundCd: updates.associFundCd,
          currentPrice: updates.currentPrice,
          tags: updates.tags
        };
      }
      return asset;
    });
    
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
    addNotification('銘柄情報を更新しました', 'success');
  };

  // 購入記録の編集
  const handleEditPurchaseRecord = (editedAsset) => {
    const updatedPortfolio = portfolio.map(asset => 
      asset.id === editedAsset.id ? editedAsset : asset
    );
    setPortfolio(updatedPortfolio);
    savePortfolio(updatedPortfolio);
    addNotification('購入記録を更新しました', 'success');
  };

  // 個別購入記録の削除
  const handleDeletePurchase = (purchaseId) => {
    if (window.confirm('この購入記録を削除しますか？\n\n注意: この操作は取り消せません。')) {
      const updatedPortfolio = portfolio.filter(asset => asset.id !== purchaseId);
      setPortfolio(updatedPortfolio);
      savePortfolio(updatedPortfolio);
      addNotification('購入記録を削除しました', 'success');
    }
  };

  // 売却記録の削除
  const handleDeleteSellRecord = (sellRecordId) => {
    const allSellHistory = getSellHistory();
    const updatedHistory = allSellHistory.filter(record => record.id !== sellRecordId);
    saveSellHistory(updatedHistory);
    setPortfolio([...portfolio]);
    loadSnapshots();
    addNotification('売却記録を削除しました', 'success');
  };

  // 資産削除
  const handleDeleteAsset = (assetId, getConsolidatedPortfolio) => {
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

  // 資産売却
  const handleSellAsset = () => {
    setPortfolio([...portfolio]);
    loadSnapshots();
    addNotification('資産を売却しました', 'success');
  };

  // 売却記録の保存
  const handleSaveSellRecord = () => {
    setPortfolio([...portfolio]);
    loadSnapshots();
  };

  return {
    handleAddAsset,
    handleEditConsolidatedAsset,
    handleEditPurchaseRecord,
    handleDeletePurchase,
    handleDeleteSellRecord,
    handleDeleteAsset,
    handleSellAsset,
    handleSaveSellRecord
  };
};