// src/components/TagComparisonChart.jsx
import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { calculateAssetValue } from '../utils/calculations';
import { getTags, getTagColor } from '../utils/tags';

export default function TagComparisonChart({ portfolio, sellHistory = [], exchangeRate }) {
  const [selectedTag, setSelectedTag] = useState('');
  const tags = getTags();

  if (tags.length === 0) {
    return null;
  }

  // 選択されたタグの銘柄データを取得 - メモ化
  const chartData = useMemo(() => {
    if (!selectedTag) {
      return [];
    }
    
    const assetMap = new Map();
    
    portfolio
      .filter(asset => asset.tags?.includes(selectedTag))
      .forEach(asset => {
        const value = calculateAssetValue(asset, sellHistory, exchangeRate);
        
        // 完全売却済みはスキップ
        if (value <= 0) {
          return;
        }
        
        const key = asset.symbol || asset.isinCd;
        const purchaseValue = asset.currency === 'USD' 
          ? asset.purchasePrice * asset.quantity * exchangeRate
          : asset.purchasePrice * asset.quantity;
        const profitLoss = value - purchaseValue;
        
        if (assetMap.has(key)) {
          const existing = assetMap.get(key);
          assetMap.set(key, {
            ...existing,
            value: existing.value + value,
            profitLoss: existing.profitLoss + profitLoss
          });
        } else {
          assetMap.set(key, {
            name: asset.name,
            value,
            profitLoss
          });
        }
      });
    
    return Array.from(assetMap.values())
      .sort((a, b) => b.value - a.value);
  }, [portfolio, sellHistory, exchangeRate, selectedTag]);

  return (
    <div className="section">
      <div className="section-header">
        <h2>タグ別銘柄比較</h2>
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="tag-selector"
        >
          <option value="">タグを選択</option>
          {tags.map(tag => (
            <option key={tag.id} value={tag.name}>{tag.name}</option>
          ))}
        </select>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === '評価額') {
                  return [`¥${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`, name];
                }
                return [
                  `${value >= 0 ? '+' : ''}¥${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
                  name
                ];
              }}
            />
            <Legend />
            <Bar dataKey="value" fill={getTagColor(selectedTag)} name="評価額" />
            <Bar dataKey="profitLoss" fill="#10b981" name="損益" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="empty-message">
          {selectedTag ? 'このタグの銘柄がありません' : 'タグを選択してください'}
        </p>
      )}
    </div>
  );
}