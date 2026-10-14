# ===================================================
# IMPORTY: gotowe narzędzia, z których korzystamy
# ===================================================
from flask import Flask, jsonify, request, render_template  # Flask: serwer; jsonify: odpowiedź w JSON; request: dane z zapytania; render_template: wysyłanie stron HTML
import json, random                  # json: czytanie i zapis plików JSON; random: losowanie pytań
from datetime import datetime        # aktualna data i godzina (do zapisu wyniku)
 
# Tworzymy aplikację Flask. __name__ pomaga jej znaleźć foldery templates i static
app = Flask(__name__)
 
 
# ===================================================
# FUNKCJA POMOCNICZA: wczytywanie plików JSON
# ===================================================
def load_json(path, default):
    """Wczytuje plik JSON i zwraca jego zawartość.
    Jeśli pliku nie ma, zwraca wartość 'default' zamiast zatrzymywać program z błędem
    (np. results.json nie istnieje, dopóki ktoś nie zapisze pierwszego wyniku)."""
    try:
        with open(path, encoding="utf-8") as f:   # utf-8, żeby działały polskie litery
            return json.load(f)                   # zamienia tekst JSON na listy i słowniki Pythona
    except FileNotFoundError:
        return default
 
 
# ===================================================
# STRONA GŁÓWNA
# ===================================================
@app.route("/")                      # ten adres to strona główna (127.0.0.1:5000/)
def index():
    # wysyła plik index.html z folderu templates
    return render_template("index.html")
 
 
# Lista obsługiwanych języków (potrzebna do sprawdzania w /api/count)
LANGS = ["pl", "en"]
 
 
# ===================================================
# API: pytania do quizu
# ===================================================
# Pytania leżą w plikach questions_pl.json i questions_en.json.
# Każdy plik to lista [ ... ], a każde pytanie wygląda tak:
#
#   {
#     "question": "Treść pytania?",
#     "answers": ["odpowiedź A", "odpowiedź B", "odpowiedź C"],
#     "correct": 1,                      <- numer poprawnej odpowiedzi, liczony od 0
#     "explanation": "Ciekawostka"       <- opcjonalne, pokazuje się po odpowiedzi
#   }
#
# Pytania w obu językach muszą mieć taką samą kolejność odpowiedzi.
@app.route("/api/questions")
def questions():
    # odczytuje język z adresu, np. /api/questions?lang=en. Domyślnie "pl"
    lang = request.args.get("lang", "pl")
    # wczytuje plik z pytaniami dla danego języka (questions_pl.json albo questions_en.json)
    qs = load_json(f"questions_{lang}.json", [])
    random.shuffle(qs)               # miesza kolejność pytań
    return jsonify(qs[:20])          # zwraca pierwsze 20 po wymieszaniu (zmień liczbę, żeby zmienić długość quizu)
 
 
# ===================================================
# API: liczba pytań w bazie
# ===================================================
@app.route("/api/count")
def count():
    lang = request.args.get("lang", "pl")
    if lang not in LANGS:            # zabezpieczenie: tylko języki z listy LANGS
        lang = "pl"
    # len() zwraca liczbę elementów listy, czyli liczbę pytań w pliku
    return jsonify({"count": len(load_json(f"questions_{lang}.json", []))})
 
 
# ===================================================
# API: zapis wyniku do rankingu
# ===================================================
@app.route("/api/score", methods=["POST"])   # POST = ten adres przyjmuje dane wysyłane przez JS
def save_score():
    data = request.get_json()                # odbiera dane wysłane przez przeglądarkę (imię, wynik, punkty)
    results = load_json("results.json", []) # wczytuje dotychczasowe wyniki (albo pustą listę)
    # dopisuje nowy wynik na koniec listy
    results.append({
        "name": data["name"],
        "score": data["score"],
        "total": data["total"],
        "points": data.get("points", 0),     # .get daje 0, jeśli pola "points" nie ma
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),   # data w formacie np. 2026-10-14 18:30
    })
    # zapisujemy całą listę z powrotem do pliku ("w" nadpisuje plik, dlatego wcześniej wczytaliśmy stare wyniki)
    with open("results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)   # ensure_ascii=False zachowuje polskie litery, indent=2 robi czytelne wcięcia
    return jsonify({"ok": True})             # odpowiedź dla JS: wszystko się udało
 
 
# ===================================================
# API: ranking najlepszych wyników
# ===================================================
@app.route("/api/results")
def results():
    res = load_json("results.json", [])
    # sortuje od największej liczby punktów (reverse=True = malejąco);
    # lambda mówi, po czym sortować; .get daje 0 dla starych wyników bez punktów
    res.sort(key=lambda r: r.get("points", 0), reverse=True)
    return jsonify(res[:10])                 # zwraca 10 najlepszych
 
 
# ===================================================
# URUCHOMIENIE SERWERA
# ===================================================
# Ten warunek jest prawdziwy tylko wtedy, gdy uruchamiasz ten plik bezpośrednio (python app.py)
if __name__ == "__main__":
    # debug=True: serwer sam się restartuje po zmianach w kodzie i pokazuje czytelne błędy
    app.run(debug=True)