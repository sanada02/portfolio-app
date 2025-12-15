// src/utils/backup.js
import db from './database';

// ===========================
// バックアップ（エクスポート）
// ===========================

export const exportBackup = async () => {
  try {
    // localStorageからポートフォリオを取得
    const portfolio = localStorage.getItem('portfolio');
    
    // IndexedDBから全データを取得
    const priceHistory = await db.priceHistory.toArray();
    const dailySnapshots = await db.dailySnapshots.toArray();
    const exchangeRates = await db.exchangeRates.toArray();
    
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      portfolio: portfolio ? JSON.parse(portfolio) : [],
      priceHistory: priceHistory,
      dailySnapshots: dailySnapshots,
      exchangeRates: exchangeRates
    };
    
    // JSON文字列に変換
    const jsonString = JSON.stringify(backupData, null, 2);
    
    // Blobを作成
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // ダウンロード
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true, recordCount: priceHistory.length };
  } catch (error) {
    console.error('バックアップエラー:', error);
    throw error;
  }
};

// ===========================
// リストア（インポート）
// ===========================

export const importBackup = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        
        // バージョンチェック
        if (!backupData.version) {
          throw new Error('無効なバックアップファイルです');
        }
        
        // ポートフォリオを復元
        if (backupData.portfolio) {
          localStorage.setItem('portfolio', JSON.stringify(backupData.portfolio));
        }
        
        // IndexedDBを復元
        if (backupData.priceHistory && backupData.priceHistory.length > 0) {
          await db.priceHistory.bulkPut(backupData.priceHistory);
        }
        
        if (backupData.dailySnapshots && backupData.dailySnapshots.length > 0) {
          await db.dailySnapshots.bulkPut(backupData.dailySnapshots);
        }
        
        if (backupData.exchangeRates && backupData.exchangeRates.length > 0) {
          await db.exchangeRates.bulkPut(backupData.exchangeRates);
        }
        
        resolve({
          success: true,
          portfolioCount: backupData.portfolio?.length || 0,
          priceHistoryCount: backupData.priceHistory?.length || 0,
          exportDate: backupData.exportDate
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file);
  });
};

// ===========================
// データのクリア（リセット）
// ===========================

export const clearAllData = async () => {
  try {
    // localStorageをクリア
    localStorage.removeItem('portfolio');
    
    // IndexedDBをクリア
    await db.priceHistory.clear();
    await db.dailySnapshots.clear();
    await db.exchangeRates.clear();
    await db.apiCache.clear();
    
    return { success: true };
  } catch (error) {
    console.error('データクリアエラー:', error);
    throw error;
  }
};