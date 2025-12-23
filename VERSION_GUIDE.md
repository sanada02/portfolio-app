# バージョン管理ガイド

## バージョン番号の更新方法

アプリのバージョンを更新する際は、以下の3つのファイルを同時に更新してください。

### 1. package.json

```json
{
  "version": "1.0.0"
}
```

### 2. src-tauri/tauri.conf.json

```json
{
  "version": "1.0.0"
}
```

### 3. src-tauri/Cargo.toml

```toml
[package]
version = "1.0.0"
```

## セマンティックバージョニング

バージョン番号は`MAJOR.MINOR.PATCH`形式で管理します:

- **MAJOR** (1.x.x): 互換性のない大きな変更
- **MINOR** (x.1.x): 後方互換性のある機能追加
- **PATCH** (x.x.1): 後方互換性のあるバグ修正

### 例:
- `1.0.0` → `1.0.1`: バグ修正
- `1.0.0` → `1.1.0`: 新機能追加
- `1.0.0` → `2.0.0`: 破壊的変更

## ビルド成果物

### インストーラー版

ビルド後、以下のインストーラーが生成されます:

```
src-tauri/target/release/bundle/
├── msi/
│   └── Portfolio App_1.0.0_x64_en-US.msi
└── nsis/
    └── Portfolio App_1.0.0_x64-setup.exe
```

- **MSI**: Windows標準インストーラー形式
- **NSIS**: より柔軟なインストーラー形式

### スタンドアローン版（ポータブル版）

インストール不要で直接実行できるバージョン:

```
src-tauri/target/release/portfolio-app.exe
```

このファイルは:
- インストール不要
- USBメモリなどで持ち運び可能
- 管理者権限不要で実行可能
- 設定ファイルはユーザーのAppDataフォルダに保存

## スタンドアローン版の配布方法

### 1. 基本的な配布

```bash
# ビルド
npm run tauri:build

# スタンドアローン版をコピー
cp src-tauri/target/release/portfolio-app.exe ./Portfolio_App_v1.0.0_portable.exe
```

### 2. ZIP形式での配布

```bash
# Windowsの場合
Compress-Archive -Path src-tauri/target/release/portfolio-app.exe -DestinationPath Portfolio_App_v1.0.0_portable.zip

# またはGit Bashの場合
zip Portfolio_App_v1.0.0_portable.zip src-tauri/target/release/portfolio-app.exe
```

### 3. README付きで配布

配布用のフォルダ構成:

```
Portfolio_App_v1.0.0_portable/
├── portfolio-app.exe
└── README.txt
```

README.txtの例:
```
Portfolio App v1.0.0 (ポータブル版)

## 使い方
1. portfolio-app.exe をダブルクリックして起動
2. インストール不要で使用できます

## データの保存場所
アプリのデータは以下の場所に保存されます:
%APPDATA%\com.portfolio.manager

## 必要な環境
- Windows 10以降
- インターネット接続（価格データ取得時）

## サポート
問題が発生した場合は、DEBUGGING.mdを参照してください。
```

## リリース作業フロー

### 1. バージョン番号の更新

```bash
# 3つのファイルを更新
# - package.json
# - src-tauri/tauri.conf.json
# - src-tauri/Cargo.toml
```

### 2. 変更のコミット

```bash
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to 1.0.0"
git tag v1.0.0
```

### 3. ビルド

```bash
npm run tauri:build
```

### 4. 成果物の確認

```bash
# インストーラー
ls src-tauri/target/release/bundle/msi/
ls src-tauri/target/release/bundle/nsis/

# スタンドアローン版
ls src-tauri/target/release/portfolio-app.exe
```

### 5. リリース

GitHubを使用している場合:

```bash
# タグをプッシュ
git push origin v1.0.0

# GitHubのReleasesページで:
# - タグ: v1.0.0
# - タイトル: Portfolio App v1.0.0
# - 説明: リリースノート
# - ファイル: インストーラーとスタンドアローン版を添付
```

## 自動バージョン更新スクリプト（オプション）

package.jsonにスクリプトを追加して、バージョン更新を自動化できます:

```json
{
  "scripts": {
    "version:patch": "npm version patch && node scripts/sync-version.js",
    "version:minor": "npm version minor && node scripts/sync-version.js",
    "version:major": "npm version major && node scripts/sync-version.js"
  }
}
```

`scripts/sync-version.js`を作成:

```javascript
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// package.jsonからバージョンを読み取る
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);
const version = packageJson.version;

// tauri.conf.jsonを更新
const tauriConfigPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
tauriConfig.version = version;
fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2));

// Cargo.tomlを更新
const cargoTomlPath = path.join(__dirname, '../src-tauri/Cargo.toml');
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
cargoToml = cargoToml.replace(
  /^version = ".*"$/m,
  `version = "${version}"`
);
fs.writeFileSync(cargoTomlPath, cargoToml);

console.log(`✓ Version updated to ${version} in all files`);
```

使用方法:

```bash
npm run version:patch  # 1.0.0 → 1.0.1
npm run version:minor  # 1.0.0 → 1.1.0
npm run version:major  # 1.0.0 → 2.0.0
```

## トラブルシューティング

### バージョン番号が反映されない

ビルド前に必ず3つのファイル全てを更新してください。

### スタンドアローン版が起動しない

- WebView2がインストールされているか確認
- Windows Defenderに除外設定を追加

### ファイルサイズが大きい

リリースビルドは最適化されていますが、以下でさらに小さくできます:

```toml
# src-tauri/Cargo.toml
[profile.release]
strip = true      # シンボル情報を削除
opt-level = "z"   # サイズ最適化
lto = true        # Link Time Optimization
codegen-units = 1 # 並列コンパイル無効化（サイズ優先）
```

ただし、ビルド時間が長くなります。
