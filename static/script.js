/* =====================================================
   TŁUMACZENIA
   Słownik z napisami interfejsu w dwóch językach.
   Zapis {n} to miejsce, w które funkcja t() wstawia wartość.
   ===================================================== */
const TEXTS = {
  pl: {
    title: "Quiz o technologii",
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
    dbSize: "Pytań w bazie: {n}",
    chooseLang: "Wybierz język",
    start: "Start",
    pause: "⏸ Pauza",
    paused: "Pauza",
    resume: "▶ Wznów",
  },
  en: {
    title: "Tech Quiz",
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
    dbSize: "Questions in database: {n}",
    chooseLang: "Choose language",
    start: "Start",
    pause: "⏸ Pause",
    paused: "Paused",
    resume: "▶ Resume",
  },
};
 
// Aktualny język: najpierw sprawdzamy, czy przeglądarka go zapamiętała (localStorage),
// a jeśli nie, wybieramy "pl" gdy przeglądarka jest po polsku, w przeciwnym razie "en"
let lang = localStorage.getItem("lang") ||
  (navigator.language.startsWith("pl") ? "pl" : "en");
 
// Zwraca napis o podanym kluczu w aktualnym języku.
// vars to obiekt z wartościami do podstawienia, np. t("question", { n: 1, total: 15 })
function t(key, vars = {}) {
  let s = TEXTS[lang][key];
  for (const name in vars) {
    s = s.replace("{" + name + "}", vars[name]);
  }
  return s;
}
 
// Wpisuje tłumaczenia we wszystkie elementy HTML oznaczone atrybutami data-i18n
function applyTexts() {
  document.documentElement.lang = lang;
 
  // zwykłe teksty (nagłówki, przyciski)
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
 
  // podpowiedzi w polach tekstowych (placeholder)
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
 
  // podświetlenie przycisku aktywnego języka (klasa "active" ma styl w CSS)
  document.querySelectorAll(".lang button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });
}
 
// Zmiana języka (możliwa tylko na ekranie startowym):
// zapamiętuje wybór, tłumaczy interfejs i odświeża liczbę pytań dla nowego języka
function setLanguage(l) {
  if (l === lang) return;             // ten sam język, nic nie robimy
  lang = l;
  localStorage.setItem("lang", lang); // zapis w przeglądarce, żeby wybór przetrwał odświeżenie
  applyTexts();
  showDbSize();                       // w innym języku może być inna liczba pytań
}
 
/* =====================================================
   STAN QUIZU
   Zmienne, w których quiz "pamięta", co się dzieje
   ===================================================== */
let questions = [];   // lista pytań pobrana z serwera
let current = 0;      // numer aktualnego pytania (0 = pierwsze)
let score = 0;        // liczba poprawnych odpowiedzi
let streak = 0;       // seria poprawnych odpowiedzi z rzędu
let points = 0;       // punkty (z bonusem za szybkość)
let locked = false;   // true = odpowiedź już udzielona, kolejne kliknięcia ignorujemy
let paused = false;   // true = quiz wstrzymany (pytanie ukryte, czas stoi)
 
const TIME = 15;          // sekundy na jedno pytanie
const BASE_POINTS = 100;  // punkty za dobrą odpowiedź
const MAX_BONUS = 50;     // maksymalny bonus za szybkość
let timeLeft = TIME;      // ile sekund zostało
let timerId;              // numer timera, potrzebny do jego zatrzymania
 
/* =====================================================
   WIDOK: postęp i czas
   ===================================================== */
 
// Napis "Pytanie X z Y · punkty · seria"
function updateProgress() {
  document.getElementById("progress").textContent =
    t("question", { n: current + 1, total: questions.length }) +
    `  ·  ⭐ ${points} ${t("pts")}` +
    // serię pokazujemy dopiero od 2 poprawnych odpowiedzi z rzędu
    (streak >= 2 ? `  ·  🔥 ${t("streak")}: ${streak}` : "");
}
 
// Odświeża pasek czasu i liczbę sekund obok niego
function showTime() {
  const fill = document.getElementById("timer-fill");
  document.getElementById("timer-text").textContent =
    Math.max(0, Math.ceil(timeLeft)) + " s";   // ceil zaokrągla w górę, max nie pozwala zejść poniżej 0
  fill.style.width = Math.max(0, timeLeft / TIME * 100) + "%";
  fill.classList.toggle("low", timeLeft <= 5); // klasa "low" robi pasek czerwonym przy 5 s i mniej
}
 
// Uruchamia odliczanie od aktualnej wartości timeLeft (bez zerowania).
// Używane przy starcie pytania i przy wznowieniu po pauzie.
function runTimer() {
  clearInterval(timerId);   // zatrzymujemy poprzedni timer, żeby nie chodziły dwa naraz
  // co 100 ms (0,1 s) zmniejszamy czas i odświeżamy pasek
  timerId = setInterval(() => {
    timeLeft -= 0.1;
    showTime();
    if (timeLeft <= 0) {
      clearInterval(timerId);
      answer(-1);           // -1 = brak odpowiedzi, czas minął
    }
  }, 100);
}

// Zaczyna odliczanie dla nowego pytania: ustawia pełny czas i uruchamia timer
function startTimer() {
  timeLeft = TIME;
  showTime();
  runTimer();
}
 
// Czyści ekran quizu z pozostałości po poprzednim pytaniu
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
 
/* =====================================================
   POBIERANIE DANYCH Z SERWERA (Flask)
   ===================================================== */
 
// Pobiera liczbę pytań w bazie i wyświetla ją pod tytułem
async function showDbSize() {
  const res = await fetch("/api/count?lang=" + lang);
  const data = await res.json();
  document.getElementById("db-info").textContent =
    t("dbSize", { n: data.count });
}
 
// Rozpoczyna quiz: czyści widok, pobiera pytania i pokazuje pierwsze
async function start() {
  clearQuizView();
  showDbSize();
  const res = await fetch("/api/questions?lang=" + lang);
  questions = await res.json();
 
  // brak pytań w tym języku: pokazujemy komunikat i kończymy
  if (questions.length === 0) {
    document.getElementById("question").textContent = t("noQuestions");
    return;
  }
  showQuestion();
}
 
// Wraca na ekran startowy: zeruje liczniki i ukrywa quiz oraz ekran końcowy
function resetQuiz() {
    // wyłączamy pauzę, jeśli była włączona
  paused = false;
  document.getElementById("quiz").classList.remove("paused");
  document.getElementById("pause-screen").hidden = true;
  clearQuizView();                                    // czyści widok i zatrzymuje timer
  current = 0; score = 0; streak = 0; points = 0; locked = false;
  document.getElementById("quiz").hidden = true;      // ukryj quiz
  document.getElementById("end").hidden = true;       // ukryj ekran końcowy
  document.getElementById("start-screen").hidden = false;   // pokaż ekran startowy
  showDbSize();                                       // odśwież liczbę pytań
}
 
/* =====================================================
   PYTANIA I ODPOWIEDZI
   ===================================================== */
 
// Wyświetla aktualne pytanie i przyciski z odpowiedziami
function showQuestion() {
  const q = questions[current];
  document.getElementById("question").textContent = q.question;
  updateProgress();
 
  // pasek postępu quizu: ile pytań już za nami
  document.getElementById("bar-fill").style.width =
    (current / questions.length * 100) + "%";
 
  // Ponowne odtworzenie animacji pytania: usuwamy klasę, wymuszamy przeliczenie
  // układu (offsetWidth) i dodajemy klasę z powrotem. Bez tego animacja
  // odtworzyłaby się tylko za pierwszym razem.
  const qEl = document.getElementById("question");
  qEl.classList.remove("anim");
  void qEl.offsetWidth;
  qEl.classList.add("anim");
 
  // Tworzymy przycisk dla każdej odpowiedzi
  const box = document.getElementById("answers");
  box.innerHTML = "";                       // usuwamy stare przyciski
  q.answers.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.addEventListener("click", () => answer(i));   // i = numer klikniętej odpowiedzi
    box.appendChild(btn);
  });
 
  // chowamy komunikaty z poprzedniego pytania i uruchamiamy czas
  document.getElementById("feedback").hidden = true;
  document.getElementById("explanation").hidden = true;
  document.getElementById("next").hidden = true;
  startTimer();
}
 
// Obsługa odpowiedzi. i = numer klikniętej odpowiedzi, a -1 oznacza brak odpowiedzi (koniec czasu)
function answer(i) {
  if (locked) return;       // odpowiedź już była, ignorujemy kolejne kliknięcia
  locked = true;
  clearInterval(timerId);   // zatrzymujemy czas
 
  const q = questions[current];
  const buttons = document.querySelectorAll("#answers button");
  const fb = document.getElementById("feedback");
 
  // zawsze zaznaczamy poprawną odpowiedź na zielono
  buttons[q.correct].classList.add("good");
 
  if (i === q.correct) {
    // DOBRA odpowiedź: bonus zależy od tego, ile czasu zostało
    const bonus = Math.round(Math.max(0, timeLeft) / TIME * MAX_BONUS);
    score++;
    streak++;
    points += BASE_POINTS + bonus;
    fb.textContent = t("correct", { base: BASE_POINTS, bonus: bonus });
    fb.className = "good";
  } else if (i === -1) {
    // KONIEC CZASU: brak punktów, seria przerwana
    streak = 0;
    fb.textContent = t("timeout");
    fb.className = "bad";
  } else {
    // ZŁA odpowiedź: kliknięty przycisk robi się czerwony
    streak = 0;
    buttons[i].classList.add("bad");
    fb.textContent = t("wrong");
    fb.className = "bad";
  }
  fb.hidden = false;
  updateProgress();
 
  // wyjaśnienie pokazujemy tylko wtedy, gdy pytanie ma pole "explanation"
  if (q.explanation) {
    const el = document.getElementById("explanation");
    el.textContent = "💡 " + q.explanation;
    el.hidden = false;
  }
 
  // przycisk "Dalej", a na ostatnim pytaniu "Zobacz wynik"
  const next = document.getElementById("next");
  next.textContent =
    current + 1 < questions.length ? t("next") : t("seeResult");
  next.hidden = false;
}
 
/* =====================================================
   EKRAN KOŃCOWY I RANKING
   ===================================================== */
 
// Pokazuje wynik końcowy z komentarzem zależnym od procentu poprawnych odpowiedzi
function finish() {
  document.getElementById("quiz").hidden = true;
  document.getElementById("end").hidden = false;
 
  const p = score / questions.length;   // ułamek poprawnych odpowiedzi (0 do 1)
  const msg = p === 1 ? t("msgPerfect")
            : p >= 0.7 ? t("msgGreat")
            : p >= 0.4 ? t("msgOk")
            : t("msgLow");
  document.getElementById("result").textContent =
    `${t("score")}: ${score} / ${questions.length}  ·  ⭐ ${points} ${t("pts")} — ${msg}`;
  loadRanking();
}
 
// Pobiera ranking z serwera i wyświetla go jako listę
async function loadRanking() {
  const res = await fetch("/api/results");
  const data = await res.json();
  const list = document.getElementById("ranking");
  list.innerHTML = "";
  data.forEach((r) => {
    const li = document.createElement("li");
    // "?? 0" podstawia 0 dla starych wyników zapisanych bez punktów
    li.textContent =
      `${r.name}: ⭐ ${r.points ?? 0} ${t("pts")} (${r.score}/${r.total}) — ${r.date}`;
    list.appendChild(li);
  });
}
 
/* =====================================================
   REAKCJE NA KLIKNIĘCIA I KLAWISZE
   ===================================================== */
 
// "Zapisz wynik": wysyła imię i wynik do serwera, potem odświeża ranking
document.getElementById("save").addEventListener("click", async () => {
  const name = document.getElementById("name").value || t("anonymous");  // puste pole = "Anonim"
  await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },   // informacja, że wysyłamy JSON
    body: JSON.stringify({ name, score, total: questions.length, points }),
  });
  loadRanking();
});
 
// "Zagraj jeszcze raz"
document.getElementById("again").addEventListener("click", resetQuiz);
 
// "Dalej": przejście do następnego pytania albo na ekran końcowy
document.getElementById("next").addEventListener("click", () => {
  document.getElementById("next").hidden = true;
  locked = false;       // znów można odpowiadać
  current++;
  if (current < questions.length) showQuestion();
  else finish();
});
 
// Przyciski wyboru języka (PL / EN)
document.querySelectorAll(".lang button").forEach((b) => {
  b.addEventListener("click", () => setLanguage(b.dataset.lang));
});
 
// Włącza i wyłącza pauzę
function togglePause() {
  if (document.getElementById("quiz").hidden) return;   // pauza działa tylko podczas quizu
  paused = !paused;

  // klasa "paused" ukrywa pytanie i odpowiedzi (patrz CSS), a ekran pauzy pokazujemy osobno
  document.getElementById("quiz").classList.toggle("paused", paused);
  document.getElementById("pause-screen").hidden = !paused;

  if (paused) {
    clearInterval(timerId);          // zatrzymujemy czas
  } else if (!locked) {
    runTimer();                      // wznawiamy czas, ale tylko jeśli nie odpowiedziano jeszcze na pytanie
  }
}

// Przyciski pauzy i wznowienia
document.getElementById("pause-btn").addEventListener("click", togglePause);
document.getElementById("resume-btn").addEventListener("click", togglePause);

// Obsługa klawiatury: P = pauza, A-D = odpowiedź, Enter lub spacja = dalej
document.addEventListener("keydown", (e) => {
  if (document.getElementById("quiz").hidden) return;   // poza quizem klawisze nie działają
  const key = e.key.toLowerCase();

  if (key === "p") {                 // P włącza i wyłącza pauzę
    togglePause();
    return;
  }
  if (paused) return;                // podczas pauzy pozostałe klawisze są zablokowane

  if (!locked && ["a", "b", "c", "d"].includes(key)) {
    const idx = key.charCodeAt(0) - 97;   // a=0, b=1, c=2, d=3
    const count = document.querySelectorAll("#answers button").length;
    if (idx < count) answer(idx);
  } else if (locked && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();                   // spacja nie przewija strony
    document.getElementById("next").click();
  }
});
 
// Na starcie tylko tłumaczymy interfejs i pokazujemy liczbę pytań.
// Quiz rusza dopiero po kliknięciu przycisku Start (poniżej).
applyTexts();
showDbSize();

// Przycisk Start: chowa ekran startowy (a z nim wybór języka), pokazuje quiz i go uruchamia
document.getElementById("start-btn").addEventListener("click", () => {
  document.getElementById("start-screen").hidden = true;
  document.getElementById("quiz").hidden = false;
  start();
});