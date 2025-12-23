# デバッグガイド

## Yahoo Finance APIの問題をデバッグする

### 1. ブラウザの開発者ツールを開く

Tauriアプリで開発者ツールを開く方法:
- Windows/Linux: `Ctrl + Shift + I` または `F12`
- macOS: `Cmd + Option + I`

### 2. コンソールログを確認

JavaScriptコンソールで以下のログを確認してください:

```
📍 環境: Tauri
🔧 Tauri経由でYahoo Finance APIを呼び出し: { symbol: "AAPL", ... }
✓ Tauri経由でデータ取得成功
```

エラーがある場合:
```
❌ Tauri API呼び出しエラー: [エラーメッセージ]
```

### 3. Rustのログを確認

ターミナル（`npm run tauri:dev`を実行した場所）で以下のログを確認:

```
🌐 Yahoo Finance リクエスト: https://query1.finance.yahoo.com/...
📡 レスポンスステータス: 200 OK
✓ Yahoo Finance データ取得成功
```

エラーがある場合:
```
❌ リクエストエラー: ...
または
❌ HTTPエラー: 404 - ...
```

### 4. よくある問題と解決方法

#### 問題: `リクエストエラー: error sending request`

**原因**: ネットワーク接続の問題またはファイアウォール

**解決策**:
1. インターネット接続を確認
2. ファイアウォール設定を確認
3. プロキシ設定が必要な場合は、Rustの`reqwest`クライアントにプロキシを設定

#### 問題: `HTTP 403` または `HTTP 429`

**原因**: Yahoo Financeのレート制限またはブロック

**解決策**:
1. リクエスト間隔を空ける
2. User-Agentを変更（既に実装済み）
3. 一時的に従来のNode.jsプロキシを使用

#### 問題: `JSONパースエラー`

**原因**: レスポンスがJSON形式でない

**解決策**:
1. Rustログでレスポンスの内容を確認
2. Yahoo Financeのシンボルが正しいか確認（例: `AAPL`、`^N225`）

#### 問題: Tauri環境が認識されない

**症状**: `📍 環境: Web` と表示される

**原因**: `window.__TAURI_INTERNALS__` が未定義

**解決策**:
1. `npm run tauri:dev` で起動しているか確認
2. ブラウザで直接開いていないか確認
3. コンソールで `console.log(window.__TAURI_INTERNALS__)` を実行

### 5. 従来のプロキシサーバーに切り替える（一時的な回避策）

Tauri APIで問題が解決しない場合、一時的にNode.jsプロキシを使用:

```bash
# ターミナル1: プロキシサーバーを起動
npm run proxy

# ターミナル2: Vite開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:5173 を開く

### 6. 詳細なデバッグログを有効にする

`src-tauri/src/main.rs`の各関数で、より詳細なログを追加:

```rust
println!("デバッグ: params = {:?}", params);
println!("デバッグ: url = {}", url);
println!("デバッグ: response body = {:?}", response_text);
```

### 7. Yahoo Finance APIを直接テストする

コマンドラインで直接テスト:

```bash
curl -A "Mozilla/5.0" "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d"
```

成功すれば、JSONレスポンスが返ってきます。

## トラブルシューティングチェックリスト

- [ ] インターネット接続は正常か？
- [ ] ファイアウォールがRustアプリをブロックしていないか？
- [ ] `npm run tauri:dev`で起動しているか？
- [ ] ブラウザのコンソールにエラーが表示されているか？
- [ ] ターミナルにRustのエラーログが表示されているか？
- [ ] Yahoo Financeのシンボルは正しいか？
- [ ] 投資信託データは正常に取得できているか？（Yahoo Financeだけの問題か確認）

## サポート

問題が解決しない場合は、以下の情報を含めて報告してください:

1. エラーメッセージ（JavaScriptとRustの両方）
2. 試したシンボル（例: `AAPL`）
3. ネットワーク環境（プロキシ使用の有無など）
4. Tauri開発サーバーのログ全体
