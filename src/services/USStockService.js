const axios = require('axios');
const path = require('path');
const fs = require('fs');

class USStockService {
  constructor() {
    // Yahoo Finance API 사용 (비공식이지만 널리 사용됨)
    // 정규장은 최대 15분 지연 가능(거래소 무료 정책), 프리/애프터장은 includePrePost로 반영.
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
          range: '1d',
          includePrePost: true // 프리장/애프터장 데이터 포함
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

      const previousClose = meta.chartPreviousClose || meta.previousClose;

      // includePrePost=true 로 받은 분봉 중 마지막 유효 종가를 현재가로 사용.
      // 프리장/애프터장이면 그 시간대 가격이, 아니면 정규장 마지막 가격이 잡힌다.
      // (chart API의 meta에는 preMarketPrice/marketState 필드가 없음)
      let currentPrice = null;
      const closes = result.indicators && result.indicators.quote && result.indicators.quote[0]
        ? result.indicators.quote[0].close
        : null;
      if (Array.isArray(closes)) {
        for (let i = closes.length - 1; i >= 0; i--) {
          if (closes[i] != null) { currentPrice = closes[i]; break; }
        }
      }
      // 분봉이 비어있으면 정규장 가격으로 폴백
      if (currentPrice == null) {
        currentPrice = meta.regularMarketPrice;
      }

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
      const searchQuery = query.trim().substring(0, 50);

      // 미국 주식은 영문과 점(.), 하이픈(-), 공백만 허용
      if (!/^[A-Za-z0-9.\-\s]+$/.test(searchQuery)) {
        console.warn('[USStock] 유효하지 않은 검색어:', query);
        return [];
      }

      // Yahoo Finance Search API로 실시간 검색
      const apiResults = await this.searchFromYahoo(searchQuery);
      if (apiResults.length > 0) {
        return apiResults;
      }

      // API 실패 시 로컬 DB 폴백
      console.log('[USStock] Yahoo API 결과 없음, 로컬 DB 폴백');
      return this.searchFromLocalDB(searchQuery);

    } catch (error) {
      console.error('US stock search error:', error.message);
      // API 오류 시 로컬 DB 폴백
      return this.searchFromLocalDB(query);
    }
  }

  /**
   * Yahoo Finance Search API를 통한 실시간 종목 검색
   */
  async searchFromYahoo(query) {
    try {
      const url = `${this.baseUrl}/v1/finance/search`;
      const response = await axios.get(url, {
        params: {
          q: query,
          quotesCount: 10,
          newsCount: 0,
          listsCount: 0,
          quotesQueryId: 'tss_match_phrase_query'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 5000
      });

      if (!response.data || !response.data.quotes) {
        return [];
      }

      // EQUITY 타입만 필터링 (ETF, 암호화폐 등 제외)
      return response.data.quotes
        .filter(q => q.quoteType === 'EQUITY' && q.isYahooFinance)
        .slice(0, 10)
        .map(q => ({
          symbol: q.symbol,
          name: q.longname || q.shortname || q.symbol
        }));

    } catch (error) {
      console.error('[USStock] Yahoo Search API 오류:', error.message);
      return [];
    }
  }

  /**
   * 로컬 DB에서 종목 검색 (폴백용)
   */
  searchFromLocalDB(query) {
    if (!query) return [];
    const searchQuery = query.trim().toUpperCase();

    const results = this.stocksDB.filter(stock => {
      const symbolMatch = stock.symbol.toUpperCase().includes(searchQuery);
      const nameMatch = stock.name.toUpperCase().includes(searchQuery);
      return symbolMatch || nameMatch;
    });

    return results.slice(0, 10).map(stock => ({
      symbol: stock.symbol,
      name: stock.name
    }));
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
