# Flask obsługuje żądania HTTP, zwraca JSON i renderuje stronę HTML.
from flask import Flask, jsonify, request, render_template
from datetime import datetime, date
import json, random, os, hashlib

# Tworzy aplikację Flask. Pliki HTML są domyślnie szukane w katalogu templates.
app = Flask(__name__)
# Dozwolone języki i zestawy długości quizu dostępne w interfejsie.
LANGS = ["pl", "en"]
PACKS = [5, 10, 20, 30]
DEFAULT_PACK = 10
DEFAULT_QUIZ = "tech"
RESULTS_FILE = "results.json"
QUIZZES = {
    "tech": {
        "title": {"pl": "Quiz o technologii", "en": "Tech Quiz"},
        "file": "questions_{lang}.json",
    },
}

# Dodaje nagłówki CORS do odpowiedzi, aby frontend uruchomiony na innym porcie mógł pytać API.
@app.after_request
def add_cors_headers(response):
    # Przy uruchamianiu lokalnym pozwala używać Live Servera. Na publicznym serwerze
    # ustaw konkretną domenę zamiast '*'.
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

# Wczytuje plik JSON. Gdy pliku brakuje albo zawiera błędny JSON, zwraca wartość domyślną.
def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default

# Sprawdza język z parametrów żądania i w razie potrzeby wybiera polski.
def clean_lang(value):
    return value if value in LANGS else "pl"

# Ogranicza wybór quizu do identyfikatorów skonfigurowanych w QUIZZES.
def clean_quiz(value):
    return value if value in QUIZZES else DEFAULT_QUIZ

# Sprawdza liczbę pytań; nieobsługiwana wartość jest zastępowana domyślną.
def clean_pack(value):
    try:
        pack = int(value)
    except (TypeError, ValueError):
        return DEFAULT_PACK
    return pack if pack in PACKS else DEFAULT_PACK

# Odczytuje bazę pytań dla wybranego quizu i języka.
def load_questions(quiz, lang):
    return load_json(QUIZZES[quiz]["file"].format(lang=lang), [])

# Zwraca znormalizowaną nazwę kategorii pytania.
def category_of(question):
    return str(question.get("category", "all")).strip().lower()

# Filtruje pytania po kategorii, tasuje je i zwraca wybraną liczbę.
# Wyzwanie dzienne używa stałego ziarna, więc danego dnia kolejność jest powtarzalna.
def select_questions(quiz, lang, pack, category="all", daily=False):
    qs = load_questions(quiz, lang)
    if category and category != "all":
        filtered = [q for q in qs if category_of(q) == category.lower()]
        # Jeśli pytania nie mają kategorii lub wybrana kategoria jest pusta, nie zwracaj pustego quizu.
        if filtered:
            qs = filtered
    if daily:
        seed = f"{date.today().isoformat()}:{quiz}:{lang}:{category}"
        random.Random(seed).shuffle(qs)
    else:
        random.shuffle(qs)
    return qs[:min(pack, len(qs))]

# Strona główna: Flask zwraca szablon HTML interfejsu quizu.
@app.route("/")
def index():
    return render_template("index.html")

# API: lista quizów, które mają przynajmniej jedno pytanie w wybranym języku.
@app.route("/api/quizzes")
def quizzes():
    lang = clean_lang(request.args.get("lang"))
    result = []
    for quiz_id, info in QUIZZES.items():
        count = len(load_questions(quiz_id, lang))
        if count:
            result.append({"id": quiz_id, "title": info["title"], "count": count})
    return jsonify(result)

# API: zwraca kategorie znalezione w bazie pytań wraz z etykietami PL/EN.
@app.route("/api/categories")
def categories():
    lang = clean_lang(request.args.get("lang"))
    quiz = clean_quiz(request.args.get("quiz"))
    qs = load_questions(quiz, lang)
    found = sorted({category_of(q) for q in qs if q.get("category")})
    labels = {"phones": {"pl": "Telefony", "en": "Phones"},
              "systems": {"pl": "Systemy", "en": "Operating systems"},
              "computer-parts": {"pl": "Części komputera", "en": "Computer parts"},
              "consoles": {"pl": "Konsole", "en": "Consoles"}}
    result = [{"id": "all", "title": {"pl": "Wszystkie", "en": "All"}}]
    for c in found:
        result.append({"id": c, "title": labels.get(c, {"pl": c.replace("-", " ").title(), "en": c.replace("-", " ").title()})})
    return jsonify(result)

# API: pobiera parametry quizu i zwraca pasującą pulę pytań.
@app.route("/api/questions")
def questions():
    lang = clean_lang(request.args.get("lang"))
    quiz = clean_quiz(request.args.get("quiz"))
    # Blitz i Przetrwanie mogą pobrać całą bazę, niezależnie od pakietu 5/10/20/30.
    all_questions = request.args.get("all", "0") == "1"
    pack = len(load_questions(quiz, lang)) if all_questions else clean_pack(request.args.get("pack"))
    category = request.args.get("category", "all")
    daily = request.args.get("daily", "0") == "1"
    return jsonify(select_questions(quiz, lang, pack, category, daily))

# API: zapisuje wynik gry. OPTIONS obsługuje wstępne zapytanie CORS przeglądarki.
@app.route("/api/score", methods=["POST", "OPTIONS"])
def save_score():
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    quiz = clean_quiz(data.get("quiz"))
    pack = clean_pack(data.get("pack"))
    mode = str(data.get("mode", "classic"))[:24]
    daily_date = str(data.get("daily_date", ""))[:10] if mode == "daily" else ""
    # Odczytuje istniejące wyniki; identyfikator gry zapobiega zapisaniu tego samego wyniku dwa razy.
    results = load_json(RESULTS_FILE, [])
    game_id = str(data.get("game_id", ""))[:100]
    if game_id and any(r.get("game_id") == game_id for r in results):
        return jsonify({"ok": False, "error": "already saved"}), 409
    try:
        score = max(0, int(data.get("score", 0)))
        total = max(0, int(data.get("total", 0)))
        points = max(0, int(data.get("points", 0)))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "invalid score"}), 400
    results.append({
        "name": str(data.get("name", "Anonim")).strip()[:40] or "Anonim",
        "score": score, "total": total, "points": points,
        "quiz": quiz, "pack": pack, "mode": mode,
        "category": str(data.get("category", "all"))[:40],
        "game_id": game_id or None, "daily_date": daily_date,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
    })
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    return jsonify({"ok": True})

# API: pobiera ranking i filtruje go według quizu, długości, trybu, kategorii i daty.
@app.route("/api/results")
def results():
    quiz = clean_quiz(request.args.get("quiz"))
    pack = clean_pack(request.args.get("pack"))
    mode = str(request.args.get("mode", "classic"))[:24]
    category = request.args.get("category", "all")
    daily_date = request.args.get("daily_date", date.today().isoformat()) if mode == "daily" else ""
    res = load_json(RESULTS_FILE, [])
    # Tryby specjalne mają osobne rankingi niezależne od rozmiaru pakietu klasycznego.
    special_modes = {"blitz", "survival", "daily"}
    res = [r for r in res
           if r.get("quiz", DEFAULT_QUIZ) == quiz
           and (mode in special_modes or int(r.get("pack", r.get("total", 0)) or 0) == pack)
           and r.get("mode", "classic") == mode
           and (mode != "daily" or r.get("daily_date", "") == daily_date)
           and (category == "all" or r.get("category", "all") == category)]
    res.sort(key=lambda r: (r.get("points", 0), r.get("score", 0)), reverse=True)
    return jsonify(res[:10])

# Uruchamia serwer developerski po bezpośrednim wykonaniu: python app.py.
if __name__ == "__main__":
    app.run(debug=True)
