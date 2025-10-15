const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

/**
 * 주식 DB 업데이터
 * 네이버 증권에서 전체 종목 크롤링
 *
 * ⚠️  주의사항:
 * - 이 코드는 네이버 금융의 공개 웹페이지를 크롤링합니다
 * - robots.txt를 확인하고 준수해야 합니다
 * - 과도한 요청을 방지하기 위해 요청 간 딜레이를 적용합니다
 * - 하루 1회만 업데이트하여 서버 부하를 최소화합니다
 */
class StockDBUpdater {
  constructor() {
    this.baseUrl = 'https://finance.naver.com';
    this.dbPath = path.join(__dirname, '../data/stocks-db.json');
    // 크롤링 딜레이 (네이버 서버 부하 최소화)
    this.crawlDelay = 500; // 500ms로 증가
  }

  /**
   * 전체 종목 DB 업데이트
   */
  async updateDatabase() {
    console.log('[StockDB] 전체 종목 업데이트 시작...');

    try {
      const allStocks = [];

      // 코스피 크롤링
      console.log('[StockDB] 코스피 종목 수집 중...');
      const kospiStocks = await this.crawlMarket('0', 'KOSPI');
      allStocks.push(...kospiStocks);

      // 코스닥 크롤링
      console.log('[StockDB] 코스닥 종목 수집 중...');
      const kosdaqStocks = await this.crawlMarket('1', 'KOSDAQ');
      allStocks.push(...kosdaqStocks);

      // 중복 제거
      const uniqueStocks = this.removeDuplicates(allStocks);

      // 최소 종목 수 검증 (너무 적으면 크롤링 실패로 간주)
      if (uniqueStocks.length < 100) {
        throw new Error(`수집된 종목 수가 너무 적습니다 (${uniqueStocks.length}개). 크롤링 실패로 판단됨`);
      }

      // DB 파일에 저장
      this.saveToFile(uniqueStocks);

      console.log(`[StockDB] ✓ 업데이트 완료: 총 ${uniqueStocks.length}개 종목`);
      return uniqueStocks;

    } catch (error) {
      console.error('[StockDB] 업데이트 실패:', error.message);
      console.error('[StockDB] 기존 DB 데이터를 유지합니다.');
      throw error;
    }
  }

  /**
   * 특정 시장의 전체 종목 크롤링
   * @param {string} sosok - 시장 구분 (0: 코스피, 1: 코스닥)
   * @param {string} marketName - 시장 이름
   */
  async crawlMarket(sosok, marketName) {
    const stocks = [];
    let page = 1;
    const maxPages = 50; // 최대 50페이지 (약 2,500개 종목)

    while (page <= maxPages) {
      try {
        const url = `${this.baseUrl}/sise/sise_market_sum.naver?sosok=${sosok}&page=${page}`;

        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          responseType: 'arraybuffer',
          timeout: 10000
        });

        // Decode EUC-KR to UTF-8
        const html = iconv.decode(Buffer.from(response.data), 'euc-kr');
        const $ = cheerio.load(html);
        let foundInPage = 0;

        $('table.type_2 tbody tr').each((i, tr) => {
          const titleCell = $(tr).find('td:nth-child(2) a');
          const name = titleCell.text().trim();
          const href = titleCell.attr('href');

          if (name && href) {
            const code = href.match(/code=(\d{6})/)?.[1];
            if (code) {
              stocks.push({
                code: code,
                name: name,
                market: marketName
              });
              foundInPage++;
            }
          }
        });

        // 더 이상 종목이 없으면 중단
        if (foundInPage === 0) {
          break;
        }

        console.log(`[StockDB] ${marketName} 페이지 ${page}: ${foundInPage}개 수집`);
        page++;

        // 요청 간 딜레이 (과도한 요청 방지, robots.txt 준수)
        await this.delay(this.crawlDelay);

      } catch (error) {
        console.error(`[StockDB] ${marketName} 페이지 ${page} 오류:`, error.message);
        break;
      }
    }

    return stocks;
  }

  /**
   * 중복 제거 (종목코드 기준)
   */
  removeDuplicates(stocks) {
    const seen = new Set();
    return stocks.filter(stock => {
      if (seen.has(stock.code)) {
        return false;
      }
      seen.add(stock.code);
      return true;
    });
  }

  /**
   * DB 파일에 저장
   */
  saveToFile(stocks) {
    const dirPath = path.dirname(this.dbPath);

    // 디렉토리 생성
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 백업 파일 생성 (기존 파일이 있는 경우)
    if (fs.existsSync(this.dbPath)) {
      const backupPath = this.dbPath + '.backup';
      fs.copyFileSync(this.dbPath, backupPath);
    }

    try {
      // JSON 파일로 저장
      fs.writeFileSync(this.dbPath, JSON.stringify(stocks, null, 2), 'utf-8');

      // 백업 파일 삭제 (저장 성공 시)
      const backupPath = this.dbPath + '.backup';
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    } catch (error) {
      // 저장 실패 시 백업에서 복구
      const backupPath = this.dbPath + '.backup';
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, this.dbPath);
        fs.unlinkSync(backupPath);
      }
      throw error;
    }
  }

  /**
   * 딜레이 함수
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 마지막 업데이트 시간 체크
   * @param {number} lastUpdate - 마지막 업데이트 타임스탬프
   * @returns {boolean} - 업데이트 필요 여부
   */
  static needsUpdate(lastUpdate) {
    if (!lastUpdate) return true;

    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    return (now - lastUpdate) > dayInMs;
  }
}

module.exports = StockDBUpdater;
