const TEXTS = {
  pl: {
    title: "📱 Quiz o technologii",
    question: "Pytanie {n} z {total}",
    pts: "pkt",
    streak: "seria",
    next: "Dalej →",
    seeResult: "Zobacz wynik",
    correct: "✅ Dobrze! +{base} pkt, +{bonus} za szybkość",
    timeout: "⏰ Czas minął!",
    wrong: "❌ Niestety źle",
    score: "Wynik",
    msgPerfect: "Perfekcyjnie! 🏆",
    msgGreat: "Świetnie! 🔥",
    msgOk: "Nieźle, spróbuj jeszcze raz",
    msgLow: "Trochę ćwiczeń i będzie dobrze 😄",
    save: "Zapisz wynik",
    again: "Zagraj jeszcze raz",
    namePlaceholder: "Twoje imię",
    anonymous: "Anonim",
    ranking: "Ranking",
    noQuestions: "Brak pytań dla tego języka.",
  },
  en: {
    title: "📱 Tech Quiz",
    question: "Question {n} of {total}",
    pts: "pts",
    streak: "streak",
    next: "Next →",
    seeResult: "See result",
    correct: "✅ Correct! +{base} pts, +{bonus} speed bonus",
    timeout: "⏰ Time's up!",
    wrong: "❌ Wrong answer",
    score: "Score",
    msgPerfect: "Perfect! 🏆",
    msgGreat: "Great job! 🔥",
    msgOk: "Not bad, try again",
    msgLow: "A bit of practice and you'll get there 😄",
    save: "Save score",
    again: "Play again",
    namePlaceholder: "Your name",
    anonymous: "Anonymous",
    ranking: "Leaderboard",
    noQuestions: "No questions found for this language.",
  },
};

let lang = localStorage.getItem("lang") ||
  (navigator.language.startsWith("pl") ? "pl" : "en");

function t(key, vars = {}) {
  let s = TEXTS[lang][key];
  for (const name in vars) {
    s = s.replace("{" + name + "}", vars[name]);
  }
  return s;
}

function applyTexts() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll(".lang button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });
}

function setLanguage(l) {
  if (l === lang) return;
  lang = l;
  localStorage.setItem("lang", lang);
  applyTexts();
  resetQuiz();
}

let questions = [], current = 0, score = 0, streak = 0, points = 0;
let locked = false;

const TIME = 15;
const BASE_POINTS = 100;
const MAX_BONUS = 50;
let timeLeft = TIME, timerId;

function updateProgress() {
  document.getElementById("progress").textContent =
    t("question", { n: current + 1, total: questions.length }) +
    `  ·  ⭐ ${points} ${t("pts")}` +
    (streak >= 2 ? `  ·  🔥 ${t("streak")}: ${streak}` : "");
}

function showTime() {
  const fill = document.getElementById("timer-fill");
  document.getElementById("timer-text").textContent =
    Math.max(0, Math.ceil(timeLeft)) + " s";
  fill.style.width = Math.max(0, timeLeft / TIME * 100) + "%";
  fill.classList.toggle("low", timeLeft <= 5);
}

function startTimer() {
  clearInterval(timerId);
  timeLeft = TIME;
  showTime();
  timerId = setInterval(() => {
    timeLeft -= 0.1;
    showTime();
    if (timeLeft <= 0) {
      clearInterval(timerId);
      answer(-1);
    }
  }, 100);
}

function clearQuizView() {
  clearInterval(timerId);
  document.getElementById("question").textContent = "";
  document.getElementById("answers").innerHTML = "";
  document.getElementById("progress").textContent = "";
  document.getElementById("timer-text").textContent = "";
  document.getElementById("timer-fill").style.width = "0%";
  document.getElementById("bar-fill").style.width = "0%";
  document.getElementById("feedback").hidden = true;
  document.getElementById("explanation").hidden = true;
  document.getElementById("next").hidden = true;
}

async function start() {
  clearQuizView();
  const res = await fetch("/api/questions?lang=" + lang);
  questions = await res.json();

  if (questions.length === 0) {
    document.getElementById("question").textContent = t("noQuestions");
    return;
  }
  showQuestion();
}

function resetQuiz() {
  clearInterval(timerId);
  current = 0; score = 0; streak = 0; points = 0; locked = false;
  document.getElementById("quiz").hidden = false;
  document.getElementById("end").hidden = true;
  start();
}

function showQuestion() {
  const q = questions[current];
  document.getElementById("question").textContent = q.question;
  updateProgress();

  document.getElementById("bar-fill").style.width =
    (current / questions.length * 100) + "%";

  const qEl = document.getElementById("question");
  qEl.classList.remove("anim");
  void qEl.offsetWidth;
  qEl.classList.add("anim");

  const box = document.getElementById("answers");
  box.innerHTML = "";
  q.answers.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.addEventListener("click", () => answer(i));
    box.appendChild(btn);
  });

  document.getElementById("feedback").hidden = true;
  document.getElementById("explanation").hidden = true;
  document.getElementById("next").hidden = true;
  startTimer();
}

function answer(i) {
  if (locked) return;
  locked = true;
  clearInterval(timerId);

  const q = questions[current];
  const buttons = document.querySelectorAll("#answers button");
  const fb = document.getElementById("feedback");

  buttons[q.correct].classList.add("good");

  if (i === q.correct) {
    const bonus = Math.round(Math.max(0, timeLeft) / TIME * MAX_BONUS);
    score++;
    streak++;
    points += BASE_POINTS + bonus;
    fb.textContent = t("correct", { base: BASE_POINTS, bonus: bonus });
    fb.className = "good";
  } else if (i === -1) {
    streak = 0;
    fb.textContent = t("timeout");
    fb.className = "bad";
  } else {
    streak = 0;
    buttons[i].classList.add("bad");
    fb.textContent = t("wrong");
    fb.className = "bad";
  }
  fb.hidden = false;
  updateProgress();

  if (q.explanation) {
    const el = document.getElementById("explanation");
    el.textContent = "💡 " + q.explanation;
    el.hidden = false;
  }

  const next = document.getElementById("next");
  next.textContent =
    current + 1 < questions.length ? t("next") : t("seeResult");
  next.hidden = false;
}

function finish() {
  document.getElementById("quiz").hidden = true;
  document.getElementById("end").hidden = false;

  const p = score / questions.length;
  const msg = p === 1 ? t("msgPerfect")
            : p >= 0.7 ? t("msgGreat")
            : p >= 0.4 ? t("msgOk")
            : t("msgLow");
  document.getElementById("result").textContent =
    `${t("score")}: ${score} / ${questions.length}  ·  ⭐ ${points} ${t("pts")} — ${msg}`;
  loadRanking();
}

async function loadRanking() {
  const res = await fetch("/api/results");
  const data = await res.json();
  const list = document.getElementById("ranking");
  list.innerHTML = "";
  data.forEach((r) => {
    const li = document.createElement("li");
    li.textContent =
      `${r.name}: ⭐ ${r.points ?? 0} ${t("pts")} (${r.score}/${r.total}) — ${r.date}`;
    list.appendChild(li);
  });
}

document.getElementById("save").addEventListener("click", async () => {
  const name = document.getElementById("name").value || t("anonymous");
  await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score, total: questions.length, points }),
  });
  loadRanking();
});

document.getElementById("again").addEventListener("click", resetQuiz);

document.getElementById("next").addEventListener("click", () => {
  document.getElementById("next").hidden = true;
  locked = false;
  current++;
  if (current < questions.length) showQuestion();
  else finish();
});

document.querySelectorAll(".lang button").forEach((b) => {
  b.addEventListener("click", () => setLanguage(b.dataset.lang));
});

document.addEventListener("keydown", (e) => {
  if (document.getElementById("quiz").hidden) return;
  const key = e.key.toLowerCase();

  if (!locked && ["a", "b", "c", "d"].includes(key)) {
    const idx = key.charCodeAt(0) - 97;
    const count = document.querySelectorAll("#answers button").length;
    if (idx < count) answer(idx);
  } else if (locked && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    document.getElementById("next").click();
  }
});

applyTexts();
start();