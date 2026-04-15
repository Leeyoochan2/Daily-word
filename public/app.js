const state = {
  category: "gre",
  locked: false
};

const categoryButtons = [...document.querySelectorAll(".category-button")];
const wordElement = document.getElementById("word");
const pronunciationElement = document.getElementById("pronunciation");
const optionsElement = document.getElementById("options");
const resultElement = document.getElementById("result");

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

async function loadQuestion() {
  renderResult("오늘의 문제를 불러오는 중입니다.");
  optionsElement.innerHTML = "";

  const response = await fetch(`/api/question?category=${state.category}`);

  if (!response.ok) {
    renderResult("문제를 불러오지 못했습니다.", "error");
    return;
  }

  const question = await response.json();
  wordElement.textContent = question.word;
  pronunciationElement.textContent = question.pronunciation;

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
}

async function submitAnswer(selectedLabel) {
  if (state.locked) {
    return;
  }

  state.locked = true;

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
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    setActiveCategory(button.dataset.category);
    await loadQuestion();
  });
});

setActiveCategory(state.category);
loadQuestion();
