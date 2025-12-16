// src/components/PortfolioSummaryAndTable.jsx
import React, { useMemo } from 'react';
import PortfolioTable from './PortfolioTable';

const PortfolioSummaryAndTable = ({ portfolio, exchangeRate, onEdit, onDelete, onSell, onDetail }) => {
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
        </div>

        <div style={{
          background: totals.totalProfitPercent >= 0
            ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>合計損益率</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {totals.totalProfitPercent >= 0 ? '+' : ''}{totals.totalProfitPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* テーブル */}
      <PortfolioTable
        portfolio={portfolio}
        exchangeRate={exchangeRate}
        onEdit={onEdit}
        onDelete={onDelete}
        onSell={onSell}
        onDetail={onDetail}
      />
    </>
  );
};

export default PortfolioSummaryAndTable;