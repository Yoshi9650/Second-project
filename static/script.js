// Ustala, czy strona działa lokalnie; przy Live Serverze API może działać na porcie 5000.
const isLocal = ["127.0.0.1", "localhost"].includes(location.hostname);
const API = (isLocal && location.port && location.port !== "5000") ? "http://127.0.0.1:5000" : "";
// Dozwolone rozmiary klasycznego zestawu pytań.
const PACKS = [5, 10, 20, 30];
// Teksty interfejsu w obu językach. Funkcja t() pobiera stąd etykiety i wstawia wartości do {placeholderów}.
const TEXTS =  {
  pl: {
    title:"Quiz o technologii",chooseLang:"Wybierz język",chooseQuiz:"Wybierz quiz",choosePack:"Liczba pytań",chooseCategory:"Kategoria",chooseMode:"Tryb gry",chooseDifficulty:"Trudność",start:"Start",pause:"⏸ Pauza",paused:"Pauza",resume:"▶ Wznów",restart:"↻ Wróć do menu",next:"Dalej →",seeResult:"Zobacz wynik",question:"Pytanie {n} z {total}",pts:"pkt",streak:"seria",correct:"✅ Dobrze! +{points} pkt",wrong:"❌ Niestety źle",timeout:"⏰ Czas minął!",score:"Wynik",msgPerfect:"Perfekcyjnie! 🏆",msgGreat:"Świetnie! 🔥",msgOk:"Nieźle, spróbuj jeszcze raz",msgLow:"Trochę ćwiczeń i będzie dobrze 😄",save:"Zapisz wynik",saved:"Zapisano ✓",again:"Zagraj jeszcze raz",namePlaceholder:"Twoje imię",anonymous:"Anonim",rankingFor:"Ranking – {n} pytań",noResults:"Brak wyników w tym rankingu.",noQuestions:"Brak pytań dla tego wyboru.",dbSize:"Pytań w bazie: {n}",serverError:"Brak połączenia z serwerem. Uruchom: python app.py",confirmRestart:"Wrócić do menu? Stracisz dotychczasowy wynik.",classic:"Klasyczny",survival:"Przetrwanie",blitz:"Blitz",duel:"Dwóch graczy",daily:"Dzienne wyzwanie",easy:"Łatwy",medium:"Średni",hard:"Trudny",player1:"Gracz 1",player2:"Gracz 2",streakBadge:"🔥 10 z rzędu",perfectBadge:"💎 Bez błędu",fastBadge:"⚡ Szybkie palce",fiftyUsed:"50/50 wykorzystane",timeUsed:"Dodatkowe 10 sekund wykorzystane",winner:"Wygrywa: {name}!",draw:"Remis!",turn:"Tura: {name}",survivalEnd:"Koniec przetrwania!",blitzEnd:"Czas Blitza minął!",multiplier:"mnożnik",choose:"Wybierz"
  }
  ,
  en: {
    title:"Tech Quiz",chooseLang:"Choose language",chooseQuiz:"Choose a quiz",choosePack:"Number of questions",chooseCategory:"Category",chooseMode:"Game mode",chooseDifficulty:"Difficulty",start:"Start",pause:"⏸ Pause",paused:"Paused",resume:"▶ Resume",restart:"↻ Back to menu",next:"Next →",seeResult:"See result",question:"Question {n} of {total}",pts:"pts",streak:"streak",correct:"✅ Correct! +{points} pts",wrong:"❌ Wrong answer",timeout:"⏰ Time's up!",score:"Score",msgPerfect:"Perfect! 🏆",msgGreat:"Great job! 🔥",msgOk:"Not bad, try again",msgLow:"A bit of practice and you'll get there 😄",save:"Save score",saved:"Saved ✓",again:"Play again",namePlaceholder:"Your name",anonymous:"Anonymous",rankingFor:"Leaderboard – {n} questions",noResults:"No scores in this leaderboard yet.",dbSize:"Questions in database: {n}",serverError:"Can't reach the server. Run: python app.py",confirmRestart:"Go back to the menu? Your current result will be lost.",classic:"Classic",survival:"Survival",blitz:"Blitz",duel:"Two players",daily:"Daily challenge",easy:"Easy",medium:"Medium",hard:"Hard",player1:"Player 1",player2:"Player 2",streakBadge:"🔥 10 in a row",perfectBadge:"💎 Flawless",fastBadge:"⚡ Quick fingers",fiftyUsed:"50/50 used",timeUsed:"Extra 10 seconds used",winner:"Winner: {name}!",draw:"It's a draw!",turn:"Turn: {name}",survivalEnd:"Survival over!",blitzEnd:"Blitz time is up!",multiplier:"multiplier",choose:"Choose"
  }
};
// Ustawienia interfejsu i gry. Część ustawień jest zapamiętywana w localStorage przeglądarki.
let lang = localStorage.getItem("lang") || (navigator.language.startsWith("pl") ? "pl" : "en");
let quizId = localStorage.getItem("quiz") || "tech", pack = Number(localStorage.getItem("pack")) || 10;
if (!PACKS.includes(pack)) pack = 10;
let category = "all", mode = "classic", difficulty = "medium", quizList = [], categories = [], rankPack = pack;
// Stan bieżącej rozgrywki: pytania, wynik, zegary, koła ratunkowe, odznaki i gracze.
let questions=[], baseQuestions=[], current=0, score=0, streak=0, points=0, locked=false, paused=false, saved=false, gameId="", timeLeft=15, timerId=null, blitzLeft=60, blitzId=null, startAnswerAt=0, perfect=true, quick=false, usedFifty=false, usedTime=false, badgesEarned=[], playerIndex=0, players=[], playerScores=[0,0], turnCorrect=[0,0], gameEnded=false, soundOn=true, themeIndex=Number(localStorage.getItem("theme")||0), roundScore=0;
// Czas na odpowiedź dla każdego poziomu trudności (w sekundach).
const TIMES= {
  easy:25,medium:15,hard:10
}
, MULT= {
  easy:1,medium:1.25,hard:1.5
};
// Skrót do pobierania elementu HTML po jego identyfikatorze.
const $=id=>document.getElementById(id);
// Zwraca tekst w wybranym języku i podmienia placeholdery, np. {n}.
function t(k,v= {
}
) {
  let s=(TEXTS[lang]||TEXTS.pl)[k]||k;
  Object.keys(v).forEach(a=>s=s.replaceAll(`{${a}}`,v[a]));
  return s;
}
// Tworzy unikalny identyfikator, aby serwer nie zapisał tego samego wyniku dwa razy.
function newGameId() {
  return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random();
}
// Znajduje aktualnie wybrany quiz na liście pobranej z serwera.
function currentQuiz() {
  return quizList.find(q=>q.id===quizId);
}
// Ustawia teksty strony zgodnie z językiem oraz aktualnym tytułem quizu.
function applyTexts() {
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));
  document.querySelectorAll(".lang button").forEach(b=>b.classList.toggle("active",b.dataset.lang===lang));
  const q=currentQuiz();
  if(q)$("main-title").textContent=q.title[lang]||q.title.pl;
}
// Zmienia język, zapisuje wybór i odświeża listę quizów.
function setLanguage(l) {
  lang=l;
  localStorage.setItem("lang",l);
  applyTexts();
  loadQuizzes();
}
// Buduje grupę przycisków wyboru (np. liczba pytań lub kategoria).
function makeButtons(container,items,selected,onSelect) {
  const box=$(container);
  box.innerHTML="";
  items.forEach(item=> {
    const b=document.createElement("button");
    b.type="button";
    b.textContent=item.label;
    b.classList.toggle("active",item.id===selected);
    b.addEventListener("click",()=>onSelect(item.id));
    box.appendChild(b);
  }
  );
}
// Odświeża ustawienia na ekranie startowym i zaznacza wybrane opcje.
function updateStart() {
  const q=currentQuiz();
  $("db-info").textContent=t("dbSize", {
    n:q?q.count:0
  }
  );
  document.querySelectorAll("#quiz-buttons button").forEach(b=>b.classList.toggle("active",b.dataset.id===quizId));
  makeButtons("pack-buttons",PACKS.map(p=>( {
    id:p,label:String(p)
  }
  )),pack,p=> {
    pack=p;
    localStorage.setItem("pack",p);
    updateStart();
  }
  );
  makeButtons("category-buttons",categories.map(c=>( {
    id:c.id,label:c.title[lang]||c.title.pl
  }
  )),category,c=> {
    category=c;
    updateStart();
  }
  );
}
// Pobiera listę quizów z API i tworzy przyciski wyboru.
async function loadQuizzes() {
  try {
    let r=await fetch(`${API}/api/quizzes?lang=${lang}`);
    quizList=await r.json();
    if(!quizList.some(q=>q.id===quizId)&&quizList.length)quizId=quizList[0].id;
    const box=$("quiz-buttons");
    box.innerHTML="";
    quizList.forEach(q=> {
      let b=document.createElement("button");
      b.textContent=q.title[lang]||q.title.pl;
      b.dataset.id=q.id;
      b.onclick=()=> {
        quizId=q.id;
        loadCategories();
      };
      box.appendChild(b);
    }
    );
    $("quiz-picker").hidden=quizList.length<2;
    await loadCategories();
  }
  catch(e) {
    $("db-info").textContent=t("serverError");
  }
}
// Pobiera kategorie dla aktualnego quizu i odświeża ich przyciski.
async function loadCategories() {
  try {
    const r=await fetch(`${API}/api/categories?lang=${lang}&quiz=${quizId}`);
    categories=await r.json();
  }
  catch(e) {
    categories=[ {
      id:"all",title: {
        pl:"Wszystkie",en:"All"
      }
    }
    ];
  }
  if(!categories.some(c=>c.id===category))category="all";
  applyTexts();
  updateStart();
}
// Wybiera tryb gry i pokazuje dodatkowe ustawienia, jeśli są potrzebne.
function chooseMode(m) {
  mode=m;
  document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  $("players-config").hidden=mode!=="duel";
}
// Zmienia poziom trudności i podświetla jego przycisk.
function chooseDifficulty(d) {
  difficulty=d;
  document.querySelectorAll("[data-difficulty]").forEach(b=>b.classList.toggle("active",b.dataset.difficulty===d));
}
// Przywraca początkowe wartości zmiennych przed rozpoczęciem nowej rundy.
function resetState() {
  clearInterval(timerId);
  clearInterval(blitzId);
  saved=false;
  paused=false;
  locked=false;
  gameEnded=false;
  current=score=streak=points=0;
  perfect=true;
  quick=false;
  usedFifty=usedTime=false;
  badgesEarned=[];
  playerIndex=0;
  playerScores=[0,0];
  turnCorrect=[0,0];
  roundScore=0;
  $("quiz").classList.remove("paused");
  $("pause-screen").hidden=true;
  $("fifty-btn").disabled=false;
  $("time-btn").disabled=false;
  $("fifty-btn").hidden=mode!=="classic"&&mode!=="daily";
  $("time-btn").hidden=mode!=="classic"&&mode!=="daily";
  $("lifelines").hidden=mode==="blitz"||mode==="survival"||mode==="duel";
  $("feedback").hidden=true;
  $("explanation").hidden=true;
  $("next").hidden=true;
  $("badge-live").textContent="";
  $("end").hidden=true;
  $("quiz").hidden=false;
  $("start-screen").hidden=true;
  $("name").disabled=false;
  $("save").disabled=false;
  $("save").textContent=t("save");
  $("duel-result").hidden=true;
}
// Rozpoczyna grę: pobiera pytania, ustawia ekran i uruchamia właściwy zegar.
async function start() {
  resetState();
  gameId=newGameId();
  saved=false;
  pack=Number(pack)||10;
  // Blitz i Przetrwanie korzystają z całej puli pytań, a nie z pakietu 5/10/20/30.
  const useFullPool=mode==="blitz"||mode==="survival";
  const url=`${API}/api/questions?lang=${lang}&quiz=${quizId}&pack=${pack}&category=${encodeURIComponent(category)}&daily=${mode==="daily"?1:0}${useFullPool?"&all=1":""}`;
  try {
    const r=await fetch(url);
    questions=await r.json();
  }
  catch(e) {
    questions=[];
  }
  if(!questions.length) {
    $("question").textContent=t("noQuestions");
    return;
  }
  // Zachowuje oryginalną pulę. W Blitz i Przetrwaniu kolejne partie pytań będą losowane z tej puli.
  baseQuestions=questions.slice();
  if(mode==="duel") {
    players=[$("player1-name").value.trim()||t("player1"),$("player2-name").value.trim()||t("player2")];
    $("lifelines").hidden=true;
  }
  $("mode-label").textContent=t(mode)+(mode==="duel"?` · ${players[0]} / ${players[1]}`:"");
  if(mode==="blitz") {
    blitzLeft=60;
    showBlitzTime();
    blitzId=setInterval(()=> {
      if(paused||gameEnded)return;
      blitzLeft-=.1;
      showBlitzTime();
      if(blitzLeft<=0) {
        clearInterval(blitzId);
        finishGame(t("blitzEnd"));
      }
    }
    ,100);
  }
  showQuestion();
}
// Aktualizuje informację o czasie pozostałym w trybie Blitz.
function showBlitzTime() {
  $("timer-text").textContent=`${Math.max(0,Math.ceil(blitzLeft))} s`;
  $("timer-fill").style.width=`${Math.max(0,blitzLeft/60*100)}%`;
  $("timer-fill").classList.toggle("low",blitzLeft<=10);
}
// Zwraca czas na odpowiedź uwzględniający wybrany poziom trudności.
function questionTime() {
  return TIMES[difficulty]||15;
}
// Aktualizuje pasek postępu i opis numeru pytania.
function updateProgress() {
  let extra=streak>=10?" ×3":streak>=5?" ×2":"";
  let player=mode==="duel"?` · ${players[playerIndex]}`:"";
  $("progress").textContent=(mode==="blitz"?`⭐ ${points} ${t("pts")} · ${score} ✓`:t("question", {
    n:current+1,total:questions.length
  }
  )+` · ⭐ ${points} ${t("pts")}`)+(streak>=2?` · 🔥 ${streak}${extra}`:"")+player;
  $("bar-fill").style.width=`${Math.min(100,current/questions.length*100)}%`;
}
// Wyświetla pozostały czas na odpowiedź oraz stan paska czasu.
function showTime() {
  if(mode==="blitz")return;
  $("timer-text").textContent=`${Math.max(0,Math.ceil(timeLeft))} s`;
  $("timer-fill").style.width=`${Math.max(0,timeLeft/questionTime()*100)}%`;
  $("timer-fill").classList.toggle("low",timeLeft<=5);
}
// Obsługuje tykanie zegara i reakcję na upłynięcie czasu.
function runTimer() {
  clearInterval(timerId);
  if(mode==="blitz")return;
  timerId=setInterval(()=> {
    if(paused||locked)return;
    timeLeft-=.1;
    showTime();
    if(timeLeft<=0) {
      clearInterval(timerId);
      answer(-1);
    }
  }
  ,100);
}
// Zatrzymuje poprzedni zegar pytania i uruchamia nowy.
function startTimer() {
  timeLeft=questionTime();
  showTime();
  runTimer();
}
// Wstawia treść pytania, obrazek i przyciski odpowiedzi do interfejsu.
function showQuestion() {
  if(gameEnded)return;
  if(current>=questions.length) {
    // Blitz trwa do końca 60 sekund, a Przetrwanie do pierwszej błędnej odpowiedzi.
    // Po wykorzystaniu wszystkich pytań dokładamy nową, przetasowaną kolejkę zamiast kończyć grę.
    if((mode==="blitz"||mode==="survival")&&baseQuestions.length) {
      const nextBatch=baseQuestions.slice();
      // Tasowanie Fishera–Yatesa: równomiernie miesza całą pulę pytań.
      for(let i=nextBatch.length-1;i>0;i--) {
        const j=Math.floor(Math.random()*(i+1));
        [nextBatch[i],nextBatch[j]]=[nextBatch[j],nextBatch[i]];
      }
      const previousQuestion=questions[current-1];
      // Jeśli to możliwe, unikaj powtórzenia tego samego pytania na granicy dwóch kolejek.
      if(nextBatch.length>1&&nextBatch[0]===previousQuestion) {
        [nextBatch[0],nextBatch[1]]=[nextBatch[1],nextBatch[0]];
      }
      questions.push(...nextBatch);
    } else {
      finishGame();
      return;
    }
  }
  locked=false;
  const q=questions[current];
  $("question").textContent=q.question||"";
  const img=$("question-image");
  if(q.image) {
    img.src=q.image;
    img.alt=q.image_alt||q.question||"Question image";
    img.hidden=false;
  }
  else {
    img.removeAttribute("src");
    img.hidden=true;
  }
  updateProgress();
  const box=$("answers");
  box.innerHTML="";
  (q.answers||[]).forEach((text,i)=> {
    const b=document.createElement("button");
    b.type="button";
    b.textContent=text;
    b.addEventListener("click",()=>answer(i));
    box.appendChild(b);
  }
  );
  $("feedback").hidden=true;
  $("explanation").hidden=true;
  $("next").hidden=true;
  $("fifty-btn").disabled=usedFifty;
  $("time-btn").disabled=usedTime;
  startAnswerAt=performance.now();
  if(mode!=="blitz")startTimer();
}
// Odtwarza krótki dźwięk dla poprawnej lub błędnej odpowiedzi, jeśli dźwięk jest włączony.
function playTone(ok) {
  if(!soundOn)return;
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value=ok?660:180;
    g.gain.value=.045;
    o.start();
    o.stop(ctx.currentTime+.13);
    o.onended=()=>ctx.close();
  }
  catch(e) {
  }
}
// Sprawdza wybraną odpowiedź, aktualizuje punkty/serię i blokuje wielokrotne kliknięcie.
function answer(i) {
  if(locked||paused||gameEnded)return;
  locked=true;
  clearInterval(timerId);
  const q=questions[current],buttons=[...document.querySelectorAll("#answers button")],fb=$("feedback");
  const correct=Number(q.correct);
  if(buttons[correct])buttons[correct].classList.add("good");
  const elapsed=(performance.now()-startAnswerAt)/1000;
  let correctNow=i===correct;
  if(correctNow) {
    score++;
    streak++;
    turnCorrect[playerIndex]++;
    if(elapsed<2)quick=true;
    const base=100+Math.round(Math.max(0,timeLeft)/questionTime()*50);
    const streakMult=streak>=10?3:streak>=5?2:1;
    const earned=Math.round(base*streakMult*MULT[difficulty]);
    roundScore+=earned;
    points+=earned;
    if(mode==="duel")playerScores[playerIndex]+=earned;
    fb.textContent=t("correct", {
      points:earned
    }
    )+(streakMult>1?` · ×${streakMult}`:"");
    fb.className="good";
    playTone(true);
  }
  else {
    perfect=false;
    streak=0;
    if(i>=0&&buttons[i])buttons[i].classList.add("bad");
    fb.textContent=i===-1?t("timeout"):t("wrong");
    // W Blitz szybka błędna odpowiedź wygląda jak zgadywanie/spamowanie przycisków.
    // Jeśli odpowiedź padła w mniej niż 2 sekundy, odejmujemy 5 sekund z zegara.
    if(mode==="blitz"&&i>=0&&elapsed<2) {
      const penalty=5;
      blitzLeft=Math.max(0,blitzLeft-penalty);
      fb.textContent+=lang==="pl"?` · kara −${penalty} s`:` · −${penalty} s penalty`;
      showBlitzTime();
    }
    fb.className="bad";
    playTone(false);
  }
  fb.hidden=false;
  updateProgress();
  if(q.explanation) {
    $("explanation").textContent="💡 "+q.explanation;
    $("explanation").hidden=false;
  }
  if(mode==="survival"&&!correctNow) {
    finishGame(t("survivalEnd"));
    return;
  }
  if(mode==="blitz") {
    // Kara może wyzerować zegar, więc natychmiast kończymy rundę zamiast pokazywać kolejne pytanie.
    if(blitzLeft<=0) {
      finishGame(t("blitzEnd"));
      return;
    }
    current++;
    locked=false;
    setTimeout(()=> {
      if(!gameEnded)showQuestion();
    }
    ,450);
    return;
  }
  if(mode==="duel") {
    $("next").textContent=current+1<questions.length?t("next"):t("seeResult");
  }
  else {
    $("next").textContent=current+1<questions.length?t("next"):t("seeResult");
  }
  $("next").hidden=false;
}
// Koło ratunkowe 50/50 usuwa dwie błędne odpowiedzi; można go użyć raz na grę.
function useFifty() {
  if(usedFifty||locked||paused)return;
  const q=questions[current],buttons=[...document.querySelectorAll("#answers button")],wrong=buttons.map((_,i)=>i).filter(i=>i!==Number(q.correct));
  wrong.sort(()=>Math.random()-.5).slice(0,Math.max(0,wrong.length-1)).forEach(i=>buttons[i].classList.add("removed"));
  // Keep exactly one wrong answer when possible; hide two incorrect choices.
  const stillWrong=wrong.filter(i=>!buttons[i].classList.contains("removed"));
  if(stillWrong.length>1)stillWrong.slice(1).forEach(i=>buttons[i].classList.add("removed"));
  usedFifty=true;
  $("fifty-btn").disabled=true;
}
// Dodaje 10 sekund do zegara pytania; można użyć tej pomocy raz na grę.
function useTime() {
  if(usedTime||locked||paused||mode==="blitz")return;
  usedTime=true;
  timeLeft+=10;
  showTime();
  $("time-btn").disabled=true;
}
// Przechodzi do kolejnego pytania albo kończy rundę, gdy warunki trybu są spełnione.
function nextQuestion() {
  if(!locked)return;
  $("next").hidden=true;
  if(mode==="duel")playerIndex=1-playerIndex;
  current++;
  if(current>=questions.length) {
    finishGame();
    return;
  }
  showQuestion();
}
// Sprawdza warunki zdobycia odznak i pokazuje te, które gracz zdobył.
function awardBadges() {
  badgesEarned=[];
  if(streak>=10)badgesEarned.push(t("streakBadge"));
  if(perfect&&score===questions.length&&mode!=="blitz")badgesEarned.push(t("perfectBadge"));
  if(quick)badgesEarned.push(t("fastBadge"));
  $("badges").innerHTML="";
  badgesEarned.forEach(label=> {
    const b=document.createElement("span");
    b.className="badge";
    b.textContent=label;
    $("badges").appendChild(b);
  }
  );
}
// Tworzy dekoracyjną animację konfetti na ekranie wyniku.
function confetti() {
  const root=$("confetti");
  root.innerHTML="";
  for(let i=0;
  i<55;
  i++) {
    const s=document.createElement("i");
    s.style.left=Math.random()*100+"%";
    s.style.animationDelay=Math.random()*1.2+"s";
    s.style.setProperty("--drift",(Math.random()*160-80)+"px");
    root.appendChild(s);
  }
  setTimeout(()=>root.innerHTML="",4000);
}
// Kończy rozgrywkę, zatrzymuje zegary i pokazuje podsumowanie.
function finishGame(reason="") {
  if(gameEnded)return;
  gameEnded=true;
  clearInterval(timerId);
  clearInterval(blitzId);
  $("quiz").hidden=true;
  $("end").hidden=false;
  $("start-screen").hidden=true;
  awardBadges();
  // W Blitz i Przetrwaniu liczba pytań nie jest stałym celem, więc nie pokazujemy wyniku „x / y”.
  const total=mode==="blitz"?score:questions.length;
  const p=total?score/total:0;
  let msg=p===1?t("msgPerfect"):p>=.7?t("msgGreat"):p>=.4?t("msgOk"):t("msgLow");
  if(mode==="survival")msg=t("survivalEnd");
  if(mode==="blitz")msg=t("blitzEnd");
  // Tryby specjalne mają własny komunikat końcowy; nie dodawaj go drugi raz przez argument reason.
  const reasonPrefix=(mode==="survival"||mode==="blitz")?"":(reason?reason+" · ":"");
  const scoreSummary=`${t("score")}: ${score}${mode==="blitz"||mode==="survival"?"":" / "+total} · ⭐ ${points} ${t("pts")}`;
  $("result").textContent=`${reasonPrefix}${scoreSummary} — ${msg}`;
  if(mode==="duel") {
    $("duel-result").hidden=false;
    const winner=playerScores[0]===playerScores[1]?t("draw"):t("winner", {
      name:players[playerScores[0]>playerScores[1]?0:1]
    }
    );
    $("duel-result").textContent=`${players[0]}: ${playerScores[0]} · ${players[1]}: ${playerScores[1]} — ${winner}`;
    $("name").value=players[0];
    $("save").hidden=true;
  }
  else {
    $("save").hidden=false;
  }
  if(mode==="classic"&&perfect&&score===questions.length)confetti();
  showRanking(pack);
}
// Włącza lub wyłącza przycisk zapisu wyniku.
function setSaveLocked(v) {
  $("name").disabled=v;
  $("save").disabled=v;
  $("save").textContent=v?t("saved"):t("save");
}
// Wraca do ekranu startowego i przygotowuje aplikację do kolejnej gry.
function resetQuiz() {
  clearInterval(timerId);
  clearInterval(blitzId);
  $("quiz").hidden=true;
  $("end").hidden=true;
  $("start-screen").hidden=false;
  $("quiz").classList.remove("paused");
  $("pause-screen").hidden=true;
  $("name").value="";
  $("save").hidden=false;
  $("save").disabled=false;
  $("name").disabled=false;
  $("save").textContent=t("save");
  updateStart();
}
// Wstrzymuje lub wznawia rozgrywkę i odpowiednie zegary.
function togglePause() {
  if($("quiz").hidden||gameEnded)return;
  paused=!paused;
  $("quiz").classList.toggle("paused",paused);
  $("pause-screen").hidden=!paused;
  if(paused) {
    clearInterval(timerId);
    clearInterval(blitzId);
  }
  else {
    if(mode==="blitz")blitzId=setInterval(()=> {
      if(paused||gameEnded)return;
      blitzLeft-=.1;
      showBlitzTime();
      if(blitzLeft<=0) {
        clearInterval(blitzId);
        finishGame(t("blitzEnd"));
      }
    }
    ,100);
    else if(!locked)runTimer();
  }
}
// Pyta o potwierdzenie i wraca do menu, jeśli gracz chce przerwać bieżącą grę.
function restartQuiz() {
  if(confirm(t("confirmRestart")))resetQuiz();
}
// Rysuje listę wyników rankingu w HTML.
function showRanking(p) {
  rankPack=p;
  // Każdy tryb specjalny ma własny ranking, bez przełączników rozmiaru pakietu.
  const specialMode=["blitz","survival","daily"].includes(mode);
  const rankNames={
    blitz:lang==="pl"?"Ranking — Blitz 60 s":"Leaderboard — Blitz 60 s",
    survival:lang==="pl"?"Ranking — Przetrwanie":"Leaderboard — Survival",
    daily:lang==="pl"?"Ranking — Dzienne wyzwanie":"Leaderboard — Daily challenge"
  };
  $("rank-title").textContent=specialMode?rankNames[mode]+(mode==="daily"?` · ${new Date().toISOString().slice(0,10)}`:""):t("rankingFor",{n:p});
  $("rank-tabs").hidden=specialMode;
  if(!specialMode) {
    makeButtons("rank-tabs",PACKS.map(n=>({id:n,label:String(n)})),rankPack,n=>showRanking(n));
  }
  loadRanking();
}
// Pobiera ranking dla wybranych ustawień i wyświetla go na ekranie końcowym.
async function loadRanking() {
  try {
    const day=mode==="daily"?`&daily_date=${new Date().toISOString().slice(0,10)}`:"";
    const r=await fetch(`${API}/api/results?quiz=${quizId}&pack=${rankPack}&mode=${mode}&category=${encodeURIComponent(category)}${day}`);
    const data=await r.json();
    const list=$("ranking");
    list.innerHTML="";
    if(!data.length) {
      const li=document.createElement("li");
      li.className="empty";
      li.textContent=t("noResults");
      list.appendChild(li);
      return;
    }
    data.forEach(r=> {
      const li=document.createElement("li");
      li.textContent=`${r.name}: ⭐ ${r.points||0} ${t("pts")} (${r.score}/${r.total}) — ${r.date}`;
      list.appendChild(li);
    }
    );
  }
  catch(e) {
  }
}
// Wysyła wynik do serwera i aktualizuje informację o zapisie.
async function saveScore() {
  if(saved||mode==="duel")return;
  saved=true;
  setSaveLocked(true);
  const name=$("name").value.trim()||t("anonymous");
  try {
    const r=await fetch(`${API}/api/score`, {
      method:"POST",headers: {
        "Content-Type":"application/json"
      }
      ,body:JSON.stringify( {
        name,score,total:mode==="blitz"?score:questions.length,points,game_id:gameId,quiz:quizId,pack,mode,category,daily_date:mode==="daily"?new Date().toISOString().slice(0,10):""
      }
      )
    }
    );
    if(!r.ok&&r.status!==409)throw Error("save failed");
    showRanking(pack);
  }
  catch(e) {
    saved=false;
    setSaveLocked(false);
    alert(t("serverError"));
  }
}
// Ustawia motyw kolorystyczny zapisany w przeglądarce.
function applyTheme() {
  const themes=["", "theme-blue", "theme-purple", "theme-green", "theme-light"];
  document.body.classList.remove("theme-blue","theme-purple","theme-green","theme-light");
  if(themes[themeIndex])document.body.classList.add(themes[themeIndex]);
  $("theme-btn").textContent=themeIndex===4?"☀️":"🎨";
  localStorage.setItem("theme",themeIndex);
}
// Podłączenie zdarzeń interfejsu: przyciski startu, nawigacji, pomocy i ustawień.
$("start-btn").addEventListener("click",start);
$("next").addEventListener("click",nextQuestion);
$("again").addEventListener("click",resetQuiz);
$("save").addEventListener("click",saveScore);
$("pause-btn").addEventListener("click",togglePause);
$("resume-btn").addEventListener("click",togglePause);
$("restart-btn").addEventListener("click",restartQuiz);
$("fifty-btn").addEventListener("click",useFifty);
$("time-btn").addEventListener("click",useTime);
$("sound-btn").addEventListener("click",()=> {
  soundOn=!soundOn;
  $("sound-btn").textContent=soundOn?"🔊":"🔇";
}
);
$("theme-btn").addEventListener("click",()=> {
  themeIndex=(themeIndex+1)%5;
  applyTheme();
}
);
document.querySelectorAll(".lang button").forEach(b=>b.addEventListener("click",()=>setLanguage(b.dataset.lang)));
document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>chooseMode(b.dataset.mode)));
document.querySelectorAll("[data-difficulty]").forEach(b=>b.addEventListener("click",()=>chooseDifficulty(b.dataset.difficulty)));
// Skróty klawiaturowe do odpowiadania i obsługi quizu.
document.addEventListener("keydown",e=> {
  if($("quiz").hidden)return;
  const k=e.key.toLowerCase();
  if(k==="p") {
    togglePause();
    return;
  }
  if(paused)return;
  if(!locked&&["a","b","c","d"].includes(k)) {
    const idx=k.charCodeAt(0)-97;
    if(idx<$("answers").children.length)answer(idx);
  }
  else if(locked&&(e.key==="Enter"||e.key===" ")) {
    e.preventDefault();
    $("next").click();
  }
}
);
applyTexts();
applyTheme();
chooseMode("classic");
chooseDifficulty("medium");
loadQuizzes();
