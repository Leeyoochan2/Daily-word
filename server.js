// Daily Word Test backend:
// serves the static UI and returns one deterministic quiz per category each day.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const SEOUL_TIMEZONE = "Asia/Seoul";
const QUESTION_CACHE = new Map();

// Each category uses a small built-in word pool.
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
  ],
  news: [
    {
      word: "sanction",
      pronunciation: "/SANGK-shuhn/",
      correct: "an official action taken to penalize or pressure a country or group",
      distractors: [
        "a private meeting held in secret",
        "a scientific claim not yet tested",
        "a reward given for excellent service"
      ]
    },
    {
      word: "coalition",
      pronunciation: "/koh-uh-LISH-uhn/",
      correct: "a temporary alliance formed for a shared goal",
      distractors: [
        "a sudden drop in financial markets",
        "a record of personal memories",
        "a device used to monitor weather"
      ]
    },
    {
      word: "volatile",
      pronunciation: "/VOL-uh-tl/",
      correct: "likely to change suddenly and unpredictably",
      distractors: [
        "carefully documented and archived",
        "designed for long-term stability",
        "limited to one local region"
      ]
    },
    {
      word: "surge",
      pronunciation: "/SURJ/",
      correct: "a sudden and strong increase",
      distractors: [
        "a formal statement of apology",
        "a long period of calm",
        "an informal social gathering"
      ]
    },
    {
      word: "pledge",
      pronunciation: "/PLEJ/",
      correct: "a serious public promise to do something",
      distractors: [
        "a brief delay caused by traffic",
        "a chart showing weather patterns",
        "a machine used in construction"
      ]
    }
  ]
};

const NEWS_FALLBACKS = [
  {
    sourceName: "BBC News",
    articleTitle: "Global coalition seeks broader climate financing push",
    articleUrl: "https://www.bbc.com/news",
    excerpt:
      "Officials said the coalition of donor countries and development banks would meet again next month as negotiators pressed for a more durable funding package.",
    word: "coalition"
  },
  {
    sourceName: "The New York Times",
    articleTitle: "Markets stay volatile as investors weigh new signals",
    articleUrl: "https://www.nytimes.com/section/todayspaper",
    excerpt:
      "Analysts warned that trading could remain volatile after the latest policy comments, with investors revising expectations several times over the day.",
    word: "volatile"
  },
  {
    sourceName: "BBC News",
    articleTitle: "Aid groups report surge in emergency requests",
    articleUrl: "https://www.bbc.com/news",
    excerpt:
      "Relief agencies described a surge in requests for shelter and food after heavy rain disrupted transport routes across several districts.",
    word: "surge"
  }
];

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

function buildOptions(entry, seedText) {
  const options = shuffle(
    [
      { id: "correct", text: entry.correct },
      ...entry.distractors.map((text, index) => ({
        id: `wrong-${index + 1}`,
        text
      }))
    ],
    seedText
  ).map((option, index) => ({
    label: String.fromCharCode(65 + index),
    id: option.id,
    text: option.text
  }));

  const correctOption = options.find((option) => option.id === "correct");

  return {
    options,
    correctLabel: correctOption.label,
    correctText: correctOption.text
  };
}

function buildStandardQuestion(category, dateKey) {
  const pool = WORDS[category];
  const wordIndex = hashSeed(`${category}:${dateKey}:word`) % pool.length;
  const entry = pool[wordIndex];
  const built = buildOptions(entry, `${category}:${dateKey}:options`);

  return {
    category,
    dateKey,
    word: entry.word,
    pronunciation: entry.pronunciation,
    options: built.options,
    correctLabel: built.correctLabel,
    correctText: built.correctText
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(value) {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8230;/g, "...");
}

function stripTags(value) {
  return decodeEntities(String(value).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function highlightWord(text, word) {
  const safe = escapeHtml(text);
  const matcher = new RegExp(`\\b(${word})\\b`, "i");
  return safe.replace(matcher, '<u class="news-underline">$1</u>');
}

function pickDeterministicItem(items, seedText) {
  return items[hashSeed(seedText) % items.length];
}

function parseRssItems(xmlText) {
  const matches = [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

  return matches.map((match) => {
    const itemXml = match[1];

    const getTag = (tagName) => {
      const tagMatch = itemXml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
      return tagMatch ? stripTags(tagMatch[1]) : "";
    };

    return {
      title: getTag("title"),
      description: getTag("description"),
      link: getTag("link"),
      pubDate: getTag("pubDate")
    };
  });
}

function findNewsWordMatch(text) {
  const normalized = String(text || "");

  return WORDS.news.find((entry) => {
    const matcher = new RegExp(`\\b${entry.word}\\b`, "i");
    return matcher.test(normalized);
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "DailyWordTest/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${response.status}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "DailyWordTest/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch text: ${response.status}`);
  }

  return response.text();
}

function buildNewsQuestionFromEntry(baseEntry, article, dateKey, mode) {
  const built = buildOptions(baseEntry, `news:${dateKey}:${baseEntry.word}`);

  return {
    category: "news",
    dateKey,
    word: baseEntry.word,
    pronunciation: baseEntry.pronunciation,
    options: built.options,
    correctLabel: built.correctLabel,
    correctText: built.correctText,
    articleTitle: article.articleTitle,
    articleUrl: article.articleUrl,
    sourceName: article.sourceName,
    contextHtml: highlightWord(article.excerpt, baseEntry.word),
    mode
  };
}

function buildFallbackNewsQuestion(dateKey) {
  const fallback = pickDeterministicItem(NEWS_FALLBACKS, `news:${dateKey}:fallback`);
  const entry = WORDS.news.find((item) => item.word === fallback.word);
  return buildNewsQuestionFromEntry(entry, fallback, dateKey, "fallback");
}

async function tryBuildNytNewsQuestion(dateKey) {
  if (!process.env.NYT_API_KEY) {
    return null;
  }

  const data = await fetchJson(
    `https://api.nytimes.com/svc/topstories/v2/home.json?api-key=${encodeURIComponent(process.env.NYT_API_KEY)}`
  );

  const candidates = (data.results || [])
    .map((item) => ({
      sourceName: "The New York Times",
      articleTitle: item.title || "Top Story",
      articleUrl: item.url || "https://www.nytimes.com/",
      excerpt: item.abstract || item.title || ""
    }))
    .filter((item) => item.excerpt);

  for (const item of candidates) {
    const match = findNewsWordMatch(`${item.articleTitle} ${item.excerpt}`);

    if (match) {
      return buildNewsQuestionFromEntry(match, item, dateKey, "nyt-api");
    }
  }

  return null;
}

async function tryBuildBbcNewsQuestion(dateKey) {
  const xml = await fetchText(
    "http://news.bbc.co.uk/rss/newsonline_uk_edition/latest_published_stories/rss.xml"
  );

  const items = parseRssItems(xml).map((item) => ({
    sourceName: "BBC News",
    articleTitle: item.title || "Latest story",
    articleUrl: item.link || "https://www.bbc.com/news",
    excerpt: item.description || item.title || ""
  }));

  for (const item of items) {
    const match = findNewsWordMatch(`${item.articleTitle} ${item.excerpt}`);

    if (match) {
      return buildNewsQuestionFromEntry(match, item, dateKey, "bbc-rss");
    }
  }

  return null;
}

// NEWS tries live sources first and falls back to bundled sample articles.
async function buildNewsQuestion(dateKey) {
  try {
    const nytQuestion = await tryBuildNytNewsQuestion(dateKey);

    if (nytQuestion) {
      return nytQuestion;
    }
  } catch (error) {
    console.error("NYT news fetch failed:", error.message);
  }

  try {
    const bbcQuestion = await tryBuildBbcNewsQuestion(dateKey);

    if (bbcQuestion) {
      return bbcQuestion;
    }
  } catch (error) {
    console.error("BBC news fetch failed:", error.message);
  }

  return buildFallbackNewsQuestion(dateKey);
}

async function getCategoryQuestion(category) {
  const key = String(category || "").toLowerCase();

  if (!WORDS[key]) {
    return null;
  }

  const dateKey = getDateKey();
  const cacheKey = `${key}:${dateKey}`;

  if (QUESTION_CACHE.has(cacheKey)) {
    return QUESTION_CACHE.get(cacheKey);
  }

  const question =
    key === "news" ? await buildNewsQuestion(dateKey) : buildStandardQuestion(key, dateKey);

  QUESTION_CACHE.clear();
  QUESTION_CACHE.set(cacheKey, question);
  return question;
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

function resolvePublicPath(requestPath) {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch (error) {
    return null;
  }

  const safeRelativePath = decodedPath === "/" ? "index.html" : `.${decodedPath}`;
  const filePath = path.resolve(PUBLIC_DIR, safeRelativePath);

  if (filePath !== PUBLIC_DIR && !filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    return null;
  }

  return filePath;
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
    const question = await getCategoryQuestion(url.searchParams.get("category"));

    if (!question) {
      sendJson(response, 400, { error: "Invalid category" });
      return;
    }

    sendJson(response, 200, {
      category: question.category,
      dateKey: question.dateKey,
      word: question.word,
      pronunciation: question.pronunciation,
      options: question.options.map(({ label, text }) => ({ label, text })),
      sourceName: question.sourceName || null,
      articleTitle: question.articleTitle || null,
      articleUrl: question.articleUrl || null,
      contextHtml: question.contextHtml || null,
      mode: question.mode || null
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/answer") {
    try {
      const body = await readBody(request);
      const { category, selectedLabel } = JSON.parse(body || "{}");
      const question = await getCategoryQuestion(category);

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
    // Only serve files from the public directory.
    const filePath = resolvePublicPath(url.pathname);

    if (!filePath) {
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
