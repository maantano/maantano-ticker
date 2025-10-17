# Release 체크리스트

## 교차 검증 완료 ✅

### 1. 로컬 빌드 검증
- ✅ `package-lock.json` 존재 확인
- ✅ `.gitignore`에서 `package-lock.json` 제거
- ✅ Clean install (`rm -rf node_modules && npm install`)
- ✅ 빌드 성공 (`npm run build:mac`)
- ✅ 생성된 파일:
  - `Maantano Ticker-1.1.0.dmg` (104M) - Intel
  - `Maantano Ticker-1.1.0-arm64.dmg` (99M) - Apple Silicon
  - `Maantano Ticker-1.1.0-mac.zip` (101M) - Intel
  - `Maantano Ticker-1.1.0-arm64-mac.zip` (95M) - Apple Silicon

### 2. GitHub Actions 설정 검증
- ✅ `.github/workflows/release.yml` 업데이트
  - `npm ci` 사용 (lock 파일 기반 설치)
  - 빌드 아티팩트 목록 출력 추가
  - Blockmap 파일도 릴리스에 포함
  - 릴리스 노트 자동 생성
- ✅ `.github/workflows/build.yml` 정상 작동

### 3. Homebrew Cask 설정
- ✅ `Casks/maantano-ticker.rb` 생성
- ✅ `HOMEBREW.md` 가이드 작성
- ✅ Apple Silicon / Intel 아키텍처 자동 감지

## 릴리스 프로세스

### 로컬에서 새 버전 릴리스
```bash
# 1. 버전 업데이트 (package.json, CHANGELOG.md 자동 수정)
npm run release:patch   # 1.1.0 → 1.1.1 (버그 수정)
npm run release:minor   # 1.1.0 → 1.2.0 (기능 추가)
npm run release:major   # 1.1.0 → 2.0.0 (Breaking changes)

# 2. Git push
git push --follow-tags origin main

# 3. GitHub Actions가 자동으로:
#    - DMG/ZIP 빌드
#    - GitHub Release 생성
#    - 파일 업로드
```

### GitHub Actions 동작 확인
1. https://github.com/YOUR_USERNAME/maantano-ticker/actions
2. "Release" workflow 실행 확인
3. "List build artifacts" 스텝에서 파일 목록 확인
4. Release 페이지에서 DMG/ZIP 파일 다운로드 가능 확인

### Homebrew 배포 (선택사항)
1. `homebrew-maantano` 저장소 생성
2. `Casks/maantano-ticker.rb` 파일 추가
3. GitHub username 수정
4. Push

사용자 설치:
```bash
brew tap YOUR_USERNAME/maantano
brew install --cask maantano-ticker
```

## 검증 포인트

### ✅ CI/CD 성공 조건
- [ ] `npm ci` 성공 (package-lock.json 사용)
- [ ] `npm run build:mac` 성공
- [ ] `dist/*.dmg` 파일 4개 생성 (Intel/ARM, DMG/ZIP)
- [ ] GitHub Release 생성됨
- [ ] 릴리스에 DMG 파일 첨부됨

### ✅ 빌드 파일 확인
- [ ] Intel DMG: ~104MB
- [ ] ARM64 DMG: ~99MB
- [ ] 둘 다 다운로드 가능
- [ ] 설치 후 정상 실행
- [ ] 메뉴바에 아이콘 표시
- [ ] 첫 설치 시 환영 메시지 표시

### ✅ 코드 서명 없는 앱 설치
- [ ] 우클릭 → "열기"로 보안 경고 우회 가능
- [ ] 정상 실행됨
- [ ] 환영 메시지 2초 후 표시
- [ ] 60초 대기 없음 (첫 설치 DB 크롤링 제거됨)

## 문제 해결

### DMG 파일이 생성되지 않는 경우
```bash
# 1. node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# 2. 캐시 삭제 후 빌드
rm -rf dist/
npm run build:mac
```

### GitHub Actions 빌드 실패
- **package-lock.json 없음**: .gitignore 확인
- **npm ci 실패**: package-lock.json 커밋 확인
- **권한 없음**: GITHUB_TOKEN 자동 제공됨 (설정 불필요)

### Homebrew 설치 실패
- **404 에러**: GitHub Release에 파일 있는지 확인
- **체크섬 오류**: Cask에서 `sha256 :no_check` 사용
- **아키텍처 감지 실패**: `arch arm: "arm64", intel: "x64"` 확인
