// src/components/AssetChart.jsx
import { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { assetTypeNames, CHART_COLORS } from '../utils/storage';
import { calculateAssetValue } from '../utils/calculations';
import { getTagColor } from '../utils/tags';

export default function AssetChart({ portfolio, sellHistory = [], exchangeRate }) {
  const [viewMode, setViewMode] = useState('type'); // 'type', 'asset', 'tag'

  // 種類別データ（多い順）- メモ化
  const typeChartData = useMemo(() => {
    const data = portfolio.reduce((acc, asset) => {
      const value = calculateAssetValue(asset, sellHistory, exchangeRate);
      
      // 完全売却済みはスキップ
      if (value <= 0) {
        return acc;
      }
      
      const type = asset.type;
      const existing = acc.find(item => item.name === assetTypeNames[type]);
      
      if (existing) {
        existing.value += value;
      } else {
        acc.push({ name: assetTypeNames[type], value, id: type });
      }
      
      return acc;
    }, []);
    
    return data.sort((a, b) => b.value - a.value);
  }, [portfolio, sellHistory, exchangeRate]);

  // 銘柄別データ（多い順、上位10件 + その他）- メモ化
  const assetChartData = useMemo(() => {
    const assetMap = new Map();
    
    portfolio.forEach(asset => {
      const value = calculateAssetValue(asset, sellHistory, exchangeRate);
      
      // 完全売却済みはスキップ
      if (value <= 0) {
        return;
      }
      
      const key = asset.symbol || asset.isinCd;
      
      if (assetMap.has(key)) {
        assetMap.set(key, {
          name: asset.name,
          value: assetMap.get(key).value + value,
          id: key
        });
      } else {
        assetMap.set(key, { name: asset.name, value, id: key });
      }
    });
    
    const sortedAssets = Array.from(assetMap.values())
      .sort((a, b) => b.value - a.value);
    
    if (sortedAssets.length <= 10) {
      return sortedAssets;
    }
    
    const top10 = sortedAssets.slice(0, 10);
    const othersValue = sortedAssets.slice(10).reduce((sum, item) => sum + item.value, 0);
    
    return [...top10, { name: 'その他', value: othersValue, id: 'others' }];
  }, [portfolio, sellHistory, exchangeRate]);

  // タグ別データ（多い順）- メモ化
  const tagChartData = useMemo(() => {
    const tagMap = new Map();
    
    portfolio.forEach(asset => {
      const value = calculateAssetValue(asset, sellHistory, exchangeRate);
      
      // 完全売却済みはスキップ
      if (value <= 0) {
        return;
      }
      
      const tags = asset.tags && asset.tags.length > 0 ? asset.tags : ['未分類'];
      
      tags.forEach(tag => {
        if (tagMap.has(tag)) {
          tagMap.set(tag, tagMap.get(tag) + value / tags.length);
        } else {
          tagMap.set(tag, value / tags.length);
        }
      });
    });
    
    return Array.from(tagMap.entries())
      .map(([name, value]) => ({ name, value, id: name }))
      .sort((a, b) => b.value - a.value);
  }, [portfolio, sellHistory, exchangeRate]);

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

  // 色を取得 - 一貫性のある色配分
  const getColor = (entry, index) => {
    if (viewMode === 'tag' && entry.name !== '未分類') {
      return getTagColor(entry.name);
    }
    return CHART_COLORS[index % CHART_COLORS.length];
  };

  const currentData = getCurrentData();

  // カスタムラベル - 5%以上のみ表示、改良版
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (percent < 0.05) return null; // 5%未満は非表示
    
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30; // ラベルを少し外側に
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#333" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ fontSize: '11px', fontWeight: 500 }}
      >
        {`${name} ${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

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
        <ResponsiveContainer width="100%" height={500}>
          <PieChart>
            <Pie 
              data={currentData} 
              cx="50%" 
              cy="50%" 
              labelLine={true}
              label={renderCustomLabel}
              outerRadius={120}
              innerRadius={0}
              fill="#8884d8" 
              dataKey="value"
              paddingAngle={1}
            >
              {currentData.map((entry, index) => (
                <Cell key={`cell-${entry.id}-${index}`} fill={getColor(entry, index)} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => `¥${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`} 
            />
            <Legend 
              verticalAlign="bottom" 
              height={60}
              iconType="circle"
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="empty-message">データがありません</p>
      )}
    </div>
  );
}