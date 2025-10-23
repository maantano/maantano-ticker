const StockServiceFactory = require('./StockServiceFactory');
const Stock = require('../models/Stock');

class StockDataManager {
  constructor() {
    this.serviceFactory = new StockServiceFactory();
  }

  async updateStockPrice(stock) {
    try {
      const priceData = await this.serviceFactory.getStockPrice(stock.symbol, stock.market);
      stock.updatePrice(priceData);
    } catch (error) {
      stock.setError(error.message);
      throw error;
    }
  }

  async updateMultipleStocks(stocks) {
    const promises = stocks.map(stock => this.updateStockPrice(stock));
    await Promise.allSettled(promises);
  }

  async searchStocks(query, market = 'korea') {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim();

    try {
      const results = await this.serviceFactory.searchStocks(trimmedQuery, market);
      return results.map(item => ({
        symbol: item.symbol,
        name: item.name,
        market: market
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  createStock(symbol, name, market = 'korea') {
    return new Stock(symbol, name, market);
  }

  /**
   * 종목이 DB에 존재하는지 확인 (상장폐지 체크)
   * @param {string} symbol - 종목 코드
   * @param {string} market - 시장 ('korea' 또는 'us')
   * @returns {boolean} - DB에 존재하면 true
   */
  isStockInDatabase(symbol, market = 'korea') {
    const service = this.serviceFactory.getService(market);

    if (market === 'korea') {
      return service.stocksDB.some(stock => stock.code === symbol);
    } else if (market === 'us') {
      return service.stocksDB.some(stock => stock.symbol === symbol);
    }

    return false;
  }
}

module.exports = StockDataManager;
