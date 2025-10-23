const axios = require('axios');
const path = require('path');
const fs = require('fs');

class USStockService {
  constructor() {
    // Yahoo Finance API 사용 (비공식이지만 널리 사용됨)
    this.baseUrl = 'https://query1.finance.yahoo.com';

    // Rate limiting 설정
    this.lastRequestTime = 0;
    this.minRequestInterval = 200; // 최소 200ms 간격
    this.requestQueue = Promise.resolve();

    // 미국 주식 DB 로드
    const dbPath = path.join(__dirname, '../data/us-stocks-db.json');
    try {
      if (fs.existsSync(dbPath)) {
        this.stocksDB = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      } else {
        console.log('[USStock] DB 파일 없음 - 기본 인기 종목으로 초기화');
        this.stocksDB = this.getDefaultStocks();
      }
    } catch (error) {
      console.error('[USStock] DB 로드 실패:', error.message);
      this.stocksDB = this.getDefaultStocks();
    }
  }

  // 기본 인기 종목 (DB 파일이 없을 경우)
  getDefaultStocks() {
    return [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'META', name: 'Meta Platforms Inc.' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
      { symbol: 'V', name: 'Visa Inc.' },
      { symbol: 'WMT', name: 'Walmart Inc.' },
      { symbol: 'DIS', name: 'The Walt Disney Company' },
      { symbol: 'NFLX', name: 'Netflix Inc.' },
      { symbol: 'BAC', name: 'Bank of America Corporation' },
      { symbol: 'KO', name: 'The Coca-Cola Company' },
      { symbol: 'PEP', name: 'PepsiCo Inc.' },
      { symbol: 'COST', name: 'Costco Wholesale Corporation' },
      { symbol: 'INTC', name: 'Intel Corporation' },
      { symbol: 'AMD', name: 'Advanced Micro Devices Inc.' },
      { symbol: 'PYPL', name: 'PayPal Holdings Inc.' }
    ];
  }

  // Rate limiting을 위한 딜레이 함수
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  async getStockPrice(symbol) {
    // Rate limiting 적용
    await this.waitForRateLimit();

    try {
      // Yahoo Finance Chart API 사용
      const url = `${this.baseUrl}/v8/finance/chart/${symbol}`;

      const response = await axios.get(url, {
        params: {
          interval: '1m',
          range: '1d'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 10000
      });

      if (!response.data || !response.data.chart || !response.data.chart.result || response.data.chart.result.length === 0) {
        throw new Error('No price data available');
      }

      const result = response.data.chart.result[0];
      const meta = result.meta;

      // 정규 거래 시간 가격 사용
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose || meta.previousClose;

      if (!currentPrice || !previousClose) {
        throw new Error('Could not parse price data');
      }

      // 변동액 및 변동률 계산
      const changePrice = currentPrice - previousClose;
      const changePercent = (changePrice / previousClose) * 100;

      return {
        price: parseFloat(currentPrice.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        changePrice: parseFloat(changePrice.toFixed(2))
      };

    } catch (error) {
      console.error(`Yahoo Finance API error for ${symbol}:`, error.message);

      if (error.response) {
        if (error.response.status === 404) {
          throw new Error('Stock symbol not found');
        }
        throw new Error(`API error: ${error.response.status}`);
      }

      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  async searchStocks(query) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      // 입력 검증: 최대 길이 제한 및 안전한 문자만 허용
      const searchQuery = query.trim().substring(0, 50).toUpperCase();

      // 미국 주식은 영문과 점(.), 하이픈(-)만 허용
      if (!/^[A-Z0-9.\-\s]+$/.test(searchQuery)) {
        console.warn('[USStock] 유효하지 않은 검색어:', query);
        return [];
      }

      // 로컬 DB에서 검색
      const results = this.stocksDB.filter(stock => {
        const symbolMatch = stock.symbol.toUpperCase().includes(searchQuery);
        const nameMatch = stock.name.toUpperCase().includes(searchQuery);
        return symbolMatch || nameMatch;
      });

      return results.slice(0, 10).map(stock => ({
        symbol: stock.symbol,
        name: stock.name
      }));

    } catch (error) {
      console.error('US stock search error:', error.message);
      return [];
    }
  }

  async getMultipleStockPrices(symbols) {
    const results = new Map();

    const promises = symbols.map(async (symbol) => {
      try {
        const priceData = await this.getStockPrice(symbol);
        results.set(symbol, priceData);
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error.message);
        results.set(symbol, null);
      }
    });

    await Promise.all(promises);
    return results;
  }
}

module.exports = USStockService;
