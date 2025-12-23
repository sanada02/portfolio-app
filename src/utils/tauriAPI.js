// src/utils/tauriAPI.js - Tauri版のAPI呼び出し
import { invoke } from '@tauri-apps/api/core';

// 環境判定
const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__;

// Yahoo Finance プロキシ（Tauri版）
const fetchYahooFinanceTauri = async (params) => {
  try {
    console.log('🔧 Tauri経由でYahoo Finance APIを呼び出し:', params);

    // Rustの構造体に合わせてパラメータを構築
    // undefinedの場合はフィールドを含めない（RustのOption::Noneに対応）
    const rustParams = {
      symbol: params.symbol
    };

    if (params.period1) rustParams.period1 = params.period1;
    if (params.period2) rustParams.period2 = params.period2;
    if (params.interval) rustParams.interval = params.interval;
    if (params.range) rustParams.range = params.range;

    const result = await invoke('fetch_yahoo_finance', { params: rustParams });

    console.log('✓ Tauri経由でデータ取得成功');
    return result;
  } catch (error) {
    console.error('❌ Tauri API呼び出しエラー:', error);
    throw error;
  }
};

// 投資信託プロキシ（Tauri版）
const fetchFundDataTauri = async (params) => {
  try {
    console.log('🔧 Tauri経由で投資信託データを呼び出し:', params);

    const result = await invoke('fetch_fund_data', {
      params: {
        isinCd: params.isinCd,
        associFundCd: params.associFundCd
      }
    });

    console.log('✓ Tauri経由で投資信託データ取得成功');
    return result;
  } catch (error) {
    console.error('❌ Tauri 投資信託API呼び出しエラー:', error);
    throw error;
  }
};

// Yahoo Finance プロキシ（従来のHTTP版）
const fetchYahooFinanceHttp = async (params) => {
  const { symbol, period1, period2, interval, range } = params;

  let url = `http://localhost:3001/api/yahoo?symbol=${symbol}`;

  if (period1 && period2) {
    url += `&period1=${period1}&period2=${period2}&interval=${interval || '1d'}`;
  } else {
    url += `&interval=${interval || '1d'}&range=${range || '1d'}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();
};

// 投資信託プロキシ（従来のHTTP版）
const fetchFundDataHttp = async (params) => {
  const { isinCd, associFundCd } = params;

  const url = `http://localhost:3001/api/fund?isinCd=${isinCd}&associFundCd=${associFundCd}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.text();
};

// 統一APIインターフェース
export const fetchYahooFinance = async (params) => {
  console.log(`📍 環境: ${isTauri ? 'Tauri' : 'Web'}`);
  if (isTauri) {
    return await fetchYahooFinanceTauri(params);
  } else {
    return await fetchYahooFinanceHttp(params);
  }
};

export const fetchFundData = async (params) => {
  if (isTauri) {
    return await fetchFundDataTauri(params);
  } else {
    return await fetchFundDataHttp(params);
  }
};
