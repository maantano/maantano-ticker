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

      // 세션 판단 로직 (방어적):
      // - data.marketStatus === 'OPEN' 이면 KRX 정규장(09:00~15:30) → closePrice 사용.
      //   (정규장 중에도 overPrice 에 NXT 체결가가 동시에 오지만, 정규장 공식가는 closePrice 이므로 무시)
      // - 정규장이 아닌데(marketStatus !== 'OPEN') overPrice 가 있으면
      //   프리장/넥스트장(NXT)/애프터장 시간대의 시간외 실시간가 → overPrice 사용.
      //
      // Naver 는 비공식/미문서 API 라 overMarketStatus·tradingSessionType 의 정확한 enum 값
      // (PRE_MARKET / NXT_* 등)을 프리·NXT 시간대에 실측 검증하지 못했다. 그래서 그 값들에
      // 의존하지 않고 "정규장이 아니면서 overPrice 가 존재"라는 최소 조건만으로 판단한다.
      // 이러면 시간외 세션에서 어떤 status/type 이 와도 overPrice 를 안전하게 집는다.
      // TODO(실측): 프리장(08:30~09:00)·NXT/애프터(15:40~20:00) 시간대에 실제 응답으로
      //   marketStatus/overMarketStatus/tradingSessionType/overPrice 값을 확인해 검증할 것.
      const over = data.overMarketPriceInfo;
      const isRegularOpen = data.marketStatus === 'OPEN';
      const useExtended = !isRegularOpen && over && over.overPrice;

      let currentPrice, changePrice, changePercent;

      if (useExtended) {
        // 프리장 / 넥스트장 / 애프터장 실시간가
        currentPrice = this.parseNumber(over.overPrice);
        changePrice = this.parseNumber(over.compareToPreviousClosePrice);
        changePercent = parseFloat(over.fluctuationsRatio);
      } else {
        // 정규장(KRX) 데이터 사용
        currentPrice = this.parseNumber(data.closePrice);
        changePrice = this.parseNumber(data.compareToPreviousClosePrice);
        changePercent = parseFloat(data.fluctuationsRatio);
      }

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
