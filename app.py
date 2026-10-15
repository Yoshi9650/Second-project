# ===================================================
# IMPORTY: gotowe narzędzia, z których korzystamy
# ===================================================
from flask import Flask, jsonify, request, render_template  # serwer, odpowiedzi JSON, dane z zapytania, strony HTML
import json, random                  # json: pliki JSON; random: losowanie pytań
from datetime import datetime        # data i godzina zapisu wyniku

# Tworzymy aplikację Flask
app = Flask(__name__)


# ===================================================
# USTAWIENIA
# ===================================================
LANGS = ["pl", "en"]         # obsługiwane języki
PACKS = [5, 10, 20, 30]      # dostępne długości quizu (ta sama lista jest w script.js, trzymaj je zgodne)
DEFAULT_PACK = 10            # pakiet używany, gdy przyjdzie błędna wartość
DEFAULT_QUIZ = "tech"        # quiz używany, gdy przyjdzie nieznany identyfikator

# REJESTR QUIZÓW
# Każdy quiz ma identyfikator, tytuły w obu językach i wzór nazwy pliku z pytaniami.
# {lang} zostanie zastąpione przez "pl" albo "en".
#
# JAK DODAĆ NOWY QUIZ:
#   1. Stwórz pliki z pytaniami (taki sam format jak w questions_pl.json),
#      np. quizzes/geo_pl.json i quizzes/geo_en.json
#   2. Odkomentuj albo dopisz wpis poniżej
#   3. Zrestartuj serwer. Gdy quizów jest więcej niż jeden, na ekranie startowym
#      pojawi się wybór quizu, a każdy quiz ma własne tabele wyników.
QUIZZES = {
    "tech": {
        "title": {"pl": "Quiz o technologii", "en": "Tech Quiz"},
        "file": "questions_{lang}.json",
    },
    # PRZYKŁAD przyszłego quizu:
    # "geo": {
    #     "title": {"pl": "Quiz o geografii", "en": "Geography Quiz"},
    #     "file": "quizzes/geo_{lang}.json",
    # },
}


# ===================================================
# FUNKCJE POMOCNICZE
# ===================================================
def load_json(path, default):
    """Wczytuje plik JSON. Jeśli pliku nie ma, zwraca 'default'
    (np. results.json nie istnieje, dopóki ktoś nie zapisze pierwszego wyniku)."""
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


# Trzy funkcje "czyszczące": zamieniają wartość z adresu na bezpieczną,
# więc nikt nie wymusi otwarcia dowolnego pliku ani dziwnego pakietu.
def clean_lang(value):
    return value if value in LANGS else "pl"

def clean_quiz(value):
    return value if value in QUIZZES else DEFAULT_QUIZ

def clean_pack(value):
    try:
        pack = int(value)            # z adresu przychodzi tekst, np. "10"
    except (TypeError, ValueError):
        return DEFAULT_PACK
    return pack if pack in PACKS else DEFAULT_PACK

def load_questions(quiz, lang):
    """Wczytuje wszystkie pytania wybranego quizu w wybranym języku."""
    path = QUIZZES[quiz]["file"].format(lang=lang)
    return load_json(path, [])


# ===================================================
# STRONA GŁÓWNA
# ===================================================
@app.route("/")
def index():
    return render_template("index.html")


# ===================================================
# API: lista dostępnych quizów
# ===================================================
@app.route("/api/quizzes")
def quizzes():
    lang = clean_lang(request.args.get("lang"))
    result = []
    for quiz_id, info in QUIZZES.items():
        count = len(load_questions(quiz_id, lang))
        if count > 0:                # quiz bez pytań w tym języku pomijamy
            result.append({
                "id": quiz_id,
                "title": info["title"],   # tytuły w obu językach
                "count": count,           # liczba pytań w bazie (dla tego języka)
            })
    return jsonify(result)


# ===================================================
# API: pytania do quizu
# ===================================================
@app.route("/api/questions")
def questions():
    # np. /api/questions?lang=en&quiz=tech&pack=10
    lang = clean_lang(request.args.get("lang"))
    quiz = clean_quiz(request.args.get("quiz"))
    pack = clean_pack(request.args.get("pack"))

    qs = load_questions(quiz, lang)
    random.shuffle(qs)               # miesza kolejność
    return jsonify(qs[:pack])        # bierze tyle pytań, ile wynosi pakiet


# ===================================================
# API: zapis wyniku do rankingu
# ===================================================
@app.route("/api/score", methods=["POST"])
def save_score():
    data = request.get_json()
    quiz = clean_quiz(data.get("quiz"))
    pack = clean_pack(data.get("pack"))
    results = load_json("results.json", [])

    # Blokada duplikatów: ten sam numer partii (game_id) można zapisać tylko raz
    game_id = data.get("game_id")
    if game_id and any(r.get("game_id") == game_id for r in results):
        return jsonify({"ok": False, "error": "already saved"}), 409   # 409 = konflikt

    results.append({
        "name": data["name"],
        "score": data["score"],
        "total": data["total"],
        "points": data.get("points", 0),
        "quiz": quiz,                # z którego quizu jest wynik
        "pack": pack,                # w którym pakiecie pytań (5, 10, 20 albo 30)
        "game_id": game_id,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
    })
    with open("results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    return jsonify({"ok": True})


# ===================================================
# API: ranking dla wybranego quizu i pakietu
# ===================================================
@app.route("/api/results")
def results():
    quiz = clean_quiz(request.args.get("quiz"))
    pack = clean_pack(request.args.get("pack"))
    res = load_json("results.json", [])

    # Zostawiamy tylko wyniki z tego quizu i tego pakietu.
    # Stare wyniki bez pól quiz/pack traktujemy jako quiz "tech",
    # a za pakiet uznajemy liczbę pytań, na które odpowiadano (total).
    res = [
        r for r in res
        if r.get("quiz", DEFAULT_QUIZ) == quiz
        and r.get("pack", r.get("total")) == pack
    ]
    res.sort(key=lambda r: r.get("points", 0), reverse=True)   # od najlepszego
    return jsonify(res[:10])


# ===================================================
# URUCHOMIENIE SERWERA
# ===================================================
if __name__ == "__main__":
    app.run(debug=True)
