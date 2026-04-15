const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const SEOUL_TIMEZONE = "Asia/Seoul";

const WORDS = {
  gre: [
    {
      word: "abstruse",
      pronunciation: "/ab-STROOS/",
      correct: "difficult to understand; obscure",
      distractors: [
        "easily noticed because it is obvious",
        "showing kindness to strangers",
        "relating to farming or rural life"
      ]
    },
    {
      word: "laconic",
      pronunciation: "/luh-KON-ik/",
      correct: "using very few words",
      distractors: [
        "full of praise and admiration",
        "likely to change without warning",
        "deeply rooted in tradition"
      ]
    },
    {
      word: "obdurate",
      pronunciation: "/OB-duh-rit/",
      correct: "stubbornly refusing to change one's opinion",
      distractors: [
        "eager to forgive past mistakes",
        "suited for public celebration",
        "causing a pleasant surprise"
      ]
    },
    {
      word: "pellucid",
      pronunciation: "/puh-LOO-sid/",
      correct: "clear in meaning or style; transparent",
      distractors: [
        "having a rough uneven surface",
        "carefully hidden from view",
        "marked by strong anger"
      ]
    },
    {
      word: "sagacious",
      pronunciation: "/suh-GAY-shus/",
      correct: "wise and showing good judgment",
      distractors: [
        "acting without any preparation",
        "easily broken under pressure",
        "lacking interest in practical matters"
      ]
    }
  ],
  toeic: [
    {
      word: "invoice",
      pronunciation: "/IN-voys/",
      correct: "a document listing goods or services and the money owed",
      distractors: [
        "a formal meeting between job candidates",
        "a machine used for office security",
        "a vacation policy for employees"
      ]
    },
    {
      word: "deadline",
      pronunciation: "/DED-line/",
      correct: "the latest time by which something must be finished",
      distractors: [
        "the first day of a new fiscal year",
        "a line that separates departments",
        "a payment made before work begins"
      ]
    },
    {
      word: "renovate",
      pronunciation: "/REN-uh-vayt/",
      correct: "to repair and improve a building or room",
      distractors: [
        "to cancel a business contract",
        "to deliver products overseas",
        "to reduce employee salaries"
      ]
    },
    {
      word: "commute",
      pronunciation: "/kuh-MYOOT/",
      correct: "to travel regularly between home and work",
      distractors: [
        "to speak at a formal conference",
        "to send a package by express mail",
        "to inspect a factory for safety"
      ]
    },
    {
      word: "merchandise",
      pronunciation: "/MUR-chuhn-dyse/",
      correct: "goods that are bought and sold",
      distractors: [
        "data stored in company servers",
        "benefits given after retirement",
        "documents required for immigration"
      ]
    }
  ],
  csat: [
    {
      word: "resilient",
      pronunciation: "/ri-ZIL-yuhnt/",
      correct: "able to recover quickly after difficulty or stress",
      distractors: [
        "wanting to avoid all social contact",
        "moving in a slow and graceful way",
        "done only for scientific purposes"
      ]
    },
    {
      word: "conserve",
      pronunciation: "/kuhn-SURV/",
      correct: "to protect something from loss or waste",
      distractors: [
        "to divide something into equal parts",
        "to describe an event in detail",
        "to delay a plan until next year"
      ]
    },
    {
      word: "novel",
      pronunciation: "/NOV-uhl/",
      correct: "new and different from what is familiar",
      distractors: [
        "connected to ancient history",
        "impossible to describe with words",
        "based entirely on personal profit"
      ]
    },
    {
      word: "trigger",
      pronunciation: "/TRIG-er/",
      correct: "to cause something to start",
      distractors: [
        "to hide a result from others",
        "to compare two unrelated ideas",
        "to make a surface shine brightly"
      ]
    },
    {
      word: "allocate",
      pronunciation: "/AL-uh-kayt/",
      correct: "to distribute resources for a particular purpose",
      distractors: [
        "to remove names from a list",
        "to accept blame for a mistake",
        "to memorize facts very quickly"
      ]
    }
  ]
};

function getDateKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(new Date());
}

function hashSeed(input) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function createRng(seed) {
  let state = seed || 1;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle(items, seedText) {
  const array = [...items];
  const random = createRng(hashSeed(seedText));

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function getCategoryQuestion(category) {
  const key = String(category || "").toLowerCase();
  const pool = WORDS[key];

  if (!pool) {
    return null;
  }

  const dateKey = getDateKey();
  const wordIndex = hashSeed(`${key}:${dateKey}:word`) % pool.length;
  const entry = pool[wordIndex];

  const options = shuffle(
    [
      { id: "correct", text: entry.correct },
      ...entry.distractors.map((text, index) => ({
        id: `wrong-${index + 1}`,
        text
      }))
    ],
    `${key}:${dateKey}:options`
  ).map((option, index) => ({
    label: String.fromCharCode(65 + index),
    id: option.id,
    text: option.text
  }));

  const correctOption = options.find((option) => option.id === "correct");

  return {
    category: key,
    dateKey,
    word: entry.word,
    pronunciation: entry.pronunciation,
    options,
    correctLabel: correctOption.label,
    correctText: correctOption.text
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function serveFile(filePath, response) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8"
    };

    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream"
    });
    response.end(content);
  });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      resolve(body);
    });

    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/question") {
    const question = getCategoryQuestion(url.searchParams.get("category"));

    if (!question) {
      sendJson(response, 400, { error: "Invalid category" });
      return;
    }

    sendJson(response, 200, {
      category: question.category,
      dateKey: question.dateKey,
      word: question.word,
      pronunciation: question.pronunciation,
      options: question.options.map(({ label, text }) => ({ label, text }))
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/answer") {
    try {
      const body = await readBody(request);
      const { category, selectedLabel } = JSON.parse(body || "{}");
      const question = getCategoryQuestion(category);

      if (!question) {
        sendJson(response, 400, { error: "Invalid category" });
        return;
      }

      const selected = question.options.find(
        (option) => option.label === String(selectedLabel || "").toUpperCase()
      );

      if (!selected) {
        sendJson(response, 400, { error: "Invalid option" });
        return;
      }

      const isCorrect = selected.id === "correct";

      sendJson(response, 200, {
        isCorrect,
        selectedLabel: selected.label,
        selectedText: selected.text,
        correctLabel: question.correctLabel,
        correctText: question.correctText
      });
    } catch (error) {
      sendJson(response, 400, { error: "Invalid request body" });
    }
    return;
  }

  if (request.method === "GET") {
    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.join(PUBLIC_DIR, requestedPath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    serveFile(filePath, response);
    return;
  }

  response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`Daily Word Test running at http://localhost:${PORT}`);
});
