# Daily Word Test

간단한 영어 단어 퀴즈 웹앱입니다.  
카테고리를 고르면 서울 시간 기준으로 매일 다른 단어 1문제가 나오고, 4지선다로 뜻을 맞히는 방식입니다.

## 무엇을 하는 프로그램인가

- `GRE`, `TOEIC`, `수능`, `NEWS` 카테고리별 오늘의 단어를 보여줍니다.
- 단어, 발음기호, 4개의 뜻 보기 중 정답을 고를 수 있습니다.
- `NEWS` 카테고리는 뉴스 문장 속 핵심 단어를 함께 보여줍니다.
- 별도 프레임워크 없이 `Node.js` 기본 `http` 서버로 동작합니다.

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

- `server.js`: API와 정적 파일 제공
- `public/index.html`: 화면 구조
- `public/app.js`: 퀴즈 로딩, 답안 제출, 결과 표시
- `public/styles.css`: UI 스타일

## 게시판에 올릴 소개 문구 예시

아래 문구에서 주소만 바꿔서 게시판 댓글에 올리면 됩니다.

```text
영어 단어 퀴즈 웹앱 만들어봤습니다.
GRE / TOEIC / 수능 / NEWS 카테고리로 오늘의 단어 1문제를 풀 수 있습니다.

실행 주소: https://your-deployed-url
GitHub: https://github.com/Leeyoochan2/Daily-word
```

## 비고

- 이 프로젝트는 학습/포트폴리오 용도로 만들었습니다.
- 실제 배포를 하려면 Render, Railway, Vercel 같은 서비스에 올린 뒤 배포 주소를 게시판에 공유하면 됩니다.
