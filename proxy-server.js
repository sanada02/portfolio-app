// proxy-server.js
import express from 'express';
import cors from 'cors';
import iconv from 'iconv-lite';

const app = express();
app.use(cors());
app.use(express.json());

// Yahoo Finance プロキシ
app.get('/api/yahoo', async (req, res) => {
  const { symbol, period1, period2, interval, range } = req.query;
  
  try {
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?`;
    
    if (period1 && period2) {
      url += `period1=${period1}&period2=${period2}&interval=${interval || '1d'}`;
    } else {
      url += `interval=${interval || '1d'}&range=${range || '1d'}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 投資信託プロキシ（文字コード変換対応）
app.get('/api/fund', async (req, res) => {
  const { isinCd, associFundCd } = req.query;
  
  try {
    const url = `https://toushin-lib.fwg.ne.jp/FdsWeb/FDST030000/csv-file-download?isinCd=${isinCd}&associFundCd=${associFundCd}`;
    const response = await fetch(url);
    
    // バイナリデータとして取得
    const buffer = await response.arrayBuffer();
    
    // Shift_JIS から UTF-8 に変換
    const decoded = iconv.decode(Buffer.from(buffer), 'Shift_JIS');
    
    res.type('text/csv; charset=utf-8').send(decoded);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✓ プロキシサーバー起動: http://localhost:${PORT}`);
  console.log('Yahoo Finance と投資信託のCORS問題を回避します');
});