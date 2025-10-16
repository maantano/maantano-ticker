# 릴리스 가이드

이 문서는 Maantano Ticker의 버전 관리 및 배포 프로세스를 설명합니다.

## 버전 관리 전략

이 프로젝트는 [Semantic Versioning 2.0.0](https://semver.org/lang/ko/)과 [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/)를 따릅니다.

### 버전 번호 체계

- **MAJOR (1.x.x)**: 호환성이 깨지는 API 변경
- **MINOR (x.1.x)**: 하위 호환성을 유지하는 새로운 기능 추가
- **PATCH (x.x.1)**: 하위 호환성을 유지하는 버그 수정

### 커밋 메시지 규칙

```
<타입>: <제목>

<본문>

<푸터>
```

**타입:**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 리팩토링
- `perf`: 성능 개선
- `test`: 테스트 추가/수정
- `chore`: 빌드 설정, 패키지 관리 등

**예시:**
```bash
feat: add dark mode support
fix: resolve memory leak in stock updater
docs: update installation guide
```

## 릴리스 프로세스

### 1. 기능 개발 및 커밋

개발 중에는 Conventional Commits 규칙에 따라 커밋합니다:

```bash
git add .
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
```

### 2. 자동 버전 업데이트

개발이 완료되면 `standard-version`을 사용하여 자동으로 버전을 업데이트합니다:

```bash
# 자동 버전 결정 (커밋 메시지 기반)
npm run release

# 또는 명시적으로 버전 지정
npm run release:patch   # 1.0.1 -> 1.0.2
npm run release:minor   # 1.0.1 -> 1.1.0
npm run release:major   # 1.0.1 -> 2.0.0
```

이 명령은 다음 작업을 자동으로 수행합니다:
1. package.json의 버전 업데이트
2. CHANGELOG.md 생성/업데이트
3. 변경사항 커밋
4. Git 태그 생성

### 3. GitHub에 푸시

```bash
git push --follow-tags origin main
```

태그를 푸시하면 GitHub Actions가 자동으로:
1. macOS 앱 빌드 (DMG, ZIP)
2. GitHub Release 생성
3. 빌드된 파일 업로드

### 4. 릴리스 확인

GitHub 저장소의 Releases 페이지에서 새 릴리스를 확인할 수 있습니다.

## 로컬 빌드

릴리스 전에 로컬에서 빌드를 테스트하려면:

```bash
# 개발 모드 실행
npm run dev

# 프로덕션 빌드
npm run build

# macOS만 빌드
npm run build:mac
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

## GitHub Actions 워크플로우

### Build Workflow (build.yml)
- **트리거**: main 브랜치에 push 또는 PR
- **목적**: 코드 변경시 빌드 검증
- **아티팩트**: 7일간 보관

### Release Workflow (release.yml)
- **트리거**: `v*` 태그 push (예: v1.0.2)
- **목적**: 정식 릴리스 생성 및 배포
- **아티팩트**: GitHub Release에 영구 저장

## 주의사항

1. **태그는 자동 생성**: `git tag` 수동 생성 대신 `npm run release` 사용
2. **커밋 메시지 중요**: 버전 결정과 CHANGELOG 생성에 사용됨
3. **main 브랜치 보호**: 직접 push보다는 PR을 통한 병합 권장
4. **빌드 환경**: GitHub Actions는 최신 macOS 환경 사용

## 체크리스트

릴리스 전 확인사항:

- [ ] 모든 테스트 통과
- [ ] 로컬에서 빌드 성공
- [ ] 커밋 메시지 규칙 준수
- [ ] CHANGELOG 확인
- [ ] 버전 번호 확인
- [ ] GitHub Actions 워크플로우 성공

## 문제 해결

### 빌드 실패
- `node_modules` 삭제 후 `npm install` 재실행
- Node.js 버전 확인 (v20 권장)

### 릴리스 실패
- GitHub 토큰 권한 확인
- 태그 중복 여부 확인
- Actions 로그 확인

## 참고 자료

- [Semantic Versioning](https://semver.org/lang/ko/)
- [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/)
- [standard-version](https://github.com/conventional-changelog/standard-version)
- [electron-builder](https://www.electron.build/)
