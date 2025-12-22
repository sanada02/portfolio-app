// src/components/PortfolioSummaryAndTable.jsx
import React, { useMemo } from 'react';
import PortfolioTable from './PortfolioTable';

const PortfolioSummaryAndTable = ({ portfolio, exchangeRate, onEdit, onDelete, onSell, onDetail, snapshotData }) => {
  // 前日比を計算（リアルタイム価格 vs 最新スナップショット、またはスナップショット間の差）
  const previousDayComparison = useMemo(() => {
    if (!portfolio || portfolio.length === 0) {
      return null;
    }

    // 市場が開いている銘柄があるかチェック
    const hasOpenMarket = portfolio.some(asset => {
      if (asset.isMarketOpen === true) {
        return true;
      }
      if (asset.isMarketOpen === undefined) {
        return false; // 安全のため閉場として扱う
      }
      return false;
    });

    // スナップショットが2つ以上ある場合
    if (snapshotData && snapshotData.length >= 2) {
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

      // 全市場が閉じているかチェック
      const allMarketsClosed = !hasOpenMarket;

      // 銘柄別の前日比を計算（先に計算して、その後合計する）
      const assetChanges = {};
      let totalChange = 0;
      if (latestSnapshot.assetBreakdown && previousSnapshot.assetBreakdown) {
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

          // 価格が変化した最も近いスナップショットを探す
          let previousValue = 0;
          let foundDifferentValue = false;

          // 最大7日前まで遡って、価格が異なるスナップショットを探す
          for (let i = snapshotData.length - 2; i >= Math.max(0, snapshotData.length - 8); i--) {
            const snapshot = snapshotData[i];
            if (!snapshot.assetBreakdown || !snapshot.assetBreakdown[assetKey]) {
              continue;
            }

            let value = 0;
            if (typeof snapshot.assetBreakdown[assetKey] === 'object') {
              value = snapshot.assetBreakdown[assetKey].valueJPY || 0;
            } else {
              value = snapshot.assetBreakdown[assetKey] || 0;
            }

            // 価格が異なる場合、そのスナップショットを使用
            if (Math.abs(value - latestValue) > 1) { // 1円以上の差があれば異なると判定
              previousValue = value;
              foundDifferentValue = true;
              break;
            }
          }

          // 価格が変化したスナップショットが見つからない場合は、一つ前のスナップショットを使用
          if (!foundDifferentValue) {
            if (previousSnapshot.assetBreakdown[assetKey]) {
              if (typeof previousSnapshot.assetBreakdown[assetKey] === 'object') {
                previousValue = previousSnapshot.assetBreakdown[assetKey].valueJPY || 0;
              } else {
                previousValue = previousSnapshot.assetBreakdown[assetKey] || 0;
              }
            }
          }

          // 2つ前のスナップショットの値を取得（投資信託用）
          let twoDaysAgoValue = 0;
          if (twoDaysAgoSnapshot && twoDaysAgoSnapshot.assetBreakdown && twoDaysAgoSnapshot.assetBreakdown[assetKey]) {
            if (typeof twoDaysAgoSnapshot.assetBreakdown[assetKey] === 'object') {
              twoDaysAgoValue = twoDaysAgoSnapshot.assetBreakdown[assetKey].valueJPY || 0;
            } else {
              twoDaysAgoValue = twoDaysAgoSnapshot.assetBreakdown[assetKey] || 0;
            }
          }

          let change, changePercent;

          if (asset.type === 'fund' && twoDaysAgoValue > 0) {
            // 投資信託: 一つ前と2つ前のスナップショット比較
            // （最新と一つ前が同じ値になることが多いため）
            change = previousValue - twoDaysAgoValue;
            changePercent = twoDaysAgoValue > 0 ? (change / twoDaysAgoValue) * 100 : 0;
          } else {
            // その他の資産: 市場の開閉状態で判定
            const isMarketClosed = asset.isMarketOpen !== true;

            if (isMarketClosed) {
              // 市場が閉じている: スナップショット比較
              change = latestValue - previousValue;
              changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
            } else {
              // 市場が開いている: リアルタイム比較
              change = currentValue - latestValue;
              changePercent = latestValue > 0 ? (change / latestValue) * 100 : 0;
            }
          }

          assetChanges[asset.id] = {
            change,
            changePercent
          };

          // 銘柄別の前日比を合計
          totalChange += change;
        }
      }

      // 全体の前日比率を計算（現在の評価額から逆算）
      const currentTotalValue = allMarketsClosed ? latestSnapshot.totalValueJPY : currentTotalValueJPY;
      const totalChangePercent = (currentTotalValue - totalChange) > 0
        ? (totalChange / (currentTotalValue - totalChange)) * 100
        : 0;

      return {
        totalChange,
        totalChangePercent,
        assetChanges,
        previousDate: allMarketsClosed ? previousSnapshot.date : latestSnapshot.date,
        latestDate: allMarketsClosed ? latestSnapshot.date : '現在',
        isRealtime: !allMarketsClosed
      };
    }

    // スナップショットが不足している場合
    return null;
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