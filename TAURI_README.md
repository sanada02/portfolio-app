# Portfolio App - Tauri Desktop Application

このプロジェクトは、Tauriを使用してデスクトップアプリケーション化されています。

## 必要な環境

### Windows
- [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [Rust](https://rustup.rs/)
- Node.js 16以降

### macOS
- Xcode Command Line Tools: `xcode-select --install`
- [Rust](https://rustup.rs/)
- Node.js 16以降

### Linux
- 各種ビルドツール、webkit2gtk、など
- [Rust](https://rustup.rs/)
- Node.js 16以降

詳細は [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/) を参照してください。

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. Rustがインストールされていることを確認:
```bash
rustc --version
cargo --version
```

## 開発モード

### Tauriアプリとして起動（推奨）
```bash
npm run tauri:dev
```

このコマンドは:
- Vite開発サーバーを起動
- Tauriアプリケーションウィンドウを開く
- Rustバックエンドでプロキシ機能を提供（別途プロキシサーバー不要）

### Webアプリとして起動（従来の方法）
```bash
npm run dev:all
```

このコマンドは:
- プロキシサーバー（Node.js）を起動
- Vite開発サーバーを起動
- ブラウザで http://localhost:5173 を開く

## プロダクションビルド

デスクトップアプリケーションをビルド:
```bash
npm run tauri:build
```

### ビルド成果物

#### インストーラー版
`src-tauri/target/release/bundle/` に生成されます:
- Windows: `.msi` (Windows Installer) または `.exe` (NSIS)
- macOS: `.dmg` または `.app`
- Linux: `.deb`, `.AppImage`, など

#### スタンドアローン版（ポータブル版）
インストール不要で直接実行できるバージョン:
- `src-tauri/target/release/portfolio-app.exe` (Windows)
- `src-tauri/target/release/portfolio-app` (Linux/macOS)

このファイルは:
- インストール不要
- USBメモリなどで持ち運び可能
- 管理者権限不要で実行可能

**配布方法**:
```bash
# スタンドアローン版をコピー
cp src-tauri/target/release/portfolio-app.exe ./Portfolio_App_v1.0.0_portable.exe
```

## アーキテクチャ

### フロントエンド
- React + Vite
- Tauri API経由でバックエンドと通信

### バックエンド (Rust)
- Yahoo Finance APIプロキシ
- 投資信託データプロキシ（Shift_JIS対応）
- 非同期HTTP処理

### 主な機能
- **環境自動判定**: Tauri環境ではRustバックエンド、Web環境ではNode.jsプロキシを自動選択
- **Shift_JIS対応**: 投資信託データの文字エンコーディング変換
- **CORS回避**: 外部APIへのアクセスをバックエンド経由で実行

## ファイル構成

```
portfolio-app/
├── src/                    # Reactフロントエンド
│   └── utils/
│       ├── tauriAPI.js    # Tauri/Web環境の自動判定API
│       └── priceAPI.js    # 価格データ取得API
├── src-tauri/             # Tauriバックエンド
│   ├── src/
│   │   └── main.rs        # Rustメインコード
│   ├── Cargo.toml         # Rust依存関係
│   └── tauri.conf.json    # Tauri設定
├── proxy-server.js        # Node.jsプロキシ（Web開発用）
└── package.json
```

## トラブルシューティング

### Rustコンパイルエラー
```bash
# Rustを最新版に更新
rustup update
```

### Tauri CLIが見つからない
```bash
# Tauri CLIを再インストール
npm install --save-dev @tauri-apps/cli
```

### ビルドが遅い
開発ビルドは最適化されていないため、初回は時間がかかります。
プロダクションビルド（`npm run tauri:build`）は最適化されますが、さらに時間がかかります。

## アイコンのカスタマイズ

1. 1024x1024以上のPNG画像を用意
2. 以下のコマンドでアイコンセットを生成:
```bash
npx @tauri-apps/cli icon path/to/icon.png
```

詳細は `src-tauri/icons/README.md` を参照してください。

## 参考リンク

- [Tauri公式ドキュメント](https://v2.tauri.app/)
- [Tauri APIリファレンス](https://v2.tauri.app/reference/javascript/)
- [Yahoo Finance API](https://query1.finance.yahoo.com/)
