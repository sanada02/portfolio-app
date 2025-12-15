// src/components/AssetChart.jsx
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { assetTypeNames, CHART_COLORS } from '../utils/storage';
import { calculateAssetValue } from '../utils/calculations';

export default function AssetChart({ portfolio, exchangeRate }) {
  const pieChartData = portfolio.reduce((acc, asset) => {
    const type = asset.type;
    const value = calculateAssetValue(asset, exchangeRate);
    const existing = acc.find(item => item.name === assetTypeNames[type]);
    if (existing) {
      existing.value += value;
    } else {
      acc.push({ name: assetTypeNames[type], value: value });
    }
    return acc;
  }, []);

  return (
    <div className="section">
      <h2>資産配分</h2>
      {pieChartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie 
              data={pieChartData} 
              cx="50%" 
              cy="50%" 
              labelLine={false} 
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} 
              outerRadius={80} 
              fill="#8884d8" 
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `¥${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="empty-message">データがありません</p>
      )}
    </div>
  );
}