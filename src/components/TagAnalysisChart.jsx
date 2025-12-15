// src/components/TagAnalysisChart.jsx
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CHART_COLORS } from '../utils/storage';
import { calculateAssetValue } from '../utils/calculations';

export default function TagAnalysisChart({ portfolio, sellHistory, exchangeRate }) {
  // タグごとの資産を集計
  const tagData = portfolio.reduce((acc, asset) => {
    const value = calculateAssetValue(asset, sellHistory, exchangeRate);
    
    // 完全売却済みの場合はスキップ
    if (value <= 0) {
      return acc;
    }
    
    const tags = asset.tags && asset.tags.length > 0 ? asset.tags : ['未分類'];
    
    // 各タグに資産を分配
    tags.forEach(tag => {
      if (!acc[tag]) {
        acc[tag] = {
          name: tag,
          value: 0,
          count: 0
        };
      }
      // 複数タグの場合は均等に分配
      acc[tag].value += value / tags.length;
      acc[tag].count += 1 / tags.length;
    });
    
    return acc;
  }, {});

  const pieChartData = Object.values(tagData).sort((a, b) => b.value - a.value);
  const barChartData = Object.values(tagData)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // 上位10件

  const totalValue = pieChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="section">
      <h2>📊 タグ別分析</h2>
      
      {pieChartData.length > 0 ? (
        <>
          {/* 円グラフ */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#666' }}>構成比率</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={pieChartData} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false} 
                  label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''} 
                  outerRadius={80} 
                  fill="#8884d8" 
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [
                    `¥${value.toLocaleString(undefined, {maximumFractionDigits: 0})} (${((value / totalValue) * 100).toFixed(1)}%)`,
                    '評価額'
                  ]} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 棒グラフ */}
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#666' }}>評価額ランキング (上位10件)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval={0}
                />
                <YAxis tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`} />
                <Tooltip 
                  formatter={(value) => [`¥${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`, '評価額']} 
                />
                <Bar dataKey="value" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* サマリーテーブル */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#666' }}>詳細</h3>
            <table className="portfolio-table" style={{ minWidth: 'auto' }}>
              <thead>
                <tr>
                  <th>タグ</th>
                  <th>評価額</th>
                  <th>構成比</th>
                  <th>銘柄数</th>
                </tr>
              </thead>
              <tbody>
                {pieChartData.map((item, index) => (
                  <tr key={item.name}>
                    <td>
                      <span 
                        className="tag-badge" 
                        style={{ 
                          background: CHART_COLORS[index % CHART_COLORS.length] + '20',
                          color: CHART_COLORS[index % CHART_COLORS.length],
                          borderColor: CHART_COLORS[index % CHART_COLORS.length]
                        }}
                      >
                        {item.name}
                      </span>
                    </td>
                    <td>¥{item.value.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                    <td>{((item.value / totalValue) * 100).toFixed(1)}%</td>
                    <td>{Math.round(item.count)}銘柄</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="empty-message">タグが設定されていません</p>
      )}
    </div>
  );
}