"""
Al-Aahad Marketing Group - WhatsApp bot (single file)

Install:   pip install flask requests
Run:       python bot.py
Webhook:   https://YOUR-SERVER/webhook  (set in Meta dashboard, subscribe to "messages")
"""

import os
import time

import requests
from flask import Flask, request

# ---------- SETTINGS (paste your values here, or set them as environment variables) ----------

TOKEN = os.environ.get("WHATSAPP_TOKEN", "PASTE_YOUR_ACCESS_TOKEN_HERE")
PHONE_NUMBER_ID = os.environ.get("PHONE_NUMBER_ID", "PASTE_YOUR_PHONE_NUMBER_ID_HERE")
VERIFY_TOKEN = os.environ.get("VERIFY_TOKEN", "PASTE_ANY_SECRET_WORD_HERE")
PORT = int(os.environ.get("PORT", 3000))

app = Flask(__name__)

# ---------- CONTENT (edit texts here only) ----------

WELCOME = (
    "Assalam-o-Alaikum!\n"
    "Al-Aahad Marketing Group se rabta karne ka shukriya!\n"
    "Hum aapko aapke budget aur zarooriyat ke mutabiq behtareen property dhoondhne mein madad karte hain."
)

MAIN_MENU_INTRO = (
    "Mazeed Maloomat Hasil Karne Ke Liye Neeche Diye Gaye Options Mein Se Kisi Ek Ka Number Reply Karein."
)

WEBSITE = "https://alaahadmarketinggroup.com/"
SALES_NUMBER = "03022285787"

# To add a new project, add one dict here. Menu numbers update automatically.
PROJECTS = [
    {
        "name": "Bolan Hills",
        "location": "the location is https://maps.app.goo.gl/4trB3X3377pbHcUX8",
        "price": "The price is 3,500,000 for 80 square yds\n"
                 "The price is 4,500,000 for 120 square yds",
        "verified": "the project is verified by SBCA\nthe project is leased by LDA",
    },
    {
        "name": "Titanium",
        "location": "the location is https://maps.app.goo.gl/S3UHn7Xh8MVQ3st86",
        "price": "The price is 4,495,000 for 80 square yds\n"
                 "The price is 5,795,000 for 120 square yds",
        "verified": "the project is verified by SBCA\nthe project is leased by LDA",
    },
    {
        "name": "Times residency",
        "location": "the location is https://maps.app.goo.gl/hheUFtUKVdoBivGx6",
        "price": "The price is 4,200,000 for 1 bed lounge\n"
                 "The price is 6,200,000 for 2 bed lounge\n"
                 "The price is 7,500,000 for 2 bed dd",
        "verified": "the project is leased by KDA",
    },
]

# ---------- MENUS ----------

def main_menu_text():
    lines = [f"[{i + 1}] {p['name']}" for i, p in enumerate(PROJECTS)]
    lines.append(f"[{len(PROJECTS) + 1}] Website")
    lines.append("[0] Sales Representative Se Baat Karein.")
    return MAIN_MENU_INTRO + "\n\n" + "\n".join(lines)


def project_menu_text():
    return "[1] Location\n[2] Price\n[3] Verified By\n[0] Main Menu"

# ---------- SESSIONS (in memory) ----------

sessions = {}  # phone -> {"state": "main"|"project", "project": int|None, "last_seen": float}
SESSION_TIMEOUT = 24 * 60 * 60  # after 24h of silence, welcome again
seen_messages = set()           # avoid handling WhatsApp webhook retries twice

# ---------- SENDING ----------

def send(to, body):
    r = requests.post(
        f"https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages",
        headers={"Authorization": f"Bearer {TOKEN}"},
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body, "preview_url": True},
        },
        timeout=15,
    )
    if not r.ok:
        print("Send failed:", r.status_code, r.text)

# ---------- BOT LOGIC ----------

def handle_message(sender, text):
    text = text.strip()
    session = sessions.get(sender)

    # First message (or returning after a long break)
    if session is None or time.time() - session["last_seen"] > SESSION_TIMEOUT:
        sessions[sender] = {"state": "main", "project": None, "last_seen": time.time()}
        send(sender, WELCOME)
        send(sender, main_menu_text())
        return
    session["last_seen"] = time.time()

    # ----- Main menu -----
    if session["state"] == "main":
        website_key = str(len(PROJECTS) + 1)

        if text == "0":
            send(sender, SALES_NUMBER)
        elif text == website_key:
            send(sender, WEBSITE)
        elif text.isdigit() and 1 <= int(text) <= len(PROJECTS):
            session["state"] = "project"
            session["project"] = int(text) - 1
            send(sender, project_menu_text())
        else:
            send(sender, main_menu_text())  # invalid input -> show menu again
        return

    # ----- Project menu -----
    project = PROJECTS[session["project"]]

    if text == "1":
        send(sender, project["location"])
        send(sender, project_menu_text())
    elif text == "2":
        send(sender, project["price"])
        send(sender, project_menu_text())
    elif text == "3":
        send(sender, project["verified"])
        send(sender, project_menu_text())
    elif text == "0":
        session["state"] = "main"
        session["project"] = None
        send(sender, main_menu_text())
    else:
        send(sender, project_menu_text())  # invalid input -> show menu again

# ---------- WEBHOOK ----------

@app.get("/webhook")
def verify():
    if (request.args.get("hub.mode") == "subscribe"
            and request.args.get("hub.verify_token") == VERIFY_TOKEN):
        return request.args.get("hub.challenge"), 200
    return "", 403


@app.post("/webhook")
def incoming():
    try:
        data = request.get_json(silent=True) or {}
        value = data["entry"][0]["changes"][0]["value"]
        msg = value.get("messages", [None])[0]
        if msg and msg["id"] not in seen_messages:
            seen_messages.add(msg["id"])
            if len(seen_messages) > 1000:
                seen_messages.clear()
            # Non-text messages (images, voice notes) are treated as free text -> menu
            text = msg["text"]["body"] if msg["type"] == "text" else ""
            handle_message(msg["from"], text)
    except (KeyError, IndexError) as e:
        print("Ignored payload:", e)
    return "", 200


if __name__ == "__main__":
    print(f"Bot running on port {PORT}")
    app.run(host="0.0.0.0", port=PORT)
