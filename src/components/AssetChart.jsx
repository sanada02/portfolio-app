// src/components/AssetChart.jsx
import { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { assetTypeNames, CHART_COLORS } from '../utils/storage';
import { calculateAssetValue } from '../utils/calculations';
import { getTagColor } from '../utils/tags';

export default function AssetChart({ portfolio, exchangeRate }) {
  const [viewMode, setViewMode] = useState('type'); // 'type', 'asset', 'tag'

  // 種類別データ（多い順）
  const typeChartData = portfolio.reduce((acc, asset) => {
    const type = asset.type;
    const value = calculateAssetValue(asset, exchangeRate);
    const existing = acc.find(item => item.name === assetTypeNames[type]);
    if (existing) {
      existing.value += value;
    } else {
      acc.push({ name: assetTypeNames[type], value: value });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  // 銘柄別データ（多い順、上位10件 + その他）
  const assetChartData = (() => {
    const assetMap = new Map();
    
    portfolio.forEach(asset => {
      const key = asset.symbol || asset.isinCd;
      const value = calculateAssetValue(asset, exchangeRate);
      
      if (assetMap.has(key)) {
        assetMap.set(key, {
          name: asset.name,
          value: assetMap.get(key).value + value
        });
      } else {
        assetMap.set(key, { name: asset.name, value });
      }
    });
    
    const sortedAssets = Array.from(assetMap.values())
      .sort((a, b) => b.value - a.value);
    
    if (sortedAssets.length <= 10) {
      return sortedAssets;
    }
    
    const top10 = sortedAssets.slice(0, 10);
    const othersValue = sortedAssets.slice(10).reduce((sum, item) => sum + item.value, 0);
    
    return [...top10, { name: 'その他', value: othersValue }];
  })();

  // タグ別データ（多い順）
  const tagChartData = (() => {
    const tagMap = new Map();
    
    portfolio.forEach(asset => {
      const tags = asset.tags || ['未分類'];
      const value = calculateAssetValue(asset, exchangeRate);
      
      tags.forEach(tag => {
        if (tagMap.has(tag)) {
          tagMap.set(tag, tagMap.get(tag) + value);
        } else {
          tagMap.set(tag, value);
        }
      });
    });
    
    return Array.from(tagMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  })();

  // 現在のデータを取得
  const getCurrentData = () => {
    switch(viewMode) {
      case 'asset':
        return assetChartData;
      case 'tag':
        return tagChartData;
      default:
        return typeChartData;
    }
  };

  // 色を取得
  const getColor = (entry, index) => {
    if (viewMode === 'tag' && entry.name !== '未分類') {
      return getTagColor(entry.name);
    }
    return CHART_COLORS[index % CHART_COLORS.length];
  };

  const currentData = getCurrentData();

  return (
    <div className="section">
      <div className="chart-header">
        <h2>資産配分</h2>
        <div className="chart-view-selector">
          <button
            className={`btn-view ${viewMode === 'type' ? 'active' : ''}`}
            onClick={() => setViewMode('type')}
          >
            種類別
          </button>
          <button
            className={`btn-view ${viewMode === 'asset' ? 'active' : ''}`}
            onClick={() => setViewMode('asset')}
          >
            銘柄別
          </button>
          <button
            className={`btn-view ${viewMode === 'tag' ? 'active' : ''}`}
            onClick={() => setViewMode('tag')}
          >
            タグ別
          </button>
        </div>
      </div>
      
      {currentData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie 
              data={currentData} 
              cx="50%" 
              cy="50%" 
              labelLine={false} 
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} 
              outerRadius={80} 
              fill="#8884d8" 
              dataKey="value"
            >
              {currentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry, index)} />
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