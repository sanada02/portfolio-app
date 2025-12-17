// src/components/PerformanceChart.jsx (期間選択機能追加版)
import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PerformanceChart = ({ data, portfolio, exchangeRate }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d'); // デフォルトは30日

  // 状態変化を追跡
  useEffect(() => {
    console.log('selectedPeriod changed to:', selectedPeriod);
  }, [selectedPeriod]);

  useEffect(() => {
    console.log('Component mounted, initial selectedPeriod:', selectedPeriod);
  }, []);

  // データを日付でソートし、期間に応じてフィルタリング
  const { sortedData, filteredData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { sortedData: [], filteredData: [] };
    }
    
    // データを日付でソート
    const sorted = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 全期間の場合は早期リターン
    if (selectedPeriod === 'all') {
      console.log('Period: all');
      console.log('Total data points:', sorted.length);
      return { sortedData: sorted, filteredData: sorted };
    }

    // 期間に応じてフィルタリング
    let startDate;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // 時刻を00:00:00にリセット

    switch (selectedPeriod) {
      case '30d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '1y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1); // 今年の1月1日
        break;
      default:
        return { sortedData: sorted, filteredData: sorted };
    }

    const filtered = sorted.filter(item => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      const isIncluded = itemDate >= startDate;
      return isIncluded;
    });
    
    console.log('=== Period Selection Debug ===');
    console.log('Period:', selectedPeriod);
    console.log('Start Date:', startDate.toISOString());
    console.log('Now:', now.toISOString());
    console.log('Total data points:', sorted.length);
    console.log('Filtered data points:', filtered.length);
    if (sorted.length > 0) {
      console.log('First data date:', sorted[0].date);
      console.log('Last data date:', sorted[sorted.length - 1].date);
    }
    if (filtered.length > 0) {
      console.log('First filtered date:', filtered[0].date);
      console.log('Last filtered date:', filtered[filtered.length - 1].date);
    }
    // どのデータが除外されたかを表示
    const excluded = sorted.filter(item => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate < startDate;
    });
    console.log('Excluded data points:', excluded.length);
    if (excluded.length > 0) {
      console.log('Excluded dates:', excluded.map(item => item.date));
    }
    console.log('==============================');
    
    return { sortedData: sorted, filteredData: filtered };
  }, [data, selectedPeriod]);

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
        <h3>データがありません</h3>
        <p>「価格更新」または「履歴再構築」を実行してください</p>
      </div>
    );
  }

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

  // 最新の評価額（リアルタイムがあればそれを、なければフィルタリングされたデータの最新）
  const latestFilteredData = filteredData[filteredData.length - 1];
  const totalValueJPY = currentValue ? currentValue.totalJPY : (latestFilteredData?.totalValueJPY || 0);
  const totalValueUSD = currentValue ? currentValue.totalUSD : (latestFilteredData?.totalValueUSD || 0);

  // 開始時との比較（フィルタリングされたデータの最初と比較）
  const firstSnapshot = filteredData[0];
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

  // 期間選択ボタンのスタイル
  const getPeriodButtonStyle = (period) => ({
    padding: '10px 20px',
    border: selectedPeriod === period ? '2px solid #667eea' : '1px solid #ddd',
    background: selectedPeriod === period ? '#667eea' : 'white',
    color: selectedPeriod === period ? 'white' : '#333',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: selectedPeriod === period ? 'bold' : 'normal',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none'
  });

  return (
    <div>
      {/* デバッグ情報 */}
      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '13px'
      }}>
        <strong>🐛 デバッグ情報:</strong><br/>
        選択期間: {selectedPeriod} | 
        全データ数: {sortedData.length} | 
        フィルター後: {filteredData.length} | 
        グラフに渡されたデータ数: {filteredData.length}
        {filteredData.length > 0 && (
          <>
            <br/>
            最初の日付: {filteredData[0].date} | 
            最後の日付: {filteredData[filteredData.length - 1].date}
          </>
        )}
        {sortedData.length === filteredData.length && selectedPeriod !== 'all' && (
          <div style={{ marginTop: '10px', color: '#856404' }}>
            ⚠️ 注意: 全データが選択期間内に収まっています。より長期間のデータがあれば、期間による違いが表示されます。
          </div>
        )}
      </div>

      {/* 期間選択ボタン */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          style={getPeriodButtonStyle('30d')}
          onClick={() => {
            console.log('Button clicked: 30d');
            setSelectedPeriod('30d');
            console.log('State should be updated to: 30d');
          }}
          onMouseEnter={(e) => {
            if (selectedPeriod !== '30d') {
              e.target.style.background = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedPeriod !== '30d') {
              e.target.style.background = 'white';
            }
          }}
        >
          過去30日
        </button>
        <button
          style={getPeriodButtonStyle('1y')}
          onClick={() => {
            console.log('Button clicked: 1y');
            setSelectedPeriod('1y');
            console.log('State should be updated to: 1y');
          }}
          onMouseEnter={(e) => {
            if (selectedPeriod !== '1y') {
              e.target.style.background = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedPeriod !== '1y') {
              e.target.style.background = 'white';
            }
          }}
        >
          過去1年
        </button>
        <button
          style={getPeriodButtonStyle('ytd')}
          onClick={() => {
            console.log('Button clicked: ytd');
            setSelectedPeriod('ytd');
            console.log('State should be updated to: ytd');
          }}
          onMouseEnter={(e) => {
            if (selectedPeriod !== 'ytd') {
              e.target.style.background = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedPeriod !== 'ytd') {
              e.target.style.background = 'white';
            }
          }}
        >
          年初来
        </button>
        <button
          style={getPeriodButtonStyle('all')}
          onClick={() => {
            console.log('Button clicked: all');
            setSelectedPeriod('all');
            console.log('State should be updated to: all');
          }}
          onMouseEnter={(e) => {
            if (selectedPeriod !== 'all') {
              e.target.style.background = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedPeriod !== 'all') {
              e.target.style.background = 'white';
            }
          }}
        >
          全期間
        </button>
      </div>

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
            color: 'white'
          }}>
            {isPositive ? '+' : ''}¥{Math.round(change).toLocaleString()}
          </div>
          <div style={{ 
            fontSize: '16px', 
            marginTop: '4px',
            color: 'white'
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
            {filteredData.length}日分
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
            {new Date(firstSnapshot.date).toLocaleDateString('ja-JP')} 〜
          </div>
        </div>
      </div>

      {/* チャート */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={filteredData}
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
            ¥{Math.round(Math.max(...filteredData.map(d => d.totalValueJPY))).toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>最低評価額</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
            ¥{Math.round(Math.min(...filteredData.map(d => d.totalValueJPY))).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;