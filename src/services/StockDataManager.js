const NaverFinanceService = require('./NaverFinanceService');
const Stock = require('../models/Stock');

class StockDataManager {
  constructor() {
    this.naverService = new NaverFinanceService();
  }

  async updateStockPrice(stock) {
    try {
      const priceData = await this.naverService.getStockPrice(stock.symbol);
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

  async searchStocks(query) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim();

    try {
      const naverResults = await this.naverService.searchStocks(trimmedQuery);
      return naverResults.map(item => ({
        symbol: item.symbol,
        name: item.name,
        market: 'korea'
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
   * @returns {boolean} - DB에 존재하면 true
   */
  isStockInDatabase(symbol) {
    return this.naverService.stocksDB.some(stock => stock.code === symbol);
  }
}

module.exports = StockDataManager;
