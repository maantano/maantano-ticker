const NaverFinanceService = require('./NaverFinanceService');
const USStockService = require('./USStockService');

class StockServiceFactory {
  constructor() {
    this.koreaService = new NaverFinanceService();
    this.usService = new USStockService();
  }

  getService(market) {
    switch (market) {
      case 'korea':
        return this.koreaService;
      case 'us':
        return this.usService;
      default:
        throw new Error(`Unknown market: ${market}`);
    }
  }

  async getStockPrice(symbol, market) {
    const service = this.getService(market);
    return await service.getStockPrice(symbol);
  }

  async searchStocks(query, market) {
    const service = this.getService(market);
    return await service.searchStocks(query);
  }

  async getMultipleStockPrices(stocks) {
    // stocks는 { symbol, market } 객체 배열
    const results = new Map();

    // 시장별로 그룹화
    const koreaStocks = stocks.filter(s => s.market === 'korea');
    const usStocks = stocks.filter(s => s.market === 'us');

    // 병렬로 처리
    const promises = [];

    if (koreaStocks.length > 0) {
      const koreanSymbols = koreaStocks.map(s => s.symbol);
      promises.push(
        this.koreaService.getMultipleStockPrices(koreanSymbols).then(data => {
          data.forEach((value, key) => {
            results.set(key, value);
          });
        })
      );
    }

    if (usStocks.length > 0) {
      const usSymbols = usStocks.map(s => s.symbol);
      promises.push(
        this.usService.getMultipleStockPrices(usSymbols).then(data => {
          data.forEach((value, key) => {
            results.set(key, value);
          });
        })
      );
    }

    await Promise.all(promises);
    return results;
  }
}

module.exports = StockServiceFactory;
