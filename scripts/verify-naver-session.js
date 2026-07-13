// 넥스트장(NXT)/프리장/애프터장 세션에서 Naver polling API가 실제로 어떤 필드값을 주는지
// 실측 검증하는 스크립트. 정규장이 아닌 시간대(프리 08:30~09:00, NXT/애프터 15:40~20:00 KST)에 실행할 것.
//
//   node scripts/verify-naver-session.js
//
// 확인 포인트:
//   - data.marketStatus 가 시간외 시간대에 'OPEN' 이 아닌지 (아니어야 방어 로직이 overPrice 를 집음)
//   - overMarketPriceInfo.overPrice / overMarketStatus / tradingSessionType 실제값
//   - overPrice 가 정규장 closePrice 와 다른 시간외 체결가인지
const axios = require('axios');

const H = { 'User-Agent': 'Mozilla/5.0', Referer: 'https://finance.naver.com/' };
const CODES = ['005930', '000660', '087010']; // 삼성전자, SK하이닉스, 펩트론

(async () => {
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  console.log('현재 KST(시스템시계 기준):', kst.toISOString().replace('T', ' ').slice(0, 19));
  console.log('(주의: 시스템 시계가 KST가 아니면 어긋남 — localTradedAt 이 실제 장 시각)\n');

  for (const code of CODES) {
    try {
      const r = await axios.get(
        `https://polling.finance.naver.com/api/realtime/domestic/stock/${code}`,
        { headers: H, timeout: 10000 }
      );
      const d = r.data.datas[0];
      const o = d.overMarketPriceInfo || {};
      console.log(`=== ${d.stockName} (${code}) ===`);
      console.log('  data.marketStatus      :', d.marketStatus);
      console.log('  data.closePrice(정규)  :', d.closePrice, '| 등락률:', d.fluctuationsRatio);
      console.log('  over.overMarketStatus  :', o.overMarketStatus);
      console.log('  over.tradingSessionType:', o.tradingSessionType);
      console.log('  over.overPrice(시간외) :', o.overPrice, '| 등락률:', o.fluctuationsRatio);
      console.log('  over.localTradedAt     :', o.localTradedAt);
      console.log('');
    } catch (e) {
      console.error(code, 'ERR', e.message);
    }
  }
})();
