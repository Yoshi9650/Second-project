from flask import Flask, jsonify, request, render_template
import json, random
from datetime import datetime

app = Flask(__name__)

def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/questions")
def questions():
    qs = load_json("questions.json", [])
    random.shuffle(qs)
    return jsonify(qs[:15])

@app.route("/api/score", methods=["POST"])
def save_score():
    data = request.get_json()
    results = load_json("results.json", [])
    results.append({
        "name": data["name"],
        "score": data["score"],
        "total": data["total"],
        "points": data.get("points", 0),
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
    })
    with open("results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    return jsonify({"ok": True})

@app.route("/api/results")
def results():
    res = load_json("results.json", [])
    res.sort(key=lambda r: r.get("points", 0), reverse=True)
    return jsonify(res[:10])

if __name__ == "__main__":
    app.run(debug=True)