// src/components/PerformanceChart.jsx (リアルタイムデータ対応版)
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PerformanceChart = ({ data, portfolio, exchangeRate }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
        <h3>データがありません</h3>
        <p>「価格更新」または「履歴再構築」を実行してください</p>
      </div>
    );
  }

  // データを日付でソート
  const sortedData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 🔥 現在のリアルタイム評価額を計算
  const calculateCurrentValue = () => {
    let totalJPY = 0;
    let totalUSD = 0;
    
    portfolio.forEach(asset => {
      const currentPrice = asset.currentPrice || asset.purchasePrice;
      const value = currentPrice * asset.activeQuantity;
      
      if (asset.currency === 'USD') {
        totalUSD += value;
        totalJPY += value * exchangeRate;
      } else {
        totalJPY += value;
      }
    });
    
    return { totalJPY, totalUSD };
  };

  const currentValue = portfolio && portfolio.length > 0 ? calculateCurrentValue() : null;

  // 日付フォーマット
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 通貨フォーマット
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(1)}M`;
    }
    return `¥${(value / 1000).toFixed(0)}K`;
  };

  // 最新の評価額（リアルタイムがあればそれを、なければスナップショットの最新）
  const totalValueJPY = currentValue ? currentValue.totalJPY : (sortedData[sortedData.length - 1]?.totalValueJPY || 0);
  const totalValueUSD = currentValue ? currentValue.totalUSD : (sortedData[sortedData.length - 1]?.totalValueUSD || 0);

  // 開始時との比較
  const firstSnapshot = sortedData[0];
  const initialValue = firstSnapshot?.totalValueJPY || 0;
  const change = totalValueJPY - initialValue;
  const changePercent = initialValue > 0 ? ((change / initialValue) * 100).toFixed(2) : 0;
  const isPositive = change >= 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '15px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            {new Date(payload[0].payload.date).toLocaleDateString('ja-JP')}
          </p>
          <p style={{ color: '#667eea', marginBottom: '4px' }}>
            評価額: ¥{Math.round(payload[0].value).toLocaleString()}
          </p>
          {payload[0].payload.totalValueUSD > 0 && (
            <p style={{ color: '#764ba2', fontSize: '13px' }}>
              USD: ${Math.round(payload[0].payload.totalValueUSD).toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // 損益の文字色を取得
  const getProfitColor = (value) => {
    if (value > 0) return '#10b981'; // green
    if (value < 0) return '#ef4444'; // red
    return '#6b7280'; // gray
  };

  return (
    <div>
      {/* サマリー */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>現在の評価額</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            ¥{Math.round(totalValueJPY).toLocaleString()}
          </div>
          {totalValueUSD > 0 && (
            <>
              <div style={{ fontSize: '13px', marginTop: '8px', opacity: 0.9 }}>
                USD資産: ${Math.round(totalValueUSD).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                レート: ¥{exchangeRate.toFixed(2)}/USD
              </div>
            </>
          )}
        </div>

        <div style={{
          background: isPositive 
            ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
            : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: isPositive
            ? '0 4px 12px rgba(67, 233, 123, 0.3)'
            : '0 4px 12px rgba(250, 112, 154, 0.3)'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>損益</div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 'bold',
            color: getProfitColor(change)
          }}>
            {isPositive ? '+' : ''}¥{Math.round(change).toLocaleString()}
          </div>
          <div style={{ 
            fontSize: '16px', 
            marginTop: '4px',
            color: getProfitColor(change)
          }}>
            ({isPositive ? '+' : ''}{changePercent}%)
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>データ期間</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {sortedData.length}日分
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
            {new Date(firstSnapshot.date).toLocaleDateString('ja-JP')} 〜
          </div>
        </div>
      </div>

      {/* チャート */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={sortedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#666"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            stroke="#666"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => value === 'totalValueJPY' ? 'ポートフォリオ評価額' : value}
          />
          <Line
            type="monotone"
            dataKey="totalValueJPY"
            stroke="#667eea"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
            name="ポートフォリオ評価額"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* 統計情報 */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px'
      }}>
        <div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>開始時評価額</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
            ¥{Math.round(initialValue).toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>最高評価額</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
            ¥{Math.round(Math.max(...sortedData.map(d => d.totalValueJPY))).toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>最低評価額</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
            ¥{Math.round(Math.min(...sortedData.map(d => d.totalValueJPY))).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;