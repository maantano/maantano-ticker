# Maantano Ticker

## macOS 메뉴바에서 한국 주식 실시간 시세를 확인하는 앱

## 기능

- 한국 주식 실시간 시세 조회 (네이버 증권 API)
- macOS 메뉴바에 첫 번째 종목 표시
- 드래그 앤 드롭으로 종목 순서 변경
- 다크 모드 자동 지원
- 5초 간격 자동 업데이트
- Rate limiting으로 서버 부하 최소화

## 설치

```bash
npm install
```

## 실행

```bash
npm start
```

## 개발 모드 (DevTools 포함)

```bash
npm run dev
```

## 빌드

```bash
npm run build
```

Intel Mac과 Apple Silicon 모두 지원하는 유니버설 바이너리가 생성됩니다.

## 기술 스택

- **Electron** - 크로스 플랫폼 데스크톱 앱
- **Node.js** - 백엔드 로직
- **axios** - HTTP 요청
- **cheerio** - HTML 파싱
- **canvas** - 메뉴바 아이콘 렌더링

## 프로젝트 구조

```
maantano-ticker/
├── src/
│   ├── main/           # Electron 메인 프로세스
│   ├── renderer/       # UI (HTML/CSS/JS)
│   ├── services/       # API 및 데이터 관리
│   ├── models/         # 데이터 모델
│   └── data/           # 종목 DB
├── assets/             # 아이콘 및 리소스
└── build/              # 빌드 설정
```

## 개발자 정보

이 프로젝트는 학습 목적으로 만들어졌으며, 오픈소스로 공개되어 있습니다.
기여는 환영하지만, 법적 책임은 각자에게 있음을 유의하시기 바랍니다.

## 라이선스

MIT License

**단, 네이버 금융 데이터의 저작권은 네이버에 있으며, 이 라이선스는 해당 데이터에 적용되지 않습니다.**

## ⚠️ 면책 조항 및 주의사항

### 데이터 정확성

- 제공되는 주식 시세 데이터의 정확성을 보장하지 않습니다
- 이 데이터를 바탕으로 한 투자 결정에 대한 책임은 전적으로 사용자에게 있습니다
- **투자 손실에 대해 개발자는 어떠한 책임도 지지 않습니다**

### 사용 제한

- 과도한 API 요청으로 인한 IP 차단 가능성이 있습니다
- 개인적인 용도로만 사용하시기 바랍니다
- 대량의 사용자가 동시에 사용할 경우 네이버 측에서 법적 조치를 취할 수 있습니다

**이 앱을 다운로드하거나 사용함으로써, 위의 모든 조항에 동의하는 것으로 간주됩니다.**

## Credits

차트 아이콘: <a href="https://www.flaticon.com/kr/free-icons/" title="증가하다 아이콘">증가하다 아이콘 제작자: Freepik - Flaticon</a>

뒤로 화살표 아이콘: <a href="https://www.flaticon.com/kr/free-icons/-" title="뒤로 화살표 아이콘">뒤로 화살표 아이콘 제작자: Andrean Prabowo - Flaticon</a>
