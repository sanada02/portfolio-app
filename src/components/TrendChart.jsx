// src/components/TrendChart.jsx
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function TrendChart({ dailyHistory }) {
  const lineChartData = dailyHistory.map(snapshot => ({
    date: new Date(snapshot.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
    総資産: snapshot.totalValueJPY
  }));

  if (lineChartData.length < 2) {
    return null;
  }

  return (
    <div className="section chart-section">
      <h2>📈 総資産推移（過去30日）</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={lineChartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`} />
          <Tooltip 
            formatter={(value) => [`¥${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`, '総資産']} 
            labelStyle={{ color: '#666' }} 
          />
          <Line 
            type="monotone" 
            dataKey="総資産" 
            stroke="#667eea" 
            strokeWidth={3} 
            dot={{ fill: '#667eea', r: 4 }} 
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}