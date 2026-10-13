let questions = [], current = 0, score = 0, streak = 0, points = 0;
let locked = false;

const TIME = 15;
const BASE_POINTS = 100;
const MAX_BONUS = 50;
let timeLeft = TIME, timerId;

function updateProgress() {
  document.getElementById("progress").textContent =
    `Pytanie ${current + 1} z ${questions.length}  ·  ⭐ ${points} pkt` +
    (streak >= 2 ? `  ·  🔥 seria: ${streak}` : "");
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

async function start() {
  const res = await fetch("/api/questions");
  questions = await res.json();
  showQuestion();
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
    fb.textContent = `✅ Dobrze! +${BASE_POINTS} pkt, +${bonus} za szybkość`;
    fb.className = "good";
  } else if (i === -1) {
    streak = 0;
    fb.textContent = "⏰ Czas minął!";
    fb.className = "bad";
  } else {
    streak = 0;
    buttons[i].classList.add("bad");
    fb.textContent = "❌ Niestety źle";
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
    current + 1 < questions.length ? "Dalej →" : "Zobacz wynik";
  next.hidden = false;
}

function finish() {
  document.getElementById("quiz").hidden = true;
  document.getElementById("end").hidden = false;

  const p = score / questions.length;
  const msg = p === 1 ? "Perfekcyjnie! 🏆"
            : p >= 0.7 ? "Świetnie! 🔥"
            : p >= 0.4 ? "Nieźle, spróbuj jeszcze raz"
            : "Trochę ćwiczeń i będzie dobrze 😄";
  document.getElementById("result").textContent =
    `Wynik: ${score} / ${questions.length}  ·  ⭐ ${points} pkt — ${msg}`;
  loadRanking();
}

document.getElementById("save").addEventListener("click", async () => {
  const name = document.getElementById("name").value || "Anonim";
  await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score, total: questions.length, points }),
  });
  loadRanking();
});

async function loadRanking() {
  const res = await fetch("/api/results");
  const data = await res.json();
  const list = document.getElementById("ranking");
  list.innerHTML = "";
  data.forEach((r) => {
    const li = document.createElement("li");
    li.textContent =
      `${r.name}: ⭐ ${r.points ?? 0} pkt (${r.score}/${r.total}) — ${r.date}`;
    list.appendChild(li);
  });
}

document.getElementById("next").addEventListener("click", () => {
  document.getElementById("next").hidden = true;
  locked = false;
  current++;
  if (current < questions.length) showQuestion();
  else finish();
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

start();