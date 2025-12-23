// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct YahooFinanceParams {
    symbol: String,
    period1: Option<String>,
    period2: Option<String>,
    interval: Option<String>,
    range: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FundParams {
    #[serde(rename = "isinCd")]
    isin_cd: String,
    #[serde(rename = "associFundCd")]
    assoc_fund_cd: String,
}

// Yahoo Finance プロキシコマンド
#[tauri::command]
async fn fetch_yahoo_finance(params: YahooFinanceParams) -> Result<serde_json::Value, String> {
    let mut url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?",
        params.symbol
    );

    if let (Some(p1), Some(p2)) = (params.period1, params.period2) {
        let interval = params.interval.unwrap_or_else(|| "1d".to_string());
        url.push_str(&format!("period1={}&period2={}&interval={}", p1, p2, interval));
    } else {
        let interval = params.interval.unwrap_or_else(|| "1d".to_string());
        let range = params.range.unwrap_or_else(|| "1d".to_string());
        url.push_str(&format!("interval={}&range={}", interval, range));
    }

    println!("🌐 Yahoo Finance リクエスト: {}", url);

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("クライアント構築エラー: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            println!("❌ リクエストエラー: {}", e);
            format!("リクエストエラー: {}", e)
        })?;

    let status = response.status();
    println!("📡 レスポンスステータス: {}", status);

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "不明なエラー".to_string());
        println!("❌ HTTPエラー: {} - {}", status, error_text);
        return Err(format!("HTTP {}: {}", status, error_text));
    }

    let data = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| {
            println!("❌ JSONパースエラー: {}", e);
            format!("JSONパースエラー: {}", e)
        })?;

    println!("✓ Yahoo Finance データ取得成功");
    Ok(data)
}

// 投資信託プロキシコマンド（Shift_JIS対応）
#[tauri::command]
async fn fetch_fund_data(params: FundParams) -> Result<String, String> {
    let url = format!(
        "https://toushin-lib.fwg.ne.jp/FdsWeb/FDST030000/csv-file-download?isinCd={}&associFundCd={}",
        params.isin_cd, params.assoc_fund_cd
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("リクエストエラー: {}", e))?;

    // バイナリデータとして取得
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("レスポンス読み込みエラー: {}", e))?;

    // Shift_JIS から UTF-8 に変換
    let (decoded, _, had_errors) = encoding_rs::SHIFT_JIS.decode(&bytes);

    if had_errors {
        return Err("文字エンコーディングエラーが発生しました".to_string());
    }

    Ok(decoded.into_owned())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            fetch_yahoo_finance,
            fetch_fund_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
