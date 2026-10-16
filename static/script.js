// Adres serwera Flask. Gdy strona działa na Flasku (port 5000) albo w internecie, adresy są względne.
// Gdy działa lokalnie na innym porcie (np. Live Server), kierujemy zapytania do Flaska na porcie 5000.
const isLocal = ["127.0.0.1", "localhost"].includes(location.hostname);
const API = (isLocal && location.port !== "5000") ? "http://127.0.0.1:5000" : "";

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
    saved: "Zapisano ✓",
    again: "Zagraj jeszcze raz",
    namePlaceholder: "Twoje imię",
    anonymous: "Anonim",
    rankingFor: "Ranking – {n} pytań",
    noResults: "Brak wyników w tym pakiecie.",
    noQuestions: "Brak pytań dla tego języka.",
    dbSize: "Pytań w bazie: {n}",
    chooseLang: "Wybierz język",
    chooseQuiz: "Wybierz quiz",
    choosePack: "Liczba pytań",
    start: "Start",
    pause: "⏸ Pauza",
    paused: "Pauza",
    resume: "▶ Wznów",
    restart: "↻ Wróć do menu",
    confirmRestart: "Wrócić do menu głównego? Stracisz dotychczasowe punkty.",
    serverError: "Brak połączenia z serwerem. Uruchom: python app.py",  
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
    saved: "Saved ✓",
    again: "Play again",
    namePlaceholder: "Your name",
    anonymous: "Anonymous",
    rankingFor: "Leaderboard – {n} questions",
    noResults: "No scores in this pack yet.",
    noQuestions: "No questions found for this language.",
    dbSize: "Questions in database: {n}",
    chooseLang: "Choose language",
    chooseQuiz: "Choose a quiz",
    choosePack: "Number of questions",
    start: "Start",
    pause: "⏸ Pause",
    paused: "Paused",
    resume: "▶ Resume",
    restart: "↻ Back to menu",
    confirmRestart: "Go back to the main menu? You will lose your current points.",
    serverError: "Can't reach the server. Run: python app.py",
  },
};

/* =====================================================
   USTAWIENIA WYBORU (język, quiz, pakiet pytań)
   ===================================================== */

// Dostępne długości quizu. Ta sama lista jest w app.py (PACKS), trzymaj je zgodne.
const PACKS = [5, 10, 20, 30];

// Aktualny język: zapamiętany w przeglądarce albo wybrany według języka przeglądarki
let lang = localStorage.getItem("lang") ||
  (navigator.language.startsWith("pl") ? "pl" : "en");

// Wybrany quiz (identyfikator z rejestru QUIZZES w app.py)
let quizId = localStorage.getItem("quiz") || "tech";

// Wybrany pakiet pytań; jeśli zapamiętana wartość jest błędna, bierzemy 10
let pack = Number(localStorage.getItem("pack")) || 10;
if (!PACKS.includes(pack)) pack = 10;

let quizList = [];       // lista quizów pobrana z serwera: {id, title, count}
let rankPack = pack;     // pakiet, którego tabelę wyników aktualnie oglądamy

// Zwraca napis o podanym kluczu w aktualnym języku.
// vars to obiekt z wartościami do podstawienia, np. t("question", { n: 1, total: 15 })
function t(key, vars = {}) {
  let s = TEXTS[lang][key];
  for (const name in vars) {
    s = s.replace("{" + name + "}", vars[name]);
  }
  return s;
}

// Zwraca dane wybranego quizu z listy (albo undefined, gdy lista jeszcze nie przyszła)
function currentQuiz() {
  return quizList.find((q) => q.id === quizId);
}

// Wpisuje tytuł wybranego quizu w nagłówek (w aktualnym języku)
function applyQuizTitle() {
  const q = currentQuiz();
  if (q) {
    document.getElementById("main-title").textContent = q.title[lang] || q.title.pl;
  }
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

  // podświetlenie przycisku aktywnego języka
  document.querySelectorAll(".lang button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });

  applyQuizTitle();   // tytuł quizu nadpisuje ogólny tytuł ze słownika
}

/* =====================================================
   EKRAN STARTOWY: wybór języka, quizu i pakietu
   ===================================================== */

// Tworzy przyciski pakietów (5, 10, 20, 30) na podstawie listy PACKS
function buildPackButtons() {
  const box = document.getElementById("pack-buttons");
  box.innerHTML = "";
  PACKS.forEach((p) => {
    const b = document.createElement("button");
    b.textContent = p;
    b.dataset.pack = p;
    b.addEventListener("click", () => setPack(p));
    box.appendChild(b);
  });
}

// Tworzy przyciski quizów; cały wybór jest widoczny tylko wtedy, gdy quizów jest więcej niż jeden
function buildQuizButtons() {
  const box = document.getElementById("quiz-buttons");
  box.innerHTML = "";
  quizList.forEach((q) => {
    const b = document.createElement("button");
    b.textContent = q.title[lang] || q.title.pl;
    b.dataset.quiz = q.id;
    b.addEventListener("click", () => setQuizId(q.id));
    box.appendChild(b);
  });
  document.getElementById("quiz-picker").hidden = quizList.length < 2;
}

// Pokazuje liczbę pytań w bazie wybranego quizu
function updateDbInfo() {
  const q = currentQuiz();
  document.getElementById("db-info").textContent =
    t("dbSize", { n: q ? q.count : 0 });
}

// Podświetla wybrany pakiet i wyłącza pakiety większe niż liczba pytań w bazie
function updatePackButtons() {
  const q = currentQuiz();
  const buttons = document.querySelectorAll("#pack-buttons button");

  if (q) {
    // dozwolone pakiety to te, które mieszczą się w bazie; najmniejszy zostaje zawsze
    const allowed = PACKS.filter((p) => p <= q.count);
    if (allowed.length === 0) allowed.push(PACKS[0]);
    // jeśli wybrany pakiet jest za duży dla tego quizu, bierzemy największy dozwolony
    if (!allowed.includes(pack)) pack = allowed[allowed.length - 1];
    buttons.forEach((b) => {
      b.disabled = !allowed.includes(Number(b.dataset.pack));
    });
  }
  buttons.forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.pack) === pack);
  });
}

// Odświeża cały ekran startowy po każdej zmianie (język, quiz, pakiet)
function refreshStartScreen() {
  document.querySelectorAll("#quiz-buttons button").forEach((b) => {
    b.classList.toggle("active", b.dataset.quiz === quizId);
  });
  applyQuizTitle();
  updateDbInfo();
  updatePackButtons();
}

// Pobiera z serwera listę quizów dostępnych w aktualnym języku
async function loadQuizzes() {
  try {
    const res = await fetch(API + "/api/quizzes?lang=" + lang);
    quizList = await res.json();
  } catch (err) {
    // serwer nie odpowiada: pokazujemy podpowiedź zamiast pustej strony
    document.getElementById("db-info").textContent = t("serverError");
    return;
  }

  // jeśli zapamiętany quiz nie istnieje w tym języku, bierzemy pierwszy z listy
  if (quizList.length > 0 && !quizList.some((q) => q.id === quizId)) {
    quizId = quizList[0].id;
  }
  buildQuizButtons();
  refreshStartScreen();
}

// Wybór pakietu pytań
function setPack(p) {
  pack = p;
  localStorage.setItem("pack", p);   // zapamiętujemy wybór w przeglądarce
  updatePackButtons();
}

// Wybór quizu
function setQuizId(id) {
  quizId = id;
  localStorage.setItem("quiz", id);
  refreshStartScreen();
}

// Zmiana języka (możliwa tylko na ekranie startowym): zapamiętuje wybór,
// tłumaczy interfejs i pobiera listę quizów w nowym języku
function setLanguage(l) {
  if (l === lang) return;             // ten sam język, nic nie robimy
  lang = l;
  localStorage.setItem("lang", lang);
  applyTexts();
  loadQuizzes();                      // w innym języku mogą być inne tytuły i liczby pytań
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
let saved = false;    // true = wynik z tej partii jest już zapisany
let gameId = "";      // unikalny numer partii, serwer dzięki niemu odrzuca duplikaty

const TIME = 15;          // sekundy na jedno pytanie
const BASE_POINTS = 100;  // punkty za dobrą odpowiedź
const MAX_BONUS = 50;     // maksymalny bonus za szybkość
let timeLeft = TIME;      // ile sekund zostało
let timerId;              // numer timera, potrzebny do jego zatrzymania

// Tworzy losowy, unikalny numer partii
function newGameId() {
  return (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now() + "-" + Math.random();   // zapasowa wersja dla starszych przeglądarek
}

// Blokuje albo odblokowuje formularz zapisu (pole imienia i przycisk)
function setSaveLocked(isLocked) {
  const btn = document.getElementById("save");
  document.getElementById("name").disabled = isLocked;   // disabled = nie da się edytować
  btn.disabled = isLocked;                               // disabled = nie da się kliknąć
  btn.textContent = isLocked ? t("saved") : t("save");   // po zapisie napis "Zapisano ✓"
}

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
   START QUIZU I PYTANIA
   ===================================================== */

// Rozpoczyna quiz: nowy numer partii, pobranie pytań wybranego quizu i pakietu
async function start() {
  gameId = newGameId();     // każda partia ma własny numer
  clearQuizView();
  const res = await fetch(
    `/api/questions?lang=${lang}&quiz=${quizId}&pack=${pack}`
  );
  questions = await res.json();

  // brak pytań: pokazujemy komunikat i kończymy
  if (questions.length === 0) {
    document.getElementById("question").textContent = t("noQuestions");
    return;
  }
  showQuestion();
}

// Wraca na ekran startowy (menu główne): zeruje liczniki, wyłącza pauzę
// i ukrywa quiz oraz ekran końcowy
function resetQuiz() {
  saved = false;           // nowa partia: wynik można zapisać znowu
  setSaveLocked(false);    // odblokowujemy pole imienia i przycisk

  // wyłączamy pauzę, jeśli była włączona
  paused = false;
  document.getElementById("quiz").classList.remove("paused");
  document.getElementById("pause-screen").hidden = true;

  clearQuizView();
  current = 0; score = 0; streak = 0; points = 0; locked = false;
  document.getElementById("quiz").hidden = true;            // ukryj quiz
  document.getElementById("end").hidden = true;             // ukryj ekran końcowy
  document.getElementById("start-screen").hidden = false;   // pokaż ekran startowy
  refreshStartScreen();
}

// Wyświetla aktualne pytanie i przyciski z odpowiedziami
function showQuestion() {
  const q = questions[current];
  document.getElementById("question").textContent = q.question;
  updateProgress();

  // pasek postępu quizu: ile pytań już za nami
  document.getElementById("bar-fill").style.width =
    (current / questions.length * 100) + "%";

  // Ponowne odtworzenie animacji pytania: usuwamy klasę, wymuszamy przeliczenie
  // układu (offsetWidth) i dodajemy klasę z powrotem
  const qEl = document.getElementById("question");
  qEl.classList.remove("anim");
  void qEl.offsetWidth;
  qEl.classList.add("anim");

  // Tworzymy przycisk dla każdej odpowiedzi
  const box = document.getElementById("answers");
  box.innerHTML = "";
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
   PAUZA
   ===================================================== */

// Włącza i wyłącza pauzę
function togglePause() {
  if (document.getElementById("quiz").hidden) return;   // pauza działa tylko podczas quizu
  paused = !paused;

  // klasa "paused" ukrywa pytanie i odpowiedzi (patrz CSS), a ekran pauzy pokazujemy osobno
  document.getElementById("quiz").classList.toggle("paused", paused);
  document.getElementById("pause-screen").hidden = !paused;

  if (paused) {
    clearInterval(timerId);   // zatrzymujemy czas
  } else if (!locked) {
    runTimer();               // wznawiamy czas, ale tylko jeśli nie odpowiedziano jeszcze na pytanie
  }
}

// Przycisk z menu pauzy: po potwierdzeniu wraca do menu głównego
function restartQuiz() {
  if (!confirm(t("confirmRestart"))) return;   // "Anuluj" zostawia quiz w pauzie
  resetQuiz();
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
  showRanking(pack);        // na start pokazujemy tabelę pakietu, który właśnie rozegrano
}

// Pokazuje tabelę wyników wybranego pakietu (nagłówek, zakładki i listę)
function showRanking(p) {
  rankPack = p;
  document.getElementById("rank-title").textContent = t("rankingFor", { n: p });
  buildRankTabs();
  loadRanking();
}

// Tworzy zakładki pakietów nad tabelą wyników (5, 10, 20, 30)
function buildRankTabs() {
  const box = document.getElementById("rank-tabs");
  box.innerHTML = "";
  PACKS.forEach((p) => {
    const b = document.createElement("button");
    b.textContent = p;
    b.classList.toggle("active", p === rankPack);
    b.addEventListener("click", () => showRanking(p));
    box.appendChild(b);
  });
}

// Pobiera ranking wybranego quizu i pakietu z serwera i wyświetla go jako listę
async function loadRanking() {
  const res = await fetch(API + `/api/results?quiz=${quizId}&pack=${rankPack}`);
  const data = await res.json();
  const list = document.getElementById("ranking");
  list.innerHTML = "";

  // pusta tabela: pokazujemy informację zamiast pustego miejsca
  if (data.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = t("noResults");
    list.appendChild(li);
    return;
  }

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

// Przycisk Start: chowa ekran startowy, pokazuje quiz i go uruchamia
document.getElementById("start-btn").addEventListener("click", () => {
  document.getElementById("start-screen").hidden = true;
  document.getElementById("quiz").hidden = false;
  start();
});

// "Zapisz wynik": wysyła imię i wynik do serwera, ale tylko raz na rozegraną partię
document.getElementById("save").addEventListener("click", async () => {
  if (saved) return;      // wynik z tej partii jest już zapisany
  saved = true;           // ustawiamy od razu, żeby szybkie podwójne kliknięcie nie wysłało dwóch zapisów
  setSaveLocked(true);    // blokujemy pole imienia i przycisk

  const name = document.getElementById("name").value || t("anonymous");  // puste pole = "Anonim"
  try {
    const res = await fetch(API + "/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },   // informacja, że wysyłamy JSON
      body: JSON.stringify({
        name, score, total: questions.length, points,
        game_id: gameId, quiz: quizId, pack,              // quiz i pakiet decydują o tabeli wyników
      }),
    });
    // 409 = serwer już ma ten wynik, więc nie traktujemy tego jak błędu
    if (!res.ok && res.status !== 409) throw new Error("save failed");
  } catch (err) {
    saved = false;          // zapis się nie udał, więc odblokowujemy i można spróbować ponownie
    setSaveLocked(false);
    return;
  }
  showRanking(pack);        // po zapisie pokazujemy tabelę pakietu, w którym zagrano
});

// "Zagraj jeszcze raz": powrót do ekranu startowego
document.getElementById("again").addEventListener("click", resetQuiz);

// "Dalej": przejście do następnego pytania albo na ekran końcowy
document.getElementById("next").addEventListener("click", () => {
  document.getElementById("next").hidden = true;
  locked = false;       // znów można odpowiadać
  current++;
  if (current < questions.length) showQuestion();
  else finish();
});

// Przyciski wyboru języka (PL / EN) na ekranie startowym
document.querySelectorAll(".lang button").forEach((b) => {
  b.addEventListener("click", () => setLanguage(b.dataset.lang));
});

// Przyciski pauzy, wznowienia i powrotu do menu
document.getElementById("pause-btn").addEventListener("click", togglePause);
document.getElementById("resume-btn").addEventListener("click", togglePause);
document.getElementById("restart-btn").addEventListener("click", restartQuiz);

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
    const idx = key.charCodeAt(0) - 97;   // kod litery "a" to 97, więc a=0, b=1, c=2, d=3
    const count = document.querySelectorAll("#answers button").length;
    if (idx < count) answer(idx);         // ignorujemy literę, jeśli pytanie ma mniej odpowiedzi
  } else if (locked && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();                   // spacja nie przewija strony
    document.getElementById("next").click();
  }
});

/* =====================================================
   START PROGRAMU
   ===================================================== */
applyTexts();         // wpisz tłumaczenia w interfejs
buildPackButtons();   // zbuduj przyciski pakietów 5, 10, 20, 30
loadQuizzes();        // pobierz listę quizów, a potem odśwież ekran startowy
