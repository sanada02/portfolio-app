# ポートフォリオ管理アプリ

投資ポートフォリオを簡単に管理できるデスクトップ/Webアプリケーションです。株式、投資信託、ETF、仮想通貨などの資産を一元管理し、リアルタイムでパフォーマンスを可視化できます。

![Portfolio App](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite)
![Tauri](https://img.shields.io/badge/Tauri-2.9.1-FFC131?logo=tauri)

## 主な機能

### 資産管理
- 複数の資産タイプに対応（株式、投資信託、ETF、仮想通貨、その他）
- 複数通貨対応（日本円、米ドル）
- タグによる資産の分類・グループ化
- 購入・売却履歴の記録
- 配当金の管理

### データ分析
- リアルタイム価格の自動取得・更新
- パフォーマンス推移のグラフ表示
- 資産配分の円グラフ（種別、銘柄、タグ別）
- 期間比較（前日比、前週比、先月比、年初来）
- 配当累計の追跡

### データ管理
- バックアップ・リストア機能
- ローカルストレージによる安全なデータ保存
- 日次スナップショットの自動生成
- 価格履歴の再構築機能

## スクリーンショット

（アプリのスクリーンショットを追加することをお勧めします）

## 技術スタック

### フロントエンド
- **React 19.2** - UIフレームワーク
- **Vite 7.2** - 高速ビルドツール
- **Recharts 3.5** - グラフ・チャート描画
- **Lucide React** - アイコンライブラリ

### バックエンド
- **Tauri 2.9** - デスクトップアプリ化（Rust製）
- **Express.js** - 開発用プロキシサーバー
- **Dexie.js 4.2** - IndexedDBラッパー（ローカルデータベース）

### データソース
- Yahoo Finance API - 株式・ETF・為替レートの取得
- 投資信託ライブラリ - 日本の投資信託データ

## セットアップ

### 必要な環境

- Node.js 18以上
- npm または yarn

デスクトップアプリをビルドする場合は以下も必要です：
- Rust（最新版）
- システム依存のビルドツール（詳細は[Tauri公式ドキュメント](https://tauri.app/v2/guides/prerequisites/)を参照）

### インストール手順

1. リポジトリをクローン

```bash
git clone <your-repository-url>
cd portfolio-app
```

2. 依存パッケージをインストール

```bash
npm install
```

## 使い方

### Web版として起動

Web版として起動する場合、プロキシサーバーと開発サーバーの両方を起動する必要があります。

#### オプション1: 一括起動（推奨）

```bash
npm run dev:all
```

このコマンドは以下を同時に実行します：
- プロキシサーバー（ポート3001）
- Vite開発サーバー（ポート5173）

ブラウザで [http://localhost:5173](http://localhost:5173) を開いてください。

#### オプション2: 個別起動

ターミナルを2つ開いて、それぞれで以下を実行します：

```bash
# ターミナル1: プロキシサーバー起動
npm run proxy

# ターミナル2: 開発サーバー起動
npm run dev
```

### デスクトップアプリとして起動

Tauri環境では、プロキシサーバーは不要です（Rustバックエンドが代わりに機能します）。

```bash
npm run tauri:dev
```

このコマンドでデスクトップアプリが起動します。

### ビルド

#### Web版のビルド

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに出力されます。

プレビュー確認：

```bash
npm run preview
```

#### デスクトップアプリのビルド

```bash
npm run tauri:build
```

実行可能ファイルとインストーラーが `src-tauri/target/release/bundle/` に生成されます。

- Windows: `.msi` または `.exe`
- macOS: `.dmg` または `.app`
- Linux: `.deb` または `.AppImage`

## プロジェクト構造

```
portfolio-app/
├── src/
│   ├── components/          # Reactコンポーネント
│   │   ├── AddAssetModal.jsx          # 資産追加フォーム
│   │   ├── PerformanceChart.jsx       # パフォーマンスグラフ
│   │   ├── PortfolioTable.jsx         # 資産一覧テーブル
│   │   └── ...
│   ├── hooks/               # カスタムReactフック
│   │   └── usePortfolioHandlers.js
│   ├── utils/               # ユーティリティ関数
│   │   ├── database.js      # IndexedDB操作（価格履歴）
│   │   ├── storage.js       # LocalStorage操作（ポートフォリオ）
│   │   ├── priceAPI.js      # 価格データAPI呼び出し
│   │   ├── tauriAPI.js      # Tauri/Web環境の統一API
│   │   └── calculations.js  # 計算・集計関数
│   ├── App.jsx              # メインアプリケーション
│   └── main.jsx             # エントリーポイント
├── src-tauri/               # Tauriデスクトップアプリ
│   ├── src/
│   │   └── main.rs          # Rustバックエンド
│   ├── Cargo.toml           # Rust依存関係
│   └── tauri.conf.json      # Tauri設定
├── proxy-server.js          # Node.js開発用プロキシサーバー
├── package.json
├── vite.config.js
└── README.md
```

## データの保存場所

アプリは以下のデータを**ローカル**に保存します（外部サーバーには送信されません）：

- **LocalStorage** - ポートフォリオデータ、売却履歴、配当データ
- **IndexedDB** - 価格履歴、日次スナップショット、為替レート、APIキャッシュ

データの場所：
- ブラウザ版: ブラウザのローカルストレージ
- デスクトップ版: OSごとのアプリデータフォルダ

## 機能詳細

### 資産の追加

1. 「資産を追加」ボタンをクリック
2. 資産タイプを選択（株式、投資信託など）
3. 必要な情報を入力
   - 銘柄コード（ティッカーシンボル）
   - 購入数量
   - 購入単価
   - 通貨
   - タグ（任意）
4. 「追加」ボタンで保存

### 価格の更新

「価格更新」ボタンをクリックすると、全資産の最新価格を自動取得します。

- 株式・ETF: Yahoo Finance APIから取得
- 投資信託: 日本の投資信託ライブラリから取得
- 為替レート: USD/JPY為替レートを自動取得

### 配当の記録

1. 資産の詳細画面を開く
2. 「配当を追加」ボタンをクリック
3. 配当情報を入力
   - 配当日
   - 1株あたりの配当金
   - 通貨
4. 円換算額が自動計算されます

### パフォーマンス分析

パフォーマンスチャートでは以下の分析が可能です：

- 期間選択: 30日、90日、1年、全期間、年初来
- フィルタ: 全体、銘柄別、タグ別
- 表示項目: 評価額、利益額、利益率、配当累計

### データのバックアップ

1. 「バックアップ」ボタンをクリック
2. JSONファイルがダウンロードされます
3. このファイルを安全な場所に保存してください

### データのリストア

1. 「リストア」ボタンをクリック
2. バックアップファイルを選択
3. データが復元されます（既存のデータは上書きされます）

## トラブルシューティング

### 価格が更新されない

- インターネット接続を確認してください
- Web版の場合、プロキシサーバーが起動しているか確認してください
- Yahoo FinanceやAPIのメンテナンス時間の可能性があります

### デスクトップアプリが起動しない

- Rustがインストールされているか確認してください
- システムの依存関係が満たされているか確認してください
- [Tauri Prerequisites](https://tauri.app/v2/guides/prerequisites/)を参照

### データが消えた

- ブラウザのキャッシュをクリアした場合、データが失われる可能性があります
- 定期的にバックアップを取ることを推奨します
- デスクトップ版の使用も検討してください

## 開発者向け情報

### 環境の自動切り替え

アプリは実行環境を自動判定し、適切なAPIを使用します：

- **Tauri環境**: Rustバックエンドの関数を呼び出し
- **Web環境**: Node.jsプロキシサーバーにHTTPリクエスト

実装は [src/utils/tauriAPI.js](src/utils/tauriAPI.js) を参照してください。

### APIエンドポイント

プロキシサーバー（開発用）:
- `GET /api/yahoo` - Yahoo Finance APIプロキシ
- `GET /api/fund` - 投資信託データプロキシ（Shift_JIS対応）

Tauriコマンド（デスクトップ版）:
- `fetch_yahoo_finance` - Yahoo Finance APIからデータ取得
- `fetch_fund_data` - 投資信託データ取得（Shift_JIS→UTF-8変換）

### データベーススキーマ

IndexedDB（Dexie.js）:

```javascript
{
  priceHistory: '[symbol+date], symbol, date, price, currency',
  dailySnapshots: 'date, totalValueJPY, totalValueUSD, breakdown, exchangeRate, assetBreakdown, cumulativeDividends',
  exchangeRates: 'date, rate',
  apiCache: 'key, data, timestamp'
}
```

詳細は [src/utils/database.js](src/utils/database.js) を参照してください。

## ライセンス

このプロジェクトのライセンス情報を記載してください。

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 謝辞

- [Yahoo Finance](https://finance.yahoo.com/) - 株式・為替データ提供
- [投資信託協会](https://www.toushin.or.jp/) - 投資信託データ
- [Tauri](https://tauri.app/) - デスクトップアプリフレームワーク
- [React](https://react.dev/) - UIフレームワーク
- [Recharts](https://recharts.org/) - グラフライブラリ

## お問い合わせ

質問や問題がある場合は、GitHubのissueを作成してください。
