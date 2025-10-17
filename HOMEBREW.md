# Homebrew 배포 가이드

## 1. Homebrew Tap 저장소 생성

### GitHub에서 새 저장소 생성
- 저장소 이름: `homebrew-maantano` (반드시 `homebrew-` 접두사 필요!)
- Public 저장소로 설정
- Initialize with README 체크

### Cask formula 파일 추가
```bash
# homebrew-maantano 저장소 클론
git clone https://github.com/YOUR_USERNAME/homebrew-maantano.git
cd homebrew-maantano

# Casks 디렉토리 생성
mkdir -p Casks

# maantano-ticker.rb 파일 복사
cp ../maantano-ticker/Casks/maantano-ticker.rb Casks/

# Commit & Push
git add Casks/maantano-ticker.rb
git commit -m "Add maantano-ticker cask"
git push
```

## 2. Cask Formula 수정

`Casks/maantano-ticker.rb` 파일에서 다음 항목 수정:
- `YOUR_USERNAME` → 실제 GitHub 사용자명으로 변경
- `version` → 릴리스 버전에 맞게 자동 업데이트

## 3. 사용자 설치 방법

### Tap 추가 후 설치
```bash
brew tap YOUR_USERNAME/maantano
brew install --cask maantano-ticker
```

### 한 줄 명령어
```bash
brew install --cask YOUR_USERNAME/maantano/maantano-ticker
```

## 4. 새 버전 릴리스 시

### 자동 방법 (권장)
SHA256 체크섬을 `:no_check`로 설정해두면 자동으로 최신 버전 다운로드

### 수동 방법
1. 새 릴리스 태그 푸시
2. GitHub Actions가 DMG 생성
3. `Casks/maantano-ticker.rb`의 `version` 업데이트
4. Commit & Push

```bash
cd homebrew-maantano
# version 변경
vim Casks/maantano-ticker.rb
git add Casks/maantano-ticker.rb
git commit -m "Bump maantano-ticker to v1.2.0"
git push
```

## 5. Cask 검증

```bash
# Cask formula 문법 검사
brew audit --cask maantano-ticker

# Cask 스타일 검사
brew style Casks/maantano-ticker.rb

# 로컬 테스트 설치
brew install --cask --no-quarantine Casks/maantano-ticker.rb
```

## 6. 공식 Homebrew Cask에 등록 (선택사항)

인기가 많아지면 공식 homebrew-cask에 PR 가능:

```bash
# homebrew-cask 저장소 포크
# PR 제출
# 리뷰 후 merge되면 공식 cask 등록 완료
```

그 후 사용자는 다음과 같이 설치 가능:
```bash
brew install --cask maantano-ticker
```
