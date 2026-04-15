// Frontend state for the selected category and answer lock.
const state = {
  category: "test",
  locked: false,
  testQuestions: [],
  testAnswers: [],
  currentTestIndex: 0
};

const categoryButtons = [...document.querySelectorAll(".category-button")];
const wordElement = document.getElementById("word");
const pronunciationElement = document.getElementById("pronunciation");
const optionsElement = document.getElementById("options");
const resultElement = document.getElementById("result");
const hintElement = document.getElementById("hint");
const progressElement = document.getElementById("progress");
const newsCardElement = document.getElementById("news-card");
const articleTitleElement = document.getElementById("article-title");
const articleMetaElement = document.getElementById("article-meta");
const articleLinkElement = document.getElementById("article-link");
const newsContextElement = document.getElementById("news-context");
const categoryLabels = {
  toeic: "TOEIC",
  csat: "수능",
  gre: "GRE"
};

function setActiveCategory(category) {
  state.category = category;
  state.locked = false;

  if (category !== "test") {
    state.testQuestions = [];
    state.testAnswers = [];
    state.currentTestIndex = 0;
  }

  categoryButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.category === category);
  });
}

function renderResult(message, type = "") {
  resultElement.className = `result ${type}`.trim();
  resultElement.innerHTML = message;
}

function buildArticleMeta(question) {
  const parts = [];

  if (question.sourceName) {
    parts.push(question.sourceName);
  }

  if (question.articleDate) {
    parts.push(question.articleDate);
  }

  if (question.mode === "fallback") {
    parts.push("예시 기사");
  }

  return parts.join(" · ");
}

function updateNewsCard(question) {
  if (question.category !== "news" || !question.contextHtml) {
    newsCardElement.classList.add("hidden");
    articleTitleElement.textContent = "";
    articleMetaElement.textContent = "";
    newsContextElement.innerHTML = "";
    articleLinkElement.href = "#";
    return;
  }

  newsCardElement.classList.remove("hidden");
  articleTitleElement.textContent = question.articleTitle || "오늘의 뉴스";
  articleMetaElement.textContent = buildArticleMeta(question);
  newsContextElement.innerHTML = question.contextHtml;
  articleLinkElement.href = question.articleUrl || "#";
}

function updateProgress(text = "") {
  progressElement.textContent = text;
  progressElement.classList.toggle("hidden", !text);
}

function renderOptions(options, onSelect) {
  optionsElement.innerHTML = "";

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.innerHTML = `
      <span class="option-label">${option.label}</span>
      <span class="option-text">${option.text}</span>
    `;
    button.addEventListener("click", () => onSelect(option.label));
    optionsElement.appendChild(button);
  });
}

async function renderCurrentTestQuestion() {
  const question = state.testQuestions[state.currentTestIndex];

  if (!question) {
    return;
  }

  state.locked = false;
  wordElement.textContent = question.word;
  pronunciationElement.textContent = question.pronunciation;
  hintElement.textContent = "영어 단어를 보고 알맞은 한글 뜻을 고르세요.";
  updateProgress(`테스트 ${question.number} / ${state.testQuestions.length}`);
  updateNewsCard({ category: "" });

  renderOptions(question.options, async (selectedLabel) => {
    if (state.locked) {
      return;
    }

    state.locked = true;
    state.testAnswers.push({
      number: question.number,
      selectedLabel
    });

    if (state.currentTestIndex === state.testQuestions.length - 1) {
      await submitPlacementTest();
      return;
    }

    state.currentTestIndex += 1;
    await renderCurrentTestQuestion();
  });

  renderResult("20문제를 모두 풀면 추천 카테고리를 알려드립니다.");
}

async function loadPlacementTest() {
  renderResult("배치 테스트를 불러오는 중입니다.");
  optionsElement.innerHTML = "";

  try {
    const response = await fetch("/api/test");

    if (!response.ok) {
      renderResult("테스트를 불러오지 못했습니다.", "error");
      return;
    }

    const payload = await response.json();
    state.testQuestions = payload.questions || [];
    state.testAnswers = [];
    state.currentTestIndex = 0;

    await renderCurrentTestQuestion();
  } catch (error) {
    renderResult("테스트를 불러오는 중 네트워크 오류가 발생했습니다.", "error");
  }
}

async function submitPlacementTest() {
  renderResult("결과를 계산하는 중입니다.");

  try {
    const response = await fetch("/api/test/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        answers: state.testAnswers
      })
    });

    if (!response.ok) {
      renderResult("테스트 결과 계산에 실패했습니다.", "error");
      return;
    }

    const result = await response.json();
    updateProgress(`테스트 완료 · ${result.score} / ${result.totalQuestions}`);
    wordElement.textContent = "테스트 완료";
    pronunciationElement.textContent = "";
    hintElement.textContent = "추천 카테고리로 이동해서 바로 단어 학습을 이어갈 수 있습니다.";
    optionsElement.innerHTML = "";
    renderResult(
      `<strong>${result.score}문제 정답</strong>${result.recommendationMessage}<br />추천 카테고리: ${categoryLabels[result.recommendedCategory]}`,
      "success"
    );
  } catch (error) {
    renderResult("테스트 결과 계산 중 네트워크 오류가 발생했습니다.", "error");
  }
}

// Loads today's quiz for the active category and redraws the screen.
async function loadQuestion() {
  if (state.category === "test") {
    await loadPlacementTest();
    return;
  }

  renderResult("오늘의 문제를 불러오는 중입니다.");
  optionsElement.innerHTML = "";
  updateProgress("서울 시간 기준으로 매일 문제 갱신");

  try {
    const response = await fetch(`/api/question?category=${state.category}`);

    if (!response.ok) {
      renderResult("문제를 불러오지 못했습니다.", "error");
      return;
    }

    const question = await response.json();
    wordElement.textContent = question.word;
    pronunciationElement.textContent = question.pronunciation;
    hintElement.textContent =
      question.category === "news"
        ? "기사 발췌문과 날짜를 확인하고, 밑줄 친 단어의 뜻을 고르세요."
        : "왼쪽 단어를 보고 오른쪽 영어 뜻 중 가장 알맞은 것을 고르세요.";

    updateNewsCard(question);
    renderOptions(question.options, (selectedLabel) => submitAnswer(selectedLabel));
    renderResult("정답을 하나 선택하세요.");
  } catch (error) {
    renderResult("문제를 불러오는 중 네트워크 오류가 발생했습니다.", "error");
  }
}

// Sends the selected option to the server and prints the result message.
async function submitAnswer(selectedLabel) {
  if (state.locked) {
    return;
  }

  state.locked = true;

  try {
    const response = await fetch("/api/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        category: state.category,
        selectedLabel
      })
    });

    if (!response.ok) {
      renderResult("정답 확인 중 오류가 발생했습니다.", "error");
      state.locked = false;
      return;
    }

    const result = await response.json();

    if (result.isCorrect) {
      renderResult(
        `<strong>정답입니다.</strong>${result.selectedLabel}. ${result.selectedText}`,
        "success"
      );
      return;
    }

    renderResult(
      `<strong>오답입니다.</strong>정답은 ${result.correctLabel}번입니다.<br />${result.correctLabel}. ${result.correctText}`,
      "error"
    );
  } catch (error) {
    renderResult("정답 확인 중 네트워크 오류가 발생했습니다.", "error");
    state.locked = false;
  }
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    setActiveCategory(button.dataset.category);
    await loadQuestion();
  });
});

setActiveCategory(state.category);
loadQuestion();
