// Frontend state for the selected category and answer lock.
const state = {
  category: "gre",
  locked: false
};

const categoryButtons = [...document.querySelectorAll(".category-button")];
const wordElement = document.getElementById("word");
const pronunciationElement = document.getElementById("pronunciation");
const optionsElement = document.getElementById("options");
const resultElement = document.getElementById("result");
const hintElement = document.getElementById("hint");
const newsCardElement = document.getElementById("news-card");
const articleTitleElement = document.getElementById("article-title");
const articleMetaElement = document.getElementById("article-meta");
const articleLinkElement = document.getElementById("article-link");
const newsContextElement = document.getElementById("news-context");

function setActiveCategory(category) {
  state.category = category;
  state.locked = false;

  categoryButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.category === category);
  });
}

function renderResult(message, type = "") {
  resultElement.className = `result ${type}`.trim();
  resultElement.innerHTML = message;
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
  articleTitleElement.textContent = question.articleTitle || "Today in the news";
  articleMetaElement.textContent =
    question.sourceName && question.mode === "fallback"
      ? `${question.sourceName} 예시 발췌문`
      : question.sourceName || "";
  newsContextElement.innerHTML = question.contextHtml;
  articleLinkElement.href = question.articleUrl || "#";
}

// Loads today's quiz for the active category and redraws the screen.
async function loadQuestion() {
  renderResult("오늘의 문제를 불러오는 중입니다.");
  optionsElement.innerHTML = "";

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
        ? "기사 발췌문에서 밑줄 친 단어를 확인하고 오른쪽 뜻 문제를 풀어보세요."
        : "왼쪽 단어를 보고 오른쪽 영어 뜻 중 가장 알맞은 것을 고르세요.";

    updateNewsCard(question);

    question.options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-button";
      button.innerHTML = `
        <span class="option-label">${option.label}</span>
        <span class="option-text">${option.text}</span>
      `;
      button.addEventListener("click", () => submitAnswer(option.label));
      optionsElement.appendChild(button);
    });

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
        `<strong>O 정답입니다.</strong>${result.selectedLabel}. ${result.selectedText}`,
        "success"
      );
      return;
    }

    renderResult(
      `<strong>X 오답입니다.</strong>정답은 ${result.correctLabel}번입니다.<br />${result.correctLabel}. ${result.correctText}`,
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
