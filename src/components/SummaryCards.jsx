// src/components/SummaryCards.jsx
export default function SummaryCards({ 
  totalValueJPY, 
  totalValueUSD, 
  totalProfitLoss, 
  exchangeRate, 
  portfolioCount,
  historyDays 
}) {
  return (
    <div className="summary-cards">
      <div className="summary-card">
        <h3>総評価額（円）</h3>
        <div className="value">
          ¥{totalValueJPY.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="sub-value">
          {portfolioCount}銘柄保有中
        </div>
      </div>

      <div className="summary-card">
        <h3>総評価額（USD）</h3>
        <div className="value">
          ${totalValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <div className="sub-value">
          為替レート: ¥{exchangeRate.toFixed(2)}
        </div>
      </div>

      <div className="summary-card">
        <h3>総損益</h3>
        <div className={`value ${totalProfitLoss >= 0 ? 'positive' : 'negative'}`}>
          {totalProfitLoss >= 0 ? '+' : ''}¥{totalProfitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="sub-value">
          {historyDays}日間の推移記録
        </div>
      </div>
    </div>
  );
}