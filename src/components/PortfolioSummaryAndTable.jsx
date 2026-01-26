// src/components/PortfolioSummaryAndTable.jsx (HKD対応版)
import React, { useMemo, useState } from 'react';
import PortfolioTable from './PortfolioTable';
import { getComparisonStartDate } from '../utils/dateUtils';

const PortfolioSummaryAndTable = ({ portfolio, exchangeRate, exchangeRates, onEdit, onDelete, onSell, onDetail, snapshotData }) => {
  // 期間タイプのState（day, week, month, year）
  const [periodType, setPeriodType] = useState('day');

  // 通貨に応じた為替レートを取得（後方互換性対応）
  const getRate = (currency) => {
    if (currency === 'JPY') return 1;
    if (exchangeRates && typeof exchangeRates === 'object') {
      return exchangeRates[currency] || 1;
    }
    // 後方互換性: exchangeRateが数値の場合はUSD用
    if (typeof exchangeRate === 'number' && currency === 'USD') {
      return exchangeRate;
    }
    return 1;
  };

  // 期間ラベルを取得
  const getPeriodLabel = () => {
    switch (periodType) {
      case 'day': return '前日比';
      case 'week': return '前週比';
      case 'month': return '先月比';
      case 'year': return '年初来';
      default: return '前日比';
    }
  };

  // 期間比較を計算（購入日以降の利益のみを計算）
  const periodComparison = useMemo(() => {
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

    // スナップショットがない場合
    if (!snapshotData || snapshotData.length === 0) {
      return null;
    }

    // 比較開始日を取得
    const comparisonStartDate = getComparisonStartDate(periodType);

    // 最新のスナップショット
    const latestSnapshot = snapshotData[snapshotData.length - 1];

    // 比較開始日に最も近いスナップショットを探す
    let comparisonSnapshot = null;

    if (periodType === 'day') {
      // 前日比：従来のロジック
      comparisonSnapshot = snapshotData.length >= 2 ? snapshotData[snapshotData.length - 2] : null;
    } else {
      // 週/月/年：指定日以降で最も古いスナップショットを探す
      const matchingSnapshots = snapshotData.filter(s => s.date >= comparisonStartDate);
      if (matchingSnapshots.length > 0) {
        comparisonSnapshot = matchingSnapshots[0]; // 最も古いもの
      } else {
        // 該当スナップショットがない場合は最も古いスナップショットを使用
        comparisonSnapshot = snapshotData[0];
      }
    }

    if (!comparisonSnapshot) {
      return null;
    }

    // 現在の評価額を計算
    let currentTotalValueJPY = 0;
    const currentAssetValues = {};

    for (const asset of portfolio) {
      const currentPrice = asset.currentPrice || asset.purchasePrice;
      const value = currentPrice * asset.activeQuantity;
      const valueJPY = value * getRate(asset.currency);

      currentTotalValueJPY += valueJPY;

      // assetKeyを生成（priceAPI.jsと同じロジック）
      const assetKey = asset.symbol || asset.isinCd || asset.id;
      currentAssetValues[assetKey] = valueJPY;
    }

    // 全市場が閉じているかチェック
    const allMarketsClosed = !hasOpenMarket;

    // 銘柄別の期間比較を計算（購入日以降の利益のみを計算）
    const assetChanges = {};
    let totalChange = 0;

    if (latestSnapshot.assetBreakdown && comparisonSnapshot.assetBreakdown) {
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

        let change, changePercent;

        // 購入日をチェック（購入日が比較開始日より後の場合は、購入日以降のスナップショットを使用）
        const assetPurchaseDates = asset.purchases?.map(p => p.date) || [asset.purchaseDate];
        const oldestPurchaseDate = assetPurchaseDates.sort()[0];

        // この銘柄が存在する最も古いスナップショットを探す
        let effectiveComparisonSnapshot = comparisonSnapshot;

        // 前日比の場合は、価格が変化した最も近いスナップショットを探す
        if (periodType === 'day') {
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
              effectiveComparisonSnapshot = snapshot;
              foundDifferentValue = true;
              break;
            }
          }

          // 価格が異なるスナップショットが見つからない場合は、一つ前のスナップショットを使用
          if (!foundDifferentValue && snapshotData.length >= 2) {
            effectiveComparisonSnapshot = snapshotData[snapshotData.length - 2];
          }
        }
        // 購入日が比較開始日より後の場合は、購入日以降のスナップショットを使用
        else if (oldestPurchaseDate && oldestPurchaseDate > comparisonSnapshot.date) {
          // 購入日以降で最も古いスナップショットを探す
          const purchaseSnapshots = snapshotData.filter(s => s.date >= oldestPurchaseDate && s.assetBreakdown && s.assetBreakdown[assetKey]);
          if (purchaseSnapshots.length > 0) {
            effectiveComparisonSnapshot = purchaseSnapshots[0];
          } else {
            // スナップショットがない場合は変化なし
            change = 0;
            changePercent = 0;
            assetChanges[asset.id] = { change, changePercent };
            continue;
          }
        }

        // 有効な比較スナップショットの値と数量を取得
        let effectiveComparisonValue = 0;
        let effectiveComparisonQuantity = 0;
        if (effectiveComparisonSnapshot.assetBreakdown && effectiveComparisonSnapshot.assetBreakdown[assetKey]) {
          if (typeof effectiveComparisonSnapshot.assetBreakdown[assetKey] === 'object') {
            effectiveComparisonValue = effectiveComparisonSnapshot.assetBreakdown[assetKey].valueJPY || 0;
            effectiveComparisonQuantity = effectiveComparisonSnapshot.assetBreakdown[assetKey].quantity || 0;
          } else {
            effectiveComparisonValue = effectiveComparisonSnapshot.assetBreakdown[assetKey] || 0;
            effectiveComparisonQuantity = 0; // 古い形式の場合は数量不明
          }
        }

        // 最新スナップショットの数量を取得
        let latestQuantity = 0;
        if (latestSnapshot.assetBreakdown && latestSnapshot.assetBreakdown[assetKey]) {
          if (typeof latestSnapshot.assetBreakdown[assetKey] === 'object') {
            latestQuantity = latestSnapshot.assetBreakdown[assetKey].quantity || 0;
          }
        }

        // 現在の保有数量を取得
        const currentQuantity = asset.activeQuantity;

        // 単価の変動を計算（スナップショット時点の数量で単価を算出）
        // すべての資産タイプで同じロジックを使用
        const isMarketClosed = asset.isMarketOpen !== true;

        if (isMarketClosed) {
          // 市場が閉じている: スナップショット比較（単価ベース）
          const oldUnitPrice = effectiveComparisonQuantity > 0 ? effectiveComparisonValue / effectiveComparisonQuantity : 0;
          const newUnitPrice = latestQuantity > 0 ? latestValue / latestQuantity : 0;
          const unitPriceChange = newUnitPrice - oldUnitPrice;
          change = unitPriceChange * currentQuantity;
          changePercent = oldUnitPrice > 0 ? (unitPriceChange / oldUnitPrice) * 100 : 0;
        } else {
          // 市場が開いている: リアルタイム比較（単価ベース）
          const oldUnitPrice = latestQuantity > 0 ? latestValue / latestQuantity : 0;
          const currentUnitPrice = currentQuantity > 0 ? currentValue / currentQuantity : 0;
          const unitPriceChange = currentUnitPrice - oldUnitPrice;
          change = unitPriceChange * currentQuantity;
          changePercent = oldUnitPrice > 0 ? (unitPriceChange / oldUnitPrice) * 100 : 0;
        }

        assetChanges[asset.id] = {
          change,
          changePercent
        };

        // 銘柄別の期間比較を合計
        totalChange += change;
      }
    }

    // 全体の期間比較率を計算（現在の評価額から逆算）
    const currentTotalValue = allMarketsClosed ? latestSnapshot.totalValueJPY : currentTotalValueJPY;
    const totalChangePercent = (currentTotalValue - totalChange) > 0
      ? (totalChange / (currentTotalValue - totalChange)) * 100
      : 0;

    return {
      totalChange,
      totalChangePercent,
      assetChanges,
      comparisonDate: comparisonSnapshot.date,
      latestDate: allMarketsClosed ? latestSnapshot.date : '現在',
      isRealtime: !allMarketsClosed
    };
  }, [portfolio, exchangeRate, exchangeRates, snapshotData, periodType]);

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
      return sum + investment * getRate(asset.currency);
    }, 0);

    const totalCurrentValue = portfolio.reduce((sum, asset) => {
      const currentPrice = asset.currentPrice || asset.purchasePrice;
      const value = currentPrice * asset.activeQuantity;
      return sum + value * getRate(asset.currency);
    }, 0);

    const totalProfit = totalCurrentValue - totalInvestment;
    const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    return {
      totalCurrentValue,
      totalProfit,
      totalProfitPercent
    };
  }, [portfolio, exchangeRate, exchangeRates]);

  return (
    <>
      {/* 期間選択UI */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => setPeriodType('day')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: periodType === 'day' ? '2px solid #667eea' : '1px solid #ccc',
            background: periodType === 'day' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
            color: periodType === 'day' ? 'white' : '#333',
            fontWeight: periodType === 'day' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          前日比
        </button>
        <button
          onClick={() => setPeriodType('week')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: periodType === 'week' ? '2px solid #667eea' : '1px solid #ccc',
            background: periodType === 'week' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
            color: periodType === 'week' ? 'white' : '#333',
            fontWeight: periodType === 'week' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          前週比
        </button>
        <button
          onClick={() => setPeriodType('month')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: periodType === 'month' ? '2px solid #667eea' : '1px solid #ccc',
            background: periodType === 'month' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
            color: periodType === 'month' ? 'white' : '#333',
            fontWeight: periodType === 'month' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          先月比
        </button>
        <button
          onClick={() => setPeriodType('year')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: periodType === 'year' ? '2px solid #667eea' : '1px solid #ccc',
            background: periodType === 'year' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
            color: periodType === 'year' ? 'white' : '#333',
            fontWeight: periodType === 'year' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          年初来
        </button>
      </div>

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

        {/* 期間比較 */}
        {periodComparison ? (
          <div style={{
            background: periodComparison.totalChange >= 0
              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)'
          }}>
            <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>
              {getPeriodLabel()}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {periodComparison.totalChange >= 0 ? '+' : ''}¥{Math.round(periodComparison.totalChange).toLocaleString()}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginTop: '8px', opacity: 0.95 }}>
              {periodComparison.totalChangePercent >= 0 ? '+' : ''}{periodComparison.totalChangePercent.toFixed(2)}%
            </div>
            <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.8 }}>
              {periodComparison.comparisonDate} → {periodComparison.latestDate}
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
            <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>{getPeriodLabel()}</div>
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
        exchangeRates={exchangeRates}
        periodComparison={periodComparison}
        periodLabel={getPeriodLabel()}
        onEdit={onEdit}
        onDelete={onDelete}
        onSell={onSell}
        onDetail={onDetail}
      />
    </>
  );
};

export default PortfolioSummaryAndTable;
