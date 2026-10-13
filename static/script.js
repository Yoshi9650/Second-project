let questions = [], current = 0, score = 0, streak = 0;

const TIME = 15;
let timeLeft, timerId;

function startTimer() {
  clearInterval(timerId);
  timeLeft = TIME;
  const fill = document.getElementById("timer-fill");
  fill.style.width = "100%";
  timerId = setInterval(() => {
    timeLeft -= 0.1;
    fill.style.width = (timeLeft / TIME * 100) + "%";
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
  document.getElementById("progress").textContent =
    `Pytanie ${current + 1} z ${questions.length}` +
    (streak >= 2 ? `  ·  🔥 seria: ${streak}` : "");

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

  document.getElementById("explanation").hidden = true;
  startTimer();
}

let locked = false;

function answer(i) {
  if (locked) return;
  locked = true;

  const correct = questions[current].correct;
  const buttons = document.querySelectorAll("#answers button");

  buttons[correct].classList.add("good");
  if (i !== correct) buttons[i].classList.add("bad");
  else score++;

  const next = document.getElementById("next");
  next.textContent =
    current + 1 < questions.length ? "Dalej →" : "Zobacz wynik";
  next.hidden = false;
}

function finish() {
  document.getElementById("quiz").hidden = true;
  document.getElementById("end").hidden = false;
  document.getElementById("result").textContent =
    `Wynik: ${score} / ${questions.length}`;
  loadRanking();
}

document.getElementById("save").addEventListener("click", async () => {
  const name = document.getElementById("name").value || "Anonim";
  await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score, total: questions.length }),
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
    li.textContent = `${r.name}: ${r.score}/${r.total} (${r.date})`;
    list.appendChild(li);
  });
}

start();

document.getElementById("next").addEventListener("click", () => {
  document.getElementById("next").hidden = true;
  locked = false;
  current++;
  if (current < questions.length) showQuestion();
  else finish();
});