# Maantano Ticker

<div align="center">

**macOS 메뉴바에서 한국 주식 실시간 시세를 확인하는 앱**

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

## 📱 소개

Maantano Ticker는 macOS 메뉴바에 실시간 한국 주식 시세를 표시하는 경량 데스크톱 앱입니다. 네이버 증권 API를 활용하여 실시간 주가 정보를 제공하며, 깔끔한 UI와 편리한 기능으로 주식 투자자들의 모니터링을 돕습니다.

## ✨ 주요 기능

### 핵심 기능
- 📊 **실시간 시세 조회**: 네이버 증권 API를 통한 실시간 주가 데이터
- 🖥️ **메뉴바 통합**: macOS 메뉴바에 첫 번째 종목의 현재가, 등락률 표시
- 🎨 **색상 커스터마이징**: 메뉴바 텍스트 색상을 9가지 컬러로 변경 가능
- 📈 **다중 종목 관리**: 여러 종목을 동시에 추적 및 관리
- 🔍 **스마트 검색**: 종목명/코드 자동완성 검색 (코스피/코스닥 전체 종목)
- ⏱️ **자동 업데이트**: 5초 간격 자동 시세 갱신

### 사용성
- 🎯 **드래그 앤 드롭**: 직관적인 종목 순서 변경
- 🌓 **다크모드 지원**: macOS 시스템 테마 자동 감지
- 🔄 **동적 창 크기**: 콘텐츠에 맞춰 창 크기 자동 조절
- 💾 **자동 저장**: 종목 목록 및 설정 자동 저장
- 🗑️ **상장폐지 감지**: 상장폐지 종목 자동 제거 및 알림

### 데이터 관리
- 📚 **종목 DB 자동 업데이트**: 하루 1회 자동으로 코스피/코스닥 전체 종목 정보 갱신
- ⚡ **Rate Limiting**: 서버 부하 최소화 및 IP 차단 방지
- 💿 **백그라운드 업데이트**: 앱 사용 중에도 백그라운드에서 조용히 DB 업데이트

## 🚀 시작하기

### 요구사항
- macOS 10.14 (Mojave) 이상
- Node.js 20.x 이상

### 다운로드 및 설치

#### 사전 빌드된 앱 다운로드 (권장)
[Releases 페이지](../../releases)에서 최신 DMG 파일을 다운로드하세요.

1. `Maantano-Ticker-x.x.x.dmg` 파일 다운로드
2. DMG 파일 열기
3. Maantano Ticker 아이콘을 Applications 폴더로 드래그
4. Applications에서 실행

#### 소스에서 빌드
```bash
# 저장소 클론
git clone https://github.com/YOUR_USERNAME/maantano-ticker.git
cd maantano-ticker

# 의존성 설치
npm install

# 개발 모드로 실행
npm run dev

# 프로덕션 빌드
npm run build
```

빌드된 앱은 `dist/` 폴더에 생성됩니다.

## 📖 사용법

### 첫 실행
1. 앱을 실행하면 메뉴바에 차트 아이콘이 표시됩니다
2. 아이콘을 클릭하여 메인 창을 엽니다
3. 환영 메시지를 확인하고 "확인" 버튼을 클릭합니다

### 종목 추가
1. 메인 창에서 **"+ 종목 추가"** 버튼 클릭
2. 검색창에 종목명 또는 코드 입력 (예: "삼성전자", "005930")
3. 자동완성 목록에서 원하는 종목 선택
4. 종목이 리스트에 추가됨

### 종목 관리
- **순서 변경**: 종목을 드래그 앤 드롭으로 이동
- **종목 삭제**: 각 종목 우측의 "삭제" 버튼 클릭
- **수동 업데이트**: 하단의 새로고침 버튼 클릭

### 메뉴바 색상 변경
1. 하단의 설정(⚙️) 버튼 클릭
2. "텍스트 색상" 섹션에서 원하는 색상 선택
3. 메뉴바 텍스트 색상이 즉시 변경됨

사용 가능한 색상:
- 화이트, 블랙, 그레이
- 레드, 오렌지, 옐로우
- 그린, 틸, 블루

### 메뉴바 정보 해석
메뉴바에는 첫 번째 종목의 정보가 표시됩니다:

```
삼성전자 72,100 ▲ 1,200 +1.69%
│         │       │   │      └─ 등락률
│         │       │   └─ 등락폭
│         │       └─ 상승/하락 표시 (▲ 상승, ▼ 하락)
│         └─ 현재가
└─ 종목명
```

## 🛠️ 개발

### 프로젝트 구조
```
maantano-ticker/
├── src/
│   ├── main/
│   │   └── index.js              # Electron 메인 프로세스
│   ├── renderer/
│   │   ├── index.html            # UI 마크업
│   │   ├── app.js                # UI 로직
│   │   └── styles.css            # 스타일
│   ├── services/
│   │   ├── StockDataManager.js   # 주가 데이터 관리
│   │   └── StockDBUpdater.js     # 종목 DB 업데이트
│   ├── models/
│   │   └── Stock.js              # 주식 데이터 모델
│   ├── data/
│   │   └── stocks-db.json        # 종목 데이터베이스
│   └── assets/                   # 아이콘 및 리소스
├── .github/
│   └── workflows/                # GitHub Actions CI/CD
├── build/                        # 빌드 설정
├── CHANGELOG.md                  # 변경 이력
├── RELEASE.md                    # 릴리스 가이드
└── package.json
```

### 개발 명령어

```bash
# 개발 모드 실행 (DevTools 포함)
npm run dev

# 프로덕션 실행
npm start

# macOS 앱 빌드
npm run build:mac

# 버전 릴리스 (자동 CHANGELOG 생성)
npm run release:patch   # 1.1.0 → 1.1.1
npm run release:minor   # 1.1.0 → 1.2.0
npm run release:major   # 1.1.0 → 2.0.0
```

### 기술 스택

**프론트엔드**
- Electron 28.x - 데스크톱 앱 프레임워크
- Vanilla JavaScript - UI 로직
- CSS3 - 스타일링

**백엔드**
- Node.js - 런타임
- axios - HTTP 요청
- cheerio - HTML 파싱 (웹 스크래핑)
- canvas - 메뉴바 아이콘 렌더링
- electron-store - 로컬 데이터 저장

**개발 도구**
- electron-builder - 앱 빌드 및 패키징
- standard-version - 자동 버전 관리
- GitHub Actions - CI/CD 자동화

## 📝 버전 관리 및 배포

이 프로젝트는 [Semantic Versioning](https://semver.org/)과 [Conventional Commits](https://www.conventionalcommits.org/)를 따릅니다.

자세한 릴리스 프로세스는 [RELEASE.md](./RELEASE.md)를 참조하세요.

### 최근 릴리스
- **v1.1.0** (2025-10-16): 트레이 텍스트 색상 커스터마이징 기능 추가
- **v1.0.1**: 동적 창 크기 조정 및 환영 화면 개선
- **v1.0.0**: 초기 릴리스

전체 변경 이력은 [CHANGELOG.md](./CHANGELOG.md)를 참조하세요.

## 🤝 기여하기

기여는 언제나 환영합니다! 다음과 같은 방법으로 기여할 수 있습니다:

1. 이슈 리포트: 버그나 기능 요청
2. Pull Request: 코드 개선 및 기능 추가
3. 문서 개선: README, 가이드 업데이트

### 기여 프로세스
1. 저장소 Fork
2. Feature 브랜치 생성 (`git checkout -b feat/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'feat: add amazing feature'`)
4. 브랜치에 Push (`git push origin feat/amazing-feature`)
5. Pull Request 생성

커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따라주세요.

## ⚠️ 면책 조항 및 주의사항

### 데이터 정확성
- 제공되는 주식 시세 데이터의 정확성을 보장하지 않습니다
- 이 데이터를 바탕으로 한 투자 결정에 대한 책임은 전적으로 사용자에게 있습니다
- **투자 손실에 대해 개발자는 어떠한 책임도 지지 않습니다**

### 사용 제한
- 과도한 API 요청으로 인한 IP 차단 가능성이 있습니다
- 개인적인 용도로만 사용하시기 바랍니다
- 상업적 사용 또는 대량 배포 시 네이버 측에서 법적 조치를 취할 수 있습니다
- 네이버 금융의 robots.txt 및 이용약관을 준수해야 합니다

**이 앱을 다운로드하거나 사용함으로써, 위의 모든 조항에 동의하는 것으로 간주됩니다.**

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

**단, 네이버 금융 데이터의 저작권은 네이버에 있으며, 이 라이선스는 해당 데이터에 적용되지 않습니다.**

## 🙏 Credits

- 차트 아이콘: [Freepik - Flaticon](https://www.flaticon.com/kr/free-icons/)
- 뒤로 화살표 아이콘: [Andrean Prabowo - Flaticon](https://www.flaticon.com/kr/free-icons/-)
- 주식 데이터: 네이버 금융

## 💬 문의 및 지원

- 버그 리포트: [Issues](../../issues)
- 기능 요청: [Issues](../../issues)
- 문의: contact@maantano-ticker.com

---

<div align="center">

**Maantano Ticker**로 더 스마트한 투자 모니터링을 경험하세요!

⭐ 이 프로젝트가 도움이 되셨다면 Star를 눌러주세요!

</div>
