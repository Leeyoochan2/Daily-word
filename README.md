# Daily Word Test

영어 단어 학습용 웹앱입니다.  
배치 테스트로 먼저 현재 수준을 확인한 뒤, `TOEIC`, `수능`, `GRE`, `NEWS` 카테고리에서 단어 학습을 이어갈 수 있습니다.

## 주요 기능

- `테스트` 카테고리에서 20문제 배치 테스트 제공
- 테스트는 `TOEIC 8문제`, `수능 8문제`, `GRE 4문제`로 구성
- 테스트 문제는 고정되어 있어 날짜와 무관하게 동일하게 제공
- 테스트 점수에 따라 추천 카테고리 안내
- `TOEIC`, `수능`, `GRE`, `NEWS`는 서울 시간 기준으로 매일 다른 문제 제공
- `NEWS` 카테고리는 기사 발췌문, 출처, 기사 날짜를 함께 표시
- 별도 프레임워크 없이 `Node.js` 기본 `http` 서버로 동작

## 배치 테스트 추천 기준

- `0~9점`: TOEIC 추천
- `10~15점`: 수능 추천
- `16~20점`: GRE 추천

## 실행 방법

```bash
npm start
```

또는

```bash
node server.js
```

브라우저에서 `http://localhost:3000`으로 접속하면 됩니다.

## NEWS 카테고리 동작 방식

- 먼저 `New York Times Top Stories API`를 시도합니다.
- `NYT_API_KEY`가 없거나 적절한 단어를 찾지 못하면 BBC RSS를 시도합니다.
- 둘 다 실패하면 프로젝트에 포함된 예시 기사 문장을 사용합니다.

PowerShell 예시:

```powershell
$env:NYT_API_KEY="your_key_here"
node server.js
```

## 파일 구조

- `server.js`: API 및 정적 파일 제공
- `public/index.html`: 화면 구조
- `public/app.js`: 테스트 진행, 일일 문제 로딩, 정답 제출, 결과 표시
- `public/styles.css`: 검은색 기반 UI 스타일

## GitHub 리포에서 확인할 수 있는 내용

- 배치 테스트와 추천 카테고리 흐름
- 일일 단어 문제 제공 방식
- 뉴스 기사 발췌 및 날짜 표시 방식
- 순수 Node.js 기반의 간단한 웹앱 구조

## 게시판에 올릴 소개 문구 예시

```text
영어 단어 학습 웹앱 만들어봤습니다.
배치 테스트로 현재 수준을 확인한 뒤 TOEIC / 수능 / GRE / NEWS 단어 학습으로 이어갈 수 있습니다.

실행 주소: https://your-deployed-url
GitHub: https://github.com/Leeyoochan2/Daily-word
```

## 비고

- 학습/포트폴리오 용도로 만든 프로젝트입니다.
- 공개 배포는 Render 같은 서비스에 GitHub 리포를 연결해 진행할 수 있습니다.
