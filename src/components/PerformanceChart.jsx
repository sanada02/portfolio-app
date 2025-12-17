// src/components/PerformanceChart.jsx (期間選択機能追加版)
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const PerformanceChart = ({ data, portfolio, exchangeRate }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d'); // デフォルトは30日
  const [showExchangeRate, setShowExchangeRate] = useState(false); // 為替レート表示
  const [showProfit, setShowProfit] = useState(false); // 損益表示
  const [showPortfolioValue, setShowPortfolioValue] = useState(true); // ポートフォリオ評価額表示

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
      return itemDate >= startDate;
    });
    
    return { sortedData: sorted, filteredData: filtered };
  }, [data, selectedPeriod]);

  // 最新の評価額と損益の計算（useMemoを早期リターンの前に）
  const { totalValueJPY, totalValueUSD, change, changePercent, isPositive, initialValue, firstSnapshot, chartData, latestExchangeRate } = useMemo(() => {
    // データがない場合のデフォルト値
    if (!data || data.length === 0 || filteredData.length === 0) {
      return {
        totalValueJPY: 0,
        totalValueUSD: 0,
        change: 0,
        changePercent: 0,
        isPositive: false,
        initialValue: 0,
        firstSnapshot: null,
        chartData: [],
        latestExchangeRate: exchangeRate // propsから取得した値をデフォルトとして使用
      };
    }

    // 現在のリアルタイム評価額を計算
    let calcTotalJPY = 0;
    let calcTotalUSD = 0;
    
    if (portfolio && portfolio.length > 0) {
      portfolio.forEach(asset => {
        const currentPrice = asset.currentPrice || asset.purchasePrice;
        const value = currentPrice * asset.activeQuantity;
        
        if (asset.currency === 'USD') {
          calcTotalUSD += value;
          calcTotalJPY += value * exchangeRate;
        } else {
          calcTotalJPY += value;
        }
      });
    }

    const latestFilteredData = filteredData[filteredData.length - 1];
    const finalTotalJPY = (portfolio && portfolio.length > 0) ? calcTotalJPY : (latestFilteredData?.totalValueJPY || 0);
    const finalTotalUSD = (portfolio && portfolio.length > 0) ? calcTotalUSD : (latestFilteredData?.totalValueUSD || 0);

    // 最新の為替レートをスナップショットから取得（なければpropsの値を使用）
    const snapshotExchangeRate = latestFilteredData?.exchangeRate || exchangeRate;

    const firstSnap = filteredData[0];
    const initValue = firstSnap?.totalValueJPY || 0;
    const calcChange = finalTotalJPY - initValue;
    const calcChangePercent = initValue > 0 ? ((calcChange / initValue) * 100).toFixed(2) : 0;
    const calcIsPositive = calcChange >= 0;

    // グラフ用のデータに損益を追加
    const calcChartData = filteredData.map(item => ({
      ...item,
      profit: item.totalValueJPY - initValue,
      exchangeRate: item.exchangeRate || null
    }));

    return {
      totalValueJPY: finalTotalJPY,
      totalValueUSD: finalTotalUSD,
      change: calcChange,
      changePercent: calcChangePercent,
      isPositive: calcIsPositive,
      initialValue: initValue,
      firstSnapshot: firstSnap,
      chartData: calcChartData,
      latestExchangeRate: snapshotExchangeRate
    };
  }, [data, filteredData, portfolio, exchangeRate]);

  // 為替レートのY軸範囲を計算
  const exchangeRateRange = useMemo(() => {
    if (!showExchangeRate || chartData.length === 0) {
      return { min: 140, max: 160 };
    }
    
    const rates = chartData
      .map(d => d.exchangeRate)
      .filter(rate => rate != null && rate > 0);
    
    if (rates.length === 0) {
      return { min: 140, max: 160 };
    }
    
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const range = maxRate - minRate;
    const padding = range > 0 ? range * 0.1 : 5; // 10%のパディング、または最低5円
    
    return {
      min: Math.floor(minRate - padding),
      max: Math.ceil(maxRate + padding)
    };
  }, [chartData, showExchangeRate]);

  // CAGRとMDDを計算
  const { cagr, mdd } = useMemo(() => {
    if (!chartData || chartData.length < 2 || initialValue === 0) {
      return { cagr: 0, mdd: 0 };
    }

    // CAGR計算
    const startValue = initialValue;
    const endValue = totalValueJPY;
    const startDate = new Date(chartData[0].date);
    const endDate = new Date(chartData[chartData.length - 1].date);
    const years = (endDate - startDate) / (365.25 * 24 * 60 * 60 * 1000);
    
    let calculatedCagr = 0;
    if (years > 0 && startValue > 0) {
      calculatedCagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
    }

    // MDD（最大ドローダウン）計算
    let maxValue = chartData[0].totalValueJPY;
    let maxDrawdown = 0;
    
    for (const point of chartData) {
      if (point.totalValueJPY > maxValue) {
        maxValue = point.totalValueJPY;
      }
      const drawdown = ((point.totalValueJPY - maxValue) / maxValue) * 100;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      cagr: calculatedCagr,
      mdd: maxDrawdown
    };
  }, [chartData, initialValue, totalValueJPY]);

  // 全期間表示時は月次データに変換
  const displayData = useMemo(() => {
    if (selectedPeriod !== 'all' || chartData.length === 0) {
      return chartData;
    }

    // 月ごとにグループ化
    const monthlyData = {};
    
    chartData.forEach(item => {
      const date = new Date(item.date);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // 各月の最後のデータを保持
      if (!monthlyData[yearMonth] || item.date > monthlyData[yearMonth].date) {
        monthlyData[yearMonth] = item;
      }
    });

    // 月次データを配列に変換してソート
    return Object.values(monthlyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [chartData, selectedPeriod]);

  // 早期リターン（すべてのフックの後に）
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
        <h3>データがありません</h3>
        <p>「価格更新」または「履歴再構築」を実行してください</p>
      </div>
    );
  }

  // 日付フォーマット（期間に応じて年を表示）
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 全期間または1年表示の場合は年も表示
    if (selectedPeriod === 'all' || selectedPeriod === '1y') {
      const year = date.getFullYear();
      return `${year}/${month}/${day}`;
    }
    
    return `${month}/${day}`;
  };

  // 通貨フォーマット（日本語表記）
  const formatCurrency = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 100000000) { // 1億以上
      return `${(value / 100000000).toFixed(1)}億円`;
    } else if (absValue >= 10000) { // 1万以上
      return `${(value / 10000).toFixed(0)}万円`;
    }
    return `¥${Math.round(value).toLocaleString()}`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'white',
          padding: '15px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            {new Date(data.date).toLocaleDateString('ja-JP')}
          </p>
          <p style={{ color: '#667eea', marginBottom: '4px' }}>
            評価額: ¥{Math.round(data.totalValueJPY).toLocaleString()}
          </p>
          {data.totalValueUSD > 0 && (
            <p style={{ color: '#764ba2', fontSize: '13px', marginBottom: '4px' }}>
              USD: ${Math.round(data.totalValueUSD).toLocaleString()}
            </p>
          )}
          {showProfit && data.profit !== undefined && (
            <p style={{ color: data.profit >= 0 ? '#10b981' : '#ef4444', fontSize: '13px', marginBottom: '4px' }}>
              損益: {data.profit >= 0 ? '+' : ''}¥{Math.round(data.profit).toLocaleString()}
            </p>
          )}
          {showExchangeRate && data.exchangeRate && (
            <p style={{ color: '#f59e0b', fontSize: '13px' }}>
              為替: ¥{data.exchangeRate.toFixed(2)}/USD
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
            setSelectedPeriod('30d');
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
            setSelectedPeriod('1y');
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
            setSelectedPeriod('ytd');
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
            setSelectedPeriod('all');
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

      {/* グラフ表示オプション */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        padding: '15px',
        background: '#f8f9fa',
        borderRadius: '8px',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: '600', color: '#333', marginRight: '10px' }}>表示項目:</span>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          padding: '6px 12px',
          background: showPortfolioValue ? '#dbeafe' : 'white',
          border: `2px solid ${showPortfolioValue ? '#3b82f6' : '#e5e7eb'}`,
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: showPortfolioValue ? '600' : '400',
          color: showPortfolioValue ? '#1e40af' : '#6b7280',
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={showPortfolioValue}
            onChange={(e) => setShowPortfolioValue(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          評価額
        </label>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          padding: '6px 12px',
          background: showProfit ? '#dcfce7' : 'white',
          border: `2px solid ${showProfit ? '#10b981' : '#e5e7eb'}`,
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: showProfit ? '600' : '400',
          color: showProfit ? '#065f46' : '#6b7280',
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={showProfit}
            onChange={(e) => setShowProfit(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          損益
        </label>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          padding: '6px 12px',
          background: showExchangeRate ? '#fef3c7' : 'white',
          border: `2px solid ${showExchangeRate ? '#f59e0b' : '#e5e7eb'}`,
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: showExchangeRate ? '600' : '400',
          color: showExchangeRate ? '#92400e' : '#6b7280',
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={showExchangeRate}
            onChange={(e) => setShowExchangeRate(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          為替レート
        </label>
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
                レート: ¥{latestExchangeRate.toFixed(2)}/USD
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
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>期間損益</div>
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
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(240, 147, 251, 0.3)'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>投資パフォーマンス</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>CAGR</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
                {cagr >= 0 ? '+' : ''}{cagr.toFixed(2)}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>MDD</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
                {mdd.toFixed(2)}%
              </div>
            </div>
          </div>
          <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>年平均成長率 / 最大ドローダウン</span>
            <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
              {mdd !== 0 ? (cagr / Math.abs(mdd)).toFixed(2) : '∞'}
            </span>
          </div>
        </div>
      </div>

      {/* チャート */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={displayData}
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
            yAxisId="left"
            tickFormatter={formatCurrency}
            stroke="#666"
            style={{ fontSize: '12px' }}
          />
          {showExchangeRate && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#f59e0b"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `¥${value.toFixed(0)}`}
              domain={[exchangeRateRange.min, exchangeRateRange.max]}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => {
              if (value === 'totalValueJPY') return 'ポートフォリオ評価額';
              if (value === 'profit') return '損益';
              if (value === 'exchangeRate') return '為替レート (USD/JPY)';
              return value;
            }}
          />
          {/* 損益表示時に0円のベースラインを追加 */}
          {showProfit && (
            <ReferenceLine 
              yAxisId="left" 
              y={0} 
              stroke="#94a3b8" 
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: '±0円', position: 'right', fill: '#64748b', fontSize: 12 }}
            />
          )}
          {showPortfolioValue && (
            <Line
              yAxisId="left"
              type="linear"
              dataKey="totalValueJPY"
              stroke="#667eea"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name="ポートフォリオ評価額"
            />
          )}
          {showProfit && (
            <Line
              yAxisId="left"
              type="linear"
              dataKey="profit"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name="損益"
            />
          )}
          {showExchangeRate && (
            <Line
              yAxisId="right"
              type="linear"
              dataKey="exchangeRate"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name="為替レート (USD/JPY)"
            />
          )}
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
            ¥{Math.round(Math.max(...displayData.map(d => d.totalValueJPY))).toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>最低評価額</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
            ¥{Math.round(Math.min(...displayData.map(d => d.totalValueJPY))).toLocaleString()}
          </div>
        </div>
        {selectedPeriod === 'all' && (
          <div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>表示モード</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
              月次データ
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
              ({displayData.length}ヶ月分)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceChart;