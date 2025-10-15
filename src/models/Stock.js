class Stock {
  constructor(symbol, name, market) {
    this.symbol = symbol;
    this.name = name;
    this.market = market;
    this.currentPrice = null;
    this.changePercent = null;
    this.changePrice = null;
    this.lastUpdated = null;
    this.error = null;
    this.consecutiveErrors = 0; // 연속 에러 횟수 추적
  }

  updatePrice(priceData) {
    if (!priceData) return;

    this.currentPrice = priceData.price;
    this.changePercent = priceData.changePercent;
    this.changePrice = priceData.changePrice;
    this.lastUpdated = new Date();
    this.error = null;
    this.consecutiveErrors = 0; // 성공 시 에러 카운터 초기화
  }

  setError(errorMessage) {
    this.error = errorMessage;
    this.consecutiveErrors++; // 에러 발생 시 카운터 증가
    this.lastUpdated = new Date();
  }

  // 상장폐지 가능성 판단 (연속 3회 이상 에러)
  isPossiblyDelisted() {
    return this.consecutiveErrors >= 3;
  }

  getChangeStatus() {
    if (!this.changePercent) return 'neutral';

    const absPercent = Math.abs(this.changePercent);

    if (this.changePercent > 0) {
      if (absPercent >= 10) return 'positive-high';
      if (absPercent >= 5) return 'positive-medium';
      return 'positive';
    }

    if (this.changePercent < 0) {
      if (absPercent >= 10) return 'negative-high';
      if (absPercent >= 5) return 'negative-medium';
      return 'negative';
    }

    return 'neutral';
  }

  getFormattedPrice() {
    if (!this.currentPrice) return '...';

    if (this.market === 'korea') {
      return this.currentPrice.toLocaleString('ko-KR');
    }

    return this.currentPrice.toFixed(2);
  }

  getFormattedChange() {
    if (this.changePercent === null) return '...';

    // 0%일 때는 화살표와 부호 없이 표시
    if (this.changePercent === 0) {
      return `0.00%`;
    }

    const absPercent = Math.abs(this.changePercent);
    const sign = this.changePercent >= 0 ? '+' : '';

    // 구간별 화살표 개수
    let arrow;
    if (this.changePercent > 0) {
      arrow = absPercent >= 10 ? '▲▲' : '▲';
    } else {
      arrow = absPercent >= 10 ? '▼▼' : '▼';
    }

    return `${arrow} ${sign}${this.changePercent.toFixed(2)}%`;
  }

  getFormattedChangeForMenuBar() {
    if (this.changePercent === null) return '...';

    // 0%일 때는 화살표 없이 표시
    if (this.changePercent === 0) {
      return `0.00%`;
    }

    const absPercent = Math.abs(this.changePercent);

    // 구간별 화살표 개수
    let arrow;
    if (this.changePercent > 0) {
      arrow = absPercent >= 10 ? '▲▲' : '▲';
    } else {
      arrow = absPercent >= 10 ? '▼▼' : '▼';
    }

    const value = absPercent.toFixed(2);

    return `${arrow} ${value}%`;
  }

  getMenuBarText() {
    if (this.error) return `${this.name} ...`;
    if (!this.currentPrice) return `${this.name} ...`;

    const price = this.getFormattedPrice();
    const change = this.getFormattedChangeForMenuBar();

    return `${this.name} ${price} ${change}`;
  }

  toJSON() {
    return {
      symbol: this.symbol,
      name: this.name,
      market: this.market,
      currentPrice: this.currentPrice,
      changePercent: this.changePercent,
      changePrice: this.changePrice,
      lastUpdated: this.lastUpdated,
      error: this.error,
      consecutiveErrors: this.consecutiveErrors
    };
  }

  static fromJSON(json) {
    const stock = new Stock(json.symbol, json.name, json.market);
    stock.currentPrice = json.currentPrice;
    stock.changePercent = json.changePercent;
    stock.changePrice = json.changePrice;
    stock.lastUpdated = json.lastUpdated ? new Date(json.lastUpdated) : null;
    stock.error = json.error;
    stock.consecutiveErrors = json.consecutiveErrors || 0;
    return stock;
  }
}

module.exports = Stock;
