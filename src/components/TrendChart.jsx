// src/components/TrendChart.jsx
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function TrendChart({ dailyHistory }) {
  if (!dailyHistory || dailyHistory.length === 0) {
    return null;
  }

  const chartData = dailyHistory.map(item => ({
    date: new Date(item.timestamp).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
    value: item.totalValue
  }));

  return (
    <div className="section trend-chart">
      <h2>資産推移</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`} />
          <Tooltip 
            formatter={(value) => [`¥${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`, '評価額']}
          />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={2} name="評価額" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}