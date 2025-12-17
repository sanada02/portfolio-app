// src/components/PerformanceChart.jsx (期間選択機能追加版)
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const PerformanceChart = ({ data, portfolio, rawPortfolio, exchangeRate, sellHistory = [] }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [showExchangeRate, setShowExchangeRate] = useState(false);
  const [showProfit, setShowProfit] = useState(false);
  const [showPortfolioValue, setShowPortfolioValue] = useState(true);
  const [activeTab, setActiveTab] = useState('total');  // ← この行が必要
  const [selectedAssets, setSelectedAssets] = useState([]);  // ← この行が必要
  const [selectedTags, setSelectedTags] = useState([]);  // ← この行が必要
  
  // getTradeDatesで sellHistory の代わりに loadedSellHistory を使用

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

  // 銘柄別・タグ別でフィルタリングされたデータを計算
  const viewFilteredData = useMemo(() => {
    if (activeTab === 'total') {
      return filteredData;
    }
    
    if (!filteredData || filteredData.length === 0) {
      return [];
    }
    
    // 銘柄別・タグ別の場合は、各スナップショットに銘柄ごとのデータを追加
    return filteredData.map(snapshot => {
      if (!snapshot.assetBreakdown) {
        return snapshot;
      }
      
      let totalValueJPY = 0;
      let totalValueUSD = 0;
      const breakdown = {};
      const assetValues = {}; // 各銘柄の評価額
      const tagValues = {}; // 各タグの評価額
      
      Object.values(snapshot.assetBreakdown).forEach(asset => {
        let shouldInclude = false;
        
        if (activeTab === 'byAsset') {
          shouldInclude = selectedAssets.length === 0 || selectedAssets.includes(asset.id);
        } else if (activeTab === 'byTag') {
          shouldInclude = selectedTags.length === 0 || 
            (asset.tags && asset.tags.some(tag => selectedTags.includes(tag)));
        }
        
        if (shouldInclude) {
          totalValueJPY += asset.valueJPY;
          totalValueUSD += asset.valueUSD;
          breakdown[asset.type] = (breakdown[asset.type] || 0) + asset.valueJPY;
          
          // 銘柄別の評価額を記録
          if (activeTab === 'byAsset') {
            assetValues[asset.id] = asset.valueJPY;
          }
          
          // タグ別の評価額を記録
          if (activeTab === 'byTag' && asset.tags) {
            asset.tags.forEach(tag => {
              if (selectedTags.length === 0 || selectedTags.includes(tag)) {
                tagValues[tag] = (tagValues[tag] || 0) + asset.valueJPY;
              }
            });
          }
        }
      });
      
      return {
        ...snapshot,
        totalValueJPY,
        totalValueUSD,
        breakdown,
        assetValues, // 銘柄ごとの評価額
        tagValues // タグごとの評価額
      };
    })
    .filter(snapshot => {
      // 銘柄別・タグ別の場合、評価額0円のスナップショットを除外
      if (activeTab === 'byAsset' || activeTab === 'byTag') {
        return snapshot.totalValueJPY > 0;
      }
      return true; // 全体タブの場合はすべて含める
    });
  }, [filteredData, activeTab, selectedAssets, selectedTags]);

  // 最新の評価額と損益の計算（useMemoを早期リターンの前に）
  const { totalValueJPY, totalValueUSD, change, changePercent, isPositive, initialValue, firstSnapshot, chartData, latestExchangeRate } = useMemo(() => {
    if (!data || data.length === 0 || viewFilteredData.length === 0) {
      return {
        totalValueJPY: 0,
        totalValueUSD: 0,
        change: 0,
        changePercent: 0,
        isPositive: false,
        initialValue: 0,
        firstSnapshot: null,
        chartData: [],
        latestExchangeRate: exchangeRate
      };
    }

    // 🔥 修正: viewFilteredDataから現在の評価額を取得
    const latestFilteredData = viewFilteredData[viewFilteredData.length - 1];
    
    // リアルタイム評価額の計算（タブに応じてフィルタリング）
    let calcTotalJPY = 0;
    let calcTotalUSD = 0;
    
    if (portfolio && portfolio.length > 0) {
      if (activeTab === 'total') {
        // 全体タブ: 全資産を計算
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
      } else if (activeTab === 'byAsset') {
        // 銘柄別タブ: 選択された銘柄のみ計算
        const assetsToShow = selectedAssets.length > 0 ? selectedAssets : portfolio.map(a => a.id);
        portfolio.filter(asset => assetsToShow.includes(asset.id)).forEach(asset => {
          const currentPrice = asset.currentPrice || asset.purchasePrice;
          const value = currentPrice * asset.activeQuantity;
          
          if (asset.currency === 'USD') {
            calcTotalUSD += value;
            calcTotalJPY += value * exchangeRate;
          } else {
            calcTotalJPY += value;
          }
        });
      } else if (activeTab === 'byTag') {
        // タグ別タブ: 選択されたタグを持つ銘柄のみ計算
        const tagsToShow = selectedTags.length > 0 ? selectedTags : Array.from(new Set(portfolio.flatMap(a => a.tags || [])));
        portfolio.filter(asset => asset.tags && asset.tags.some(tag => tagsToShow.includes(tag))).forEach(asset => {
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
    }

    // スナップショットデータと現在のリアルタイムデータを比較
    const finalTotalJPY = (portfolio && portfolio.length > 0) ? calcTotalJPY : (latestFilteredData?.totalValueJPY || 0);
    const finalTotalUSD = (portfolio && portfolio.length > 0) ? calcTotalUSD : (latestFilteredData?.totalValueUSD || 0);

    const firstSnap = viewFilteredData[0];
    const initValue = firstSnap?.totalValueJPY || 0;
    const calcChange = finalTotalJPY - initValue;
    const calcChangePercent = initValue > 0 ? ((calcChange / initValue) * 100).toFixed(2) : 0;
    const calcIsPositive = calcChange >= 0;

    // 最新の為替レートをスナップショットから取得
    const snapshotExchangeRate = latestFilteredData?.exchangeRate || exchangeRate;

    // グラフ用のデータに損益を追加
    const calcChartData = viewFilteredData.map(item => ({
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
  }, [data, viewFilteredData, portfolio, exchangeRate, activeTab, selectedAssets, selectedTags]);

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

  // 売買日を取得する関数（portfolio + sellHistory）
  // 売買日を取得する関数（portfolio + sellHistory）
  const getTradeDates = useMemo(() => {
    
    const tradeDates = new Set();
    
    if (!portfolio || portfolio.length === 0) {
      return [];
    }
    
    // フィルタリングされた銘柄のIDセットを作成
    let filteredAssets = portfolio;
    if (activeTab === 'byAsset' && selectedAssets.length > 0) {
      filteredAssets = portfolio.filter(asset => selectedAssets.includes(asset.id));
    } else if (activeTab === 'byTag' && selectedTags.length > 0) {
      filteredAssets = portfolio.filter(asset => 
        asset.tags && asset.tags.some(tag => selectedTags.includes(tag))
      );
    }
    
    // フィルタリングされた銘柄のIDセット
    const filteredAssetIds = new Set(filteredAssets.map(a => a.id));
    
    // また、統合されている場合はassetIdsも含める
    filteredAssets.forEach(asset => {
      if (asset.assetIds && Array.isArray(asset.assetIds)) {
        asset.assetIds.forEach(id => filteredAssetIds.add(id));
      }
    });
    
    // 1. rawPortfolio（統合前の全レコード）から全購入日を取得
    const sourcePortfolio = rawPortfolio || portfolio;
    sourcePortfolio.forEach(asset => {
      // フィルタリングされた銘柄のみ
      if (filteredAssetIds.has(asset.id)) {
        if (asset.purchaseDate) {
          tradeDates.add(asset.purchaseDate);
        }
      }
    });
    
    // 2. sellHistoryから売却日を取得
    if (sellHistory && Array.isArray(sellHistory)) {
      sellHistory.forEach(sale => {
        // フィルタリングされた銘柄のみ
        if (filteredAssetIds.has(sale.originalAssetId)) {
          if (sale.sellDate) {
            tradeDates.add(sale.sellDate);
          }
        }
      });
    }
    
    const sortedDates = Array.from(tradeDates).sort();
    
    return sortedDates;
  }, [portfolio, rawPortfolio, sellHistory, activeTab, selectedAssets, selectedTags]);

  // 疑似CAGR計算関数（区間分割・時間加重リターン）
  const calculatePseudoCAGR = (chartData, tradeDates, startDate, endDate) => {
    if (!chartData || chartData.length < 2) {
      return null;
    }

    // 期間内の売買日のみを抽出（境界を含む）
    const tradesInPeriod = tradeDates.filter(tradeDate => {
      const date = new Date(tradeDate);
      return date >= startDate && date <= endDate;
    }).map(d => new Date(d)).sort((a, b) => a - b);

    // 売買がない場合はnullを返す
    if (tradesInPeriod.length === 0) {
      return null;
    }

    // 日付から評価額を取得する関数（直近過去日で補完）
    const getValueAtDate = (date) => {
      const dateStr = date.toISOString().split('T')[0];
      
      // 完全一致を探す
      const exact = chartData.find(d => d.date === dateStr);
      if (exact) return exact.totalValueJPY;
      
      // 直近過去日を探す
      const pastData = chartData
        .filter(d => new Date(d.date) <= date)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return pastData.length > 0 ? pastData[0].totalValueJPY : 0;
    };

    // 区切り点を生成
    // 売買日の前日終値と売買日当日（売買後）で区間を分割
    const breakpoints = [];
    
    // 最初の売買日（初回購入日）を実質的な開始日とする
    // 購入前の期間は保有がないため計算に含めない
    
    tradesInPeriod.forEach((tradeDay, index) => {
      // 売買日の前日を区間終了日とする
      const dayBefore = new Date(tradeDay);
      dayBefore.setDate(dayBefore.getDate() - 1);
      
      // 前日が期間開始日以降かつ、前の売買日以降の場合のみ追加
      if (dayBefore >= startDate) {
        // 前の売買日と連続していないかチェック
        if (index === 0 || dayBefore > tradesInPeriod[index - 1]) {
          breakpoints.push(dayBefore);
        }
      }
      
      // 売買日を次の区間の開始日とする
      breakpoints.push(tradeDay);
    });
    
    // 最後の売買日より後に期間終了日がある場合は追加
    const lastTrade = tradesInPeriod[tradesInPeriod.length - 1];
    if (endDate > lastTrade) {
      breakpoints.push(endDate);
    } else if (endDate.getTime() !== lastTrade.getTime()) {
      // 終了日が最後の売買日と異なる場合は追加
      breakpoints.push(endDate);
    }
    
    // 重複を削除してソート
    const uniqueBreakpoints = [...new Set(breakpoints.map(d => d.getTime()))]
      .sort((a, b) => a - b)
      .map(t => new Date(t));

    // 各区間のリターンを計算
    const segments = [];
    let totalMultiplier = 1;
    let firstValidDate = null;
    let validSegmentCount = 0;

    for (let i = 0; i < uniqueBreakpoints.length - 1; i++) {
      const segmentStart = uniqueBreakpoints[i];
      const segmentEnd = uniqueBreakpoints[i + 1];
      
      const startValue = getValueAtDate(segmentStart);
      const endValue = getValueAtDate(segmentEnd);
      
      // 期間が1日以下の場合はスキップ（連続売買の中間区間）
      const daysDiff = (segmentEnd - segmentStart) / (24 * 60 * 60 * 1000);
      
      // 1日以下の区間はスキップ
      if (daysDiff <= 1) {
        continue;
      }
      
      if (startValue > 0) {
        if (firstValidDate === null) {
          firstValidDate = segmentStart;
        }
        
        const segmentReturn = (endValue - startValue) / startValue;
        const multiplier = 1 + segmentReturn;
        totalMultiplier *= multiplier;
        validSegmentCount++;
        
        segments.push({
          start: segmentStart,
          end: segmentEnd,
          startValue,
          endValue,
          return: segmentReturn,
          multiplier
        });      
      } 
    }

    // 有効な区間がない場合
    if (validSegmentCount === 0 || firstValidDate === null) {
      return null;
    }

    // 有効な区間が1つだけの場合は通常のCAGRと同じになるので、nullを返す
    if (validSegmentCount === 1) {
      return null;
    }

    // 初回有効日から終了日までの年数
    const days = (endDate - firstValidDate) / (24 * 60 * 60 * 1000);
    const years = days / 365.25;

    if (years <= 0) {
      return null;
    }

    // 疑似CAGR = total_multiplier^(1 / years) - 1
    const pseudoCAGR = (Math.pow(totalMultiplier, 1 / years) - 1) * 100;

    return {
      pseudoCAGR,
      segments,
      totalMultiplier,
      years,
      firstValidDate,
      validSegmentCount
    };
  };

  // CAGRとMDDを計算
  const { cagr, mdd, pseudoCagr, realCagr, hasTrades, tradeInfo } = useMemo(() => {
    if (!chartData || chartData.length < 2 || initialValue === 0) {
      return { 
        cagr: 0, 
        mdd: 0, 
        pseudoCagr: null, 
        realCagr: 0, 
        hasTrades: false,
        tradeInfo: null 
      };
    }

    const startDate = new Date(chartData[0].date);
    const endDate = new Date(chartData[chartData.length - 1].date);
    
    // 🔥 修正: 期間内に売買があるかチェック（境界を含む）
    const tradesInPeriod = getTradeDates.filter(tradeDate => {
      const date = new Date(tradeDate);
      return date >= startDate && date <= endDate;
    });
    const hasTradesInPeriod = tradesInPeriod.length > 0;  

    // 通常のCAGR計算
    const startValue = initialValue;
    const endValue = totalValueJPY;
    const days = (endDate - startDate) / (24 * 60 * 60 * 1000);
    const years = days / 365.25;
    
    let calculatedRealCagr = 0;
    if (startValue > 0 && endValue > 0 && years > 0) {
      calculatedRealCagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
    }

    // 疑似CAGR計算
    const pseudoResult = hasTradesInPeriod 
      ? calculatePseudoCAGR(chartData, getTradeDates, startDate, endDate)
      : null;
    const calculatedPseudoCagr = pseudoResult ? pseudoResult.pseudoCAGR : null;

    // 表示用CAGR（売買があり疑似CAGRが計算できた場合のみ疑似CAGRを使用）
    const displayCagr = calculatedPseudoCagr !== null 
      ? calculatedPseudoCagr 
      : calculatedRealCagr;

    // MDD計算
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
      cagr: displayCagr,
      mdd: maxDrawdown,
      pseudoCagr: calculatedPseudoCagr,
      realCagr: calculatedRealCagr,
      hasTrades: hasTradesInPeriod,
      tradeInfo: pseudoResult ? {
        segments: pseudoResult.segments,
        totalMultiplier: pseudoResult.totalMultiplier,
        years: pseudoResult.years,
        firstValidDate: pseudoResult.firstValidDate,
        tradeDatesInPeriod: tradesInPeriod,
        validSegmentCount: pseudoResult.validSegmentCount
      } : null
    };
  }, [chartData, initialValue, totalValueJPY, getTradeDates]);

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
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            {new Date(data.date).toLocaleDateString('ja-JP')}
          </p>
          
          {activeTab === 'total' && (
            <>
              <p style={{ color: '#667eea', marginBottom: '4px' }}>
                評価額: ¥{Math.round(data.totalValueJPY).toLocaleString()}
              </p>
              {data.totalValueUSD > 0 && (
                <p style={{ color: '#764ba2', fontSize: '13px', marginBottom: '4px' }}>
                  USD: ${Math.round(data.totalValueUSD).toLocaleString()}
                </p>
              )}
            </>
          )}
          
          {activeTab === 'byAsset' && data.assetValues && (
            <>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>
                銘柄別評価額:
              </p>
              {Object.entries(data.assetValues).map(([assetId, value]) => {
                const asset = portfolio.find(a => a.id === assetId);
                return asset ? (
                  <p key={assetId} style={{ fontSize: '13px', marginBottom: '3px' }}>
                    {asset.name}: ¥{Math.round(value).toLocaleString()}
                  </p>
                ) : null;
              })}
            </>
          )}
          
          {activeTab === 'byTag' && data.tagValues && (
            <>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>
                タグ別評価額:
              </p>
              {Object.entries(data.tagValues).map(([tag, value]) => (
                <p key={tag} style={{ fontSize: '13px', marginBottom: '3px' }}>
                  {tag}: ¥{Math.round(value).toLocaleString()}
                </p>
              ))}
            </>
          )}
          
          {showProfit && data.profit !== undefined && (
            <p style={{ color: data.profit >= 0 ? '#10b981' : '#ef4444', fontSize: '13px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
              損益: {data.profit >= 0 ? '+' : ''}¥{Math.round(data.profit).toLocaleString()}
            </p>
          )}
          
          {showExchangeRate && data.exchangeRate && (
            <p style={{ color: '#f59e0b', fontSize: '13px', marginTop: '4px' }}>
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
            {/* タブ選択 */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'total' ? '3px solid #667eea' : 'none',
            color: activeTab === 'total' ? '#667eea' : '#6b7280',
            fontWeight: activeTab === 'total' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '15px',
            transition: 'all 0.2s'
          }}
          onClick={() => setActiveTab('total')}
        >
          全体
        </button>
        <button
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'byAsset' ? '3px solid #667eea' : 'none',
            color: activeTab === 'byAsset' ? '#667eea' : '#6b7280',
            fontWeight: activeTab === 'byAsset' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '15px',
            transition: 'all 0.2s'
          }}
          onClick={() => setActiveTab('byAsset')}
        >
          銘柄別
        </button>
        <button
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'byTag' ? '3px solid #667eea' : 'none',
            color: activeTab === 'byTag' ? '#667eea' : '#6b7280',
            fontWeight: activeTab === 'byTag' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '15px',
            transition: 'all 0.2s'
          }}
          onClick={() => setActiveTab('byTag')}
        >
          タグ別
        </button>
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

      {/* 銘柄選択（銘柄別タブの場合のみ表示） */}
      {activeTab === 'byAsset' && portfolio && portfolio.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '10px', color: '#333' }}>
            表示する銘柄を選択: {selectedAssets.length > 0 && `(${selectedAssets.length}銘柄選択中)`}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {portfolio.map(asset => (
              <label
                key={asset.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: selectedAssets.includes(asset.id) ? '#dbeafe' : 'white',
                  border: `2px solid ${selectedAssets.includes(asset.id) ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: selectedAssets.includes(asset.id) ? '600' : '400',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedAssets.includes(asset.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAssets([...selectedAssets, asset.id]);
                    } else {
                      setSelectedAssets(selectedAssets.filter(id => id !== asset.id));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                {asset.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* タグ選択（タグ別タブの場合のみ表示） */}
      {activeTab === 'byTag' && portfolio && portfolio.length > 0 && (() => {
        const allTags = Array.from(new Set(portfolio.flatMap(a => a.tags || [])));
        return allTags.length > 0 ? (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '10px', color: '#333' }}>
              表示するタグを選択: {selectedTags.length > 0 && `(${selectedTags.length}タグ選択中)`}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {allTags.map(tag => (
                <label
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: selectedTags.includes(tag) ? '#dcfce7' : 'white',
                    border: `2px solid ${selectedTags.includes(tag) ? '#10b981' : '#e5e7eb'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: selectedTags.includes(tag) ? '600' : '400',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTags([...selectedTags, tag]);
                      } else {
                        setSelectedTags(selectedTags.filter(t => t !== tag));
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>
        ) : null;
      })()}

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
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>
            投資パフォーマンス
            {pseudoCagr !== null && <span style={{ fontSize: '11px', marginLeft: '6px' }}>（疑似CAGR）</span>}
          </div>
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
          
          {/* 売買情報（クリックで表示） */}
          {hasTrades && tradeInfo && (
            <div 
              onClick={() => {
                const details = document.getElementById('cagr-details');
                if (details) {
                  details.style.display = details.style.display === 'none' ? 'block' : 'none';
                }
              }}
              style={{ 
                marginTop: '10px', 
                paddingTop: '10px', 
                borderTop: '1px solid rgba(255,255,255,0.3)',
                fontSize: '11px',
                opacity: 0.9,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>📊 期間内売買: {tradeInfo.tradeDatesInPeriod.length}件</span>
                <span style={{ fontSize: '10px' }}>（クリックで詳細）</span>
              </div>
              <div id="cagr-details" style={{ display: 'none', marginTop: '6px' }}>
                {pseudoCagr !== null && (
                  <div style={{ marginBottom: '3px' }}>
                    疑似CAGR: {pseudoCagr >= 0 ? '+' : ''}{pseudoCagr.toFixed(2)}%
                  </div>
                )}
                {realCagr !== 0 && (
                  <div style={{ marginBottom: '3px' }}>
                    通常CAGR: {realCagr >= 0 ? '+' : ''}{realCagr.toFixed(2)}%
                  </div>
                )}
                {tradeInfo.validSegmentCount && (
                  <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.8 }}>
                    計算区間: {tradeInfo.validSegmentCount}区間
                  </div>
                )}
                <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.8 }}>
                  ※疑似CAGR: 売買を考慮した時間加重リターン
                </div>
              </div>
            </div>
          )}
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
          {/* 全体タブの場合 */}
          {activeTab === 'total' && showPortfolioValue && (
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
          
          {/* 銘柄別タブの場合 */}
          {activeTab === 'byAsset' && showPortfolioValue && (
            <>
              {(selectedAssets.length > 0 ? selectedAssets : portfolio.map(a => a.id)).map((assetId, index) => {
                const asset = portfolio.find(a => a.id === assetId);
                if (!asset) return null;
                
                // 色を動的に生成
                const colors = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                const color = colors[index % colors.length];
                
                return (
                  <Line
                    key={assetId}
                    yAxisId="left"
                    type="linear"
                    dataKey={`assetValues.${assetId}`}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name={asset.name}
                  />
                );
              })}
            </>
          )}
          
          {/* タグ別タブの場合 */}
          {activeTab === 'byTag' && showPortfolioValue && (
            <>
              {(() => {
                const allTags = Array.from(new Set(portfolio.flatMap(a => a.tags || [])));
                const tagsToShow = selectedTags.length > 0 ? selectedTags : allTags;
                const colors = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                
                return tagsToShow.map((tag, index) => (
                  <Line
                    key={tag}
                    yAxisId="left"
                    type="linear"
                    dataKey={`tagValues.${tag}`}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name={tag}
                  />
                ));
              })()}
            </>
          )}
          {activeTab === 'total' && showProfit && (
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