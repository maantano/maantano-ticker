const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

class NaverFinanceService {
  constructor() {
    this.baseUrl = 'https://finance.naver.com';

    // Rate limiting 설정
    this.lastRequestTime = 0;
    this.minRequestInterval = 200; // 최소 200ms 간격
    this.requestQueue = Promise.resolve();

    const dbPath = path.join(__dirname, '../data/stocks-db.json');
    try {
      if (fs.existsSync(dbPath)) {
        this.stocksDB = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      } else {
        console.log('[NaverFinance] DB 파일 없음 - 앱 첫 실행 시 생성됩니다');
        this.stocksDB = [];
      }
    } catch (error) {
      console.error('[NaverFinance] DB 로드 실패:', error.message);
      this.stocksDB = [];
    }
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

  async getStockPrice(code) {
    // Rate limiting 적용
    await this.waitForRateLimit();

    try {
      const formattedCode = code.padStart(6, '0');
      const url = `https://polling.finance.naver.com/api/realtime/domestic/stock/${formattedCode}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://finance.naver.com/'
        },
        timeout: 10000
      });

      if (!response.data || !response.data.datas || response.data.datas.length === 0) {
        throw new Error('No price data available');
      }

      const data = response.data.datas[0];

      const currentPrice = this.parseNumber(data.closePrice);
      const changePrice = this.parseNumber(data.compareToPreviousClosePrice);
      const changePercent = parseFloat(data.fluctuationsRatio);

      if (!currentPrice) {
        throw new Error('Could not parse current price');
      }

      return {
        price: currentPrice,
        changePercent: changePercent,
        changePrice: changePrice
      };

    } catch (error) {
      console.error(`Naver Finance API error for ${code}:`, error.message);

      if (error.response) {
        if (error.response.status === 404) {
          throw new Error('Stock code not found');
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
      const searchQuery = query.trim().substring(0, 50).toLowerCase();

      // 위험한 문자 필터링 (한글, 영문, 숫자만 허용)
      if (!/^[가-힣a-zA-Z0-9\s]+$/.test(searchQuery)) {
        console.warn('[NaverFinance] 유효하지 않은 검색어:', query);
        return [];
      }

      const results = this.stocksDB.filter(stock => {
        const nameMatch = stock.name.toLowerCase().includes(searchQuery);
        const codeMatch = stock.code.includes(searchQuery);
        return nameMatch || codeMatch;
      });

      return results.slice(0, 10).map(stock => ({
        symbol: stock.code,
        name: stock.name
      }));

    } catch (error) {
      console.error('Stock search error:', error.message);
      return [];
    }
  }

  async getMultipleStockPrices(codes) {
    const results = new Map();

    const promises = codes.map(async (code) => {
      try {
        const priceData = await this.getStockPrice(code);
        results.set(code, priceData);
      } catch (error) {
        console.error(`Failed to fetch ${code}:`, error.message);
        results.set(code, null);
      }
    });

    await Promise.all(promises);
    return results;
  }

  parseNumber(text) {
    if (!text) return 0;
    const cleaned = text.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  }

  parsePercent(text) {
    if (!text) return 0;
    const cleaned = text.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  }
}

module.exports = NaverFinanceService;
