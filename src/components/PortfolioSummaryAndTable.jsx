// src/components/PortfolioSummaryAndTable.jsx
import React, { useMemo } from 'react';
import PortfolioTable from './PortfolioTable';

const PortfolioSummaryAndTable = ({ portfolio, exchangeRate, onEdit, onDelete, onSell, onDetail, snapshotData }) => {
  // 前日比を計算（リアルタイム価格 vs 最新スナップショット、またはスナップショット間の差）
  const previousDayComparison = useMemo(() => {
    if (!portfolio || portfolio.length === 0) {
      return null;
    }

    // リアルタイム価格を持つ銘柄があるかチェック
    const hasRealtimePrice = portfolio.some(asset => asset.currentPrice && asset.currentPrice !== asset.purchasePrice);

    // リアルタイム価格がある場合は、現在の評価額とスナップショットの最新を比較
    if (hasRealtimePrice && snapshotData && snapshotData.length >= 3) {
      const latestSnapshot = snapshotData[snapshotData.length - 1];
      const previousSnapshot = snapshotData[snapshotData.length - 2];
      const twoDaysAgoSnapshot = snapshotData[snapshotData.length - 3];

      // 現在の評価額を計算
      let currentTotalValueJPY = 0;
      const currentAssetValues = {};

      for (const asset of portfolio) {
        const currentPrice = asset.currentPrice || asset.purchasePrice;
        const value = currentPrice * asset.activeQuantity;
        const valueJPY = asset.currency === 'USD' ? value * exchangeRate : value;
        
        currentTotalValueJPY += valueJPY;

        // assetKeyを生成（priceAPI.jsと同じロジック）
        const assetKey = asset.symbol || asset.isinCd || asset.id;
        currentAssetValues[assetKey] = valueJPY;
      }

      // 🔥 修正: 現在の評価額と最新スナップショットがほぼ同じ場合（取引時間外）は、
      // 最新と一つ前のスナップショットを比較する
      const valueDiff = Math.abs(currentTotalValueJPY - latestSnapshot.totalValueJPY);
      const isOutsideTradingHours = valueDiff < 100; // 100円未満の差は同じとみなす

      // 全体の前日比を計算
      let totalChange, totalChangePercent;
      
      if (isOutsideTradingHours) {
        // 取引時間外: スナップショット比較
        totalChange = latestSnapshot.totalValueJPY - previousSnapshot.totalValueJPY;
        totalChangePercent = previousSnapshot.totalValueJPY > 0 
          ? (totalChange / previousSnapshot.totalValueJPY) * 100 
          : 0;
      } else {
        // 取引時間中: リアルタイム比較
        totalChange = currentTotalValueJPY - latestSnapshot.totalValueJPY;
        totalChangePercent = latestSnapshot.totalValueJPY > 0 
          ? (totalChange / latestSnapshot.totalValueJPY) * 100 
          : 0;
      }

      // 🔥 修正: 銘柄別でも取引時間外判定を行う
      const assetChanges = {};
      if (latestSnapshot.assetBreakdown && previousSnapshot.assetBreakdown && twoDaysAgoSnapshot.assetBreakdown) {
        for (const asset of portfolio) {
          const assetKey = asset.symbol || asset.isinCd || asset.id;
          const currentValue = currentAssetValues[assetKey] || 0;
          
          // 最新スナップショットの値を取得
          let latestValue = 0;
          if (latestSnapshot.assetBreakdown[assetKey]) {
            if (typeof latestSnapshot.assetBreakdown[assetKey] === 'object') {
              latestValue = latestSnapshot.assetBreakdown[assetKey].valueJPY || 0;
            } else {
              latestValue = latestSnapshot.assetBreakdown[assetKey] || 0;
            }
          }
          
          // 一つ前のスナップショットの値を取得
          let previousValue = 0;
          if (previousSnapshot.assetBreakdown[assetKey]) {
            if (typeof previousSnapshot.assetBreakdown[assetKey] === 'object') {
              previousValue = previousSnapshot.assetBreakdown[assetKey].valueJPY || 0;
            } else {
              previousValue = previousSnapshot.assetBreakdown[assetKey] || 0;
            }
          }
          
          // 🔥 2つ前のスナップショットの値を取得（投資信託用）
          let twoDaysAgoValue = 0;
          if (twoDaysAgoSnapshot.assetBreakdown[assetKey]) {
            if (typeof twoDaysAgoSnapshot.assetBreakdown[assetKey] === 'object') {
              twoDaysAgoValue = twoDaysAgoSnapshot.assetBreakdown[assetKey].valueJPY || 0;
            } else {
              twoDaysAgoValue = twoDaysAgoSnapshot.assetBreakdown[assetKey] || 0;
            }
          }
          
          // 🔥 投資信託は一つ前と2つ前を比較（更新遅延対応）
          let change, changePercent;
          
          if (asset.type === 'fund') {
            // 投資信託: 一つ前と2つ前のスナップショット比較
            // （最新と一つ前が同じ値になることが多いため）
            change = previousValue - twoDaysAgoValue;
            changePercent = twoDaysAgoValue > 0 ? (change / twoDaysAgoValue) * 100 : 0;
          } else {
            // その他: 取引時間外判定を行う
            const assetValueDiff = Math.abs(currentValue - latestValue);
            const isAssetOutsideTradingHours = assetValueDiff < 10;
            
            if (isAssetOutsideTradingHours) {
              // 取引時間外: スナップショット比較
              change = latestValue - previousValue;
              changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
            } else {
              // 取引時間中: リアルタイム比較
              change = currentValue - latestValue;
              changePercent = latestValue > 0 ? (change / latestValue) * 100 : 0;
            }
          }

          assetChanges[asset.id] = {
            change,
            changePercent
          };
        }
      }

      return {
        totalChange,
        totalChangePercent,
        assetChanges,
        previousDate: isOutsideTradingHours ? previousSnapshot.date : latestSnapshot.date,
        latestDate: isOutsideTradingHours ? latestSnapshot.date : '現在',
        isRealtime: !isOutsideTradingHours
      };
    }

    // リアルタイム価格がない、またはスナップショットが3つ未満の場合
    // スナップショットが2つ以上あれば、通常の比較を試みる
    if (!snapshotData || snapshotData.length < 2) {
      return null;
    }

    // スナップショットが2つの場合
    if (snapshotData.length === 2) {
      const latestSnapshot = snapshotData[1];
      const previousSnapshot = snapshotData[0];

      // 全体の前日比
      const totalChange = latestSnapshot.totalValueJPY - previousSnapshot.totalValueJPY;
      const totalChangePercent = previousSnapshot.totalValueJPY > 0 
        ? (totalChange / previousSnapshot.totalValueJPY) * 100 
        : 0;

      // 銘柄別の前日比
      const assetChanges = {};
      if (latestSnapshot.assetBreakdown && previousSnapshot.assetBreakdown) {
        for (const asset of portfolio) {
          const assetKey = asset.symbol || asset.isinCd || asset.id;
          
          // 最新スナップショットの値を取得
          let latestValue = 0;
          if (latestSnapshot.assetBreakdown[assetKey]) {
            if (typeof latestSnapshot.assetBreakdown[assetKey] === 'object') {
              latestValue = latestSnapshot.assetBreakdown[assetKey].valueJPY || 0;
            } else {
              latestValue = latestSnapshot.assetBreakdown[assetKey] || 0;
            }
          }
          
          // 一つ前のスナップショットの値を取得
          let previousValue = 0;
          if (previousSnapshot.assetBreakdown[assetKey]) {
            if (typeof previousSnapshot.assetBreakdown[assetKey] === 'object') {
              previousValue = previousSnapshot.assetBreakdown[assetKey].valueJPY || 0;
            } else {
              previousValue = previousSnapshot.assetBreakdown[assetKey] || 0;
            }
          }
          
          const change = latestValue - previousValue;
          const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

          assetChanges[asset.id] = {
            change,
            changePercent
          };
        }
      }

      return {
        totalChange,
        totalChangePercent,
        assetChanges,
        previousDate: previousSnapshot.date,
        latestDate: latestSnapshot.date,
        isRealtime: false
      };
    }

    // スナップショットが3つ以上ある場合
    const latestSnapshot = snapshotData[snapshotData.length - 1];
    const previousSnapshot = snapshotData[snapshotData.length - 2];
    const twoDaysAgoSnapshot = snapshotData[snapshotData.length - 3];

    // 全体の前日比
    const totalChange = latestSnapshot.totalValueJPY - previousSnapshot.totalValueJPY;
    const totalChangePercent = previousSnapshot.totalValueJPY > 0 
      ? (totalChange / previousSnapshot.totalValueJPY) * 100 
      : 0;

    // 銘柄別の前日比
    const assetChanges = {};
    if (latestSnapshot.assetBreakdown && previousSnapshot.assetBreakdown && twoDaysAgoSnapshot.assetBreakdown) {
      for (const asset of portfolio) {
        const assetKey = asset.symbol || asset.isinCd || asset.id;
        
        // 最新スナップショットの値を取得
        let latestValue = 0;
        if (latestSnapshot.assetBreakdown[assetKey]) {
          if (typeof latestSnapshot.assetBreakdown[assetKey] === 'object') {
            latestValue = latestSnapshot.assetBreakdown[assetKey].valueJPY || 0;
          } else {
            latestValue = latestSnapshot.assetBreakdown[assetKey] || 0;
          }
        }
        
        // 一つ前のスナップショットの値を取得
        let previousValue = 0;
        if (previousSnapshot.assetBreakdown[assetKey]) {
          if (typeof previousSnapshot.assetBreakdown[assetKey] === 'object') {
            previousValue = previousSnapshot.assetBreakdown[assetKey].valueJPY || 0;
          } else {
            previousValue = previousSnapshot.assetBreakdown[assetKey] || 0;
          }
        }
        
        // 2つ前のスナップショットの値を取得
        let twoDaysAgoValue = 0;
        if (twoDaysAgoSnapshot.assetBreakdown[assetKey]) {
          if (typeof twoDaysAgoSnapshot.assetBreakdown[assetKey] === 'object') {
            twoDaysAgoValue = twoDaysAgoSnapshot.assetBreakdown[assetKey].valueJPY || 0;
          } else {
            twoDaysAgoValue = twoDaysAgoSnapshot.assetBreakdown[assetKey] || 0;
          }
        }
        
        // 🔥 投資信託は一つ前と2つ前を比較
        let change, changePercent;
        
        if (asset.type === 'fund') {
          // 投資信託: 一つ前と2つ前のスナップショット比較
          change = previousValue - twoDaysAgoValue;
          changePercent = twoDaysAgoValue > 0 ? (change / twoDaysAgoValue) * 100 : 0;
        } else {
          // その他: 最新と一つ前のスナップショット比較
          change = latestValue - previousValue;
          changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
        }

        assetChanges[asset.id] = {
          change,
          changePercent
        };
      }
    }

    return {
      totalChange,
      totalChangePercent,
      assetChanges,
      previousDate: previousSnapshot.date,
      latestDate: latestSnapshot.date,
      isRealtime: false
    };
  }, [portfolio, exchangeRate, snapshotData]);

  // 合計計算
  const totals = useMemo(() => {
    if (!portfolio || portfolio.length === 0) {
      return {
        totalCurrentValue: 0,
        totalProfit: 0,
        totalProfitPercent: 0
      };
    }

    const totalInvestment = portfolio.reduce((sum, asset) => {
      const investment = asset.purchasePrice * asset.activeQuantity;
      return sum + (asset.currency === 'USD' ? investment * exchangeRate : investment);
    }, 0);

    const totalCurrentValue = portfolio.reduce((sum, asset) => {
      const currentPrice = asset.currentPrice || asset.purchasePrice;
      const value = currentPrice * asset.activeQuantity;
      return sum + (asset.currency === 'USD' ? value * exchangeRate : value);
    }, 0);

    const totalProfit = totalCurrentValue - totalInvestment;
    const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    return {
      totalCurrentValue,
      totalProfit,
      totalProfitPercent
    };
  }, [portfolio, exchangeRate]);

  return (
    <>
      {/* 合計表示 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* 合計評価額 */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>合計評価額</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            ¥{Math.round(totals.totalCurrentValue).toLocaleString()}
          </div>
        </div>

        {/* 合計損益 + 損益率（統合） */}
        <div style={{
          background: totals.totalProfit >= 0 
            ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
            : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: totals.totalProfit >= 0
            ? '0 4px 12px rgba(67, 233, 123, 0.3)'
            : '0 4px 12px rgba(250, 112, 154, 0.3)'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>合計損益</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {totals.totalProfit >= 0 ? '+' : ''}¥{Math.round(totals.totalProfit).toLocaleString()}
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginTop: '8px', opacity: 0.95 }}>
            {totals.totalProfitPercent >= 0 ? '+' : ''}{totals.totalProfitPercent.toFixed(2)}%
          </div>
        </div>

        {/* 前日比 */}
        {previousDayComparison ? (
          <div style={{
            background: previousDayComparison.totalChange >= 0
              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)'
          }}>
            <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>
              前日比
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {previousDayComparison.totalChange >= 0 ? '+' : ''}¥{Math.round(previousDayComparison.totalChange).toLocaleString()}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginTop: '8px', opacity: 0.95 }}>
              {previousDayComparison.totalChangePercent >= 0 ? '+' : ''}{previousDayComparison.totalChangePercent.toFixed(2)}%
            </div>
            <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.8 }}>
              {previousDayComparison.previousDate} → {previousDayComparison.latestDate}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(160, 174, 192, 0.3)'
          }}>
            <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>前日比</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              データなし
            </div>
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
              スナップショットが不足しています
            </div>
          </div>
        )}
      </div>

      {/* テーブル */}
      <PortfolioTable
        portfolio={portfolio}
        exchangeRate={exchangeRate}
        previousDayComparison={previousDayComparison}
        onEdit={onEdit}
        onDelete={onDelete}
        onSell={onSell}
        onDetail={onDetail}
      />
    </>
  );
};

export default PortfolioSummaryAndTable;