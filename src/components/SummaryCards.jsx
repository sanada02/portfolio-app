// src/components/SummaryCards.jsx
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';

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
      <div className="card">
        <div className="card-icon">
          <DollarSign size={24} />
        </div>
        <div className="card-content">
          <p className="card-label">総資産額（円）</p>
          <p className="card-value">¥{totalValueJPY.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          {totalValueUSD > 0 && (
            <p className="card-subvalue">
              ${totalValueUSD.toLocaleString(undefined, {maximumFractionDigits: 2})} 
              <span className="exchange-rate"> (¥{exchangeRate.toFixed(2)}/USD)</span>
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-icon">
          <TrendingUp size={24} />
        </div>
        <div className="card-content">
          <p className="card-label">総損益</p>
          <p className={`card-value ${totalProfitLoss >= 0 ? 'profit' : 'loss'}`}>
            {totalProfitLoss >= 0 ? '+' : ''}¥{totalProfitLoss.toLocaleString(undefined, {maximumFractionDigits: 0})}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-icon">
          <Calendar size={24} />
        </div>
        <div className="card-content">
          <p className="card-label">保有銘柄 / 記録日数</p>
          <p className="card-value">{portfolioCount}銘柄 / {historyDays}日</p>
        </div>
      </div>
    </div>
  );
}