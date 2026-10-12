let questions = [], current = 0, score = 0;

async function start() {
  const res = await fetch("/api/questions");
  questions = await res.json();
  showQuestion();
}

function showQuestion() {
  const q = questions[current];
  document.getElementById("question").textContent = q.question;
  document.getElementById("progress").textContent =
    `Pytanie ${current + 1} z ${questions.length}`;
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
}

function answer(i) {
  if (i === questions[current].correct) score++;
  current++;
  if (current < questions.length) showQuestion();
  else finish();
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