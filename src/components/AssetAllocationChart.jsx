// src/components/AssetAllocationChart.jsx (グループ化対応版)
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];

const AssetAllocationChart = ({ portfolio, exchangeRate, groupBy = 'name', selectedTags = null }) => {
  if (!portfolio || portfolio.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        データがありません
      </div>
    );
  }

  // グループ化ロジック
  const getData = () => {
    const grouped = {};

    portfolio.forEach(asset => {
      let key;
      let value = asset.currency === 'USD'
        ? (asset.currentPrice || asset.purchasePrice) * asset.activeQuantity * exchangeRate
        : (asset.currentPrice || asset.purchasePrice) * asset.activeQuantity;

      switch (groupBy) {
        case 'type':
          key = asset.type === 'stock' ? '株式' :
                asset.type === 'fund' ? '投資信託' :
                asset.type === 'etf' ? 'ETF' :
                asset.type === 'crypto' ? '仮想通貨' : 'その他';
          break;
        
        case 'tags':
          if (!asset.tags || asset.tags.length === 0) {
            key = 'タグなし';
          } else {
            // 🔥 選択されたタグのみを処理（按分なし）
            const relevantTags = selectedTags 
              ? asset.tags.filter(tag => selectedTags.includes(tag))
              : asset.tags;
            
            if (relevantTags.length === 0) return; // 選択されたタグがない場合はスキップ
            
            // 🔥 按分せず、各タグに全額を加算（ユーザーが判断）
            relevantTags.forEach(tag => {
              grouped[tag] = (grouped[tag] || 0) + value;
            });
            return; // forEachを抜ける
          }
          break;
        
        case 'name':
        default:
          key = asset.name;
          break;
      }

      grouped[key] = (grouped[key] || 0) + value;
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const data = getData();

  const formatCurrency = (value) => {
    return `¥${Math.round(value).toLocaleString()}`;
  };

  const getPercentage = (value) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return ((value / total) * 100).toFixed(1);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            {payload[0].name}
          </p>
          <p style={{ color: '#667eea', marginBottom: '4px' }}>
            評価額: {formatCurrency(payload[0].value)}
          </p>
          <p style={{ color: '#764ba2' }}>
            構成比: {getPercentage(payload[0].value)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // 5%未満は表示しない

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '14px', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={150}
            fill="#8884d8"
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => {
              const percentage = getPercentage(entry.payload.value);
              return `${value} (${percentage}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 詳細リスト */}
      <div style={{ marginTop: '30px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>
                {groupBy === 'type' ? '種別' :
                 groupBy === 'tags' ? 'タグ' : '銘柄名'}
              </th>
              <th style={{ padding: '12px', textAlign: 'right' }}>評価額</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>構成比</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e9ecef' }}>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: COLORS[index % COLORS.length],
                    marginRight: '8px'
                  }}></span>
                  {item.name}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                  {formatCurrency(item.value)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#667eea', fontWeight: '500' }}>
                  {getPercentage(item.value)}%
                </td>
              </tr>
            ))}
            <tr style={{ background: '#f8f9fa', fontWeight: 'bold', borderTop: '2px solid #dee2e6' }}>
              <td style={{ padding: '12px' }}>合計</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>
                {formatCurrency(data.reduce((sum, item) => sum + item.value, 0))}
              </td>
              <td style={{ padding: '12px', textAlign: 'right' }}>100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssetAllocationChart;