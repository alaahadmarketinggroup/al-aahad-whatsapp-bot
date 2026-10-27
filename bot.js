/*
  Al-Aahad Marketing Group - WhatsApp bot (single file, no npm packages)

  Requires: Node.js 18 or newer
  Run:      node bot.js
  Webhook:  https://YOUR-SERVER/webhook  (set in Meta dashboard, subscribe to "messages")
*/

const http = require("http");

// ---------- SETTINGS (paste your values here, or set them as environment variables) ----------

const TOKEN = process.env.WHATSAPP_TOKEN || "PASTE_YOUR_ACCESS_TOKEN_HERE";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "PASTE_YOUR_PHONE_NUMBER_ID_HERE";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "PASTE_ANY_SECRET_WORD_HERE";
const PORT = process.env.PORT || 3000;

// ---------- CONTENT (edit texts here only) ----------

const WELCOME =
  "Assalam-o-Alaikum!\n" +
  "Al-Aahad Marketing Group se rabta karne ka shukriya!\n" +
  "Hum aapko aapke budget aur zarooriyat ke mutabiq behtareen property dhoondhne mein madad karte hain.";

const MAIN_MENU_INTRO =
  "Mazeed Maloomat Hasil Karne Ke Liye Neeche Diye Gaye Options Mein Se Kisi Ek Ka Number Reply Karein.";

const WEBSITE = "https://alaahadmarketinggroup.com/";
const SALES_NUMBER = "03022285787";

// To add a new project, add one object here. Menu numbers update automatically.
const PROJECTS = [
  {
    name: "Bolan Hills",
    location: "the location is https://maps.app.goo.gl/4trB3X3377pbHcUX8",
    price:
       "5 Year Plan (60 months)\n\n" +
  "The Price is 3,500,000 for 80 square yds\n" +
  "Monthly Installments 20,000\n\n" +
  "The Price is 4,500,000 for 120 square yds\n" +
  "Monthly Installments 30,000",
    Verified: "The project is verified by SBCA\nthe project is leased by LDA",
  },
  {
    name: "Titanium",
    location: "the location is https://maps.app.goo.gl/S3UHn7Xh8MVQ3st86",
    price:
      "The price is 4,495,000 for 80 square yds\n" +
      "The price is 5,795,000 for 120 square yds",
    verified: "the project is verified by SBCA\nthe project is leased by LDA",
  },
  {
    name: "Times residency",
    location: "the location is https://maps.app.goo.gl/hheUFtUKVdoBivGx6",
    price:
      "The price is 4,200,000 for 1 bed lounge\n" +
      "The price is 6,200,000 for 2 bed lounge\n" +
      "The price is 7,500,000 for 2 bed dd",
    verified: "the project is leased by KDA",
  },
];

// ---------- MENUS ----------

function mainMenuText() {
  const lines = PROJECTS.map((p, i) => `[${i + 1}] ${p.name}`);
  lines.push(`[${PROJECTS.length + 1}] Website`);
  lines.push("[0] Sales Representative Se Baat Karein.");
  return `${MAIN_MENU_INTRO}\n\n${lines.join("\n")}`;
}

function projectMenuText() {
  return "[1] Location\n[2] Price\n[3] Verified By\n[0] Main Menu";
}

// ---------- SESSIONS (in memory) ----------

const sessions = new Map(); // phone -> { state: "main" | "project", project, lastSeen }
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // after 24h of silence, welcome again
const seenMessages = new Set(); // avoid handling WhatsApp webhook retries twice

// ---------- SENDING ----------

async function send(to, body) {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body, preview_url: true },
      }),
    }
  );
  if (!res.ok) console.error("Send failed:", res.status, await res.text());
}

// ---------- BOT LOGIC ----------

async function handleMessage(from, text) {
  const input = text.trim();
  const session = sessions.get(from);

  // First message (or returning after a long break)
  if (!session || Date.now() - session.lastSeen > SESSION_TIMEOUT) {
    sessions.set(from, { state: "main", project: null, lastSeen: Date.now() });
    await send(from, WELCOME);
    await send(from, mainMenuText());
    return;
  }
  session.lastSeen = Date.now();

  // ----- Main menu -----
  if (session.state === "main") {
    const websiteKey = String(PROJECTS.length + 1);

    if (input === "0") {
      await send(from, SALES_NUMBER);
    } else if (input === websiteKey) {
      await send(from, WEBSITE);
    } else if (/^\d+$/.test(input) && PROJECTS[Number(input) - 1]) {
      session.state = "project";
      session.project = Number(input) - 1;
      await send(from, projectMenuText());
    } else {
      await send(from, mainMenuText()); // invalid input -> show menu again
    }
    return;
  }

  // ----- Project menu -----
  const project = PROJECTS[session.project];

  if (input === "1") {
    await send(from, project.location);
    await send(from, projectMenuText());
  } else if (input === "2") {
    await send(from, project.price);
    await send(from, projectMenuText());
  } else if (input === "3") {
    await send(from, project.verified);
    await send(from, projectMenuText());
  } else if (input === "0") {
    session.state = "main";
    session.project = null;
    await send(from, mainMenuText());
  } else {
    await send(from, projectMenuText()); // invalid input -> show menu again
  }
}

// ---------- WEBHOOK SERVER ----------

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname !== "/webhook") {
    res.writeHead(404).end();
    return;
  }

  // Meta webhook verification
  if (req.method === "GET") {
    if (
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === VERIFY_TOKEN
    ) {
      res.writeHead(200).end(url.searchParams.get("hub.challenge"));
    } else {
      res.writeHead(403).end();
    }
    return;
  }

  // Incoming messages
  if (req.method === "POST") {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      res.writeHead(200).end(); // reply to Meta immediately
      try {
        const msg = JSON.parse(raw)?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!msg || seenMessages.has(msg.id)) return;
        seenMessages.add(msg.id);
        if (seenMessages.size > 1000) seenMessages.clear();

        // Non-text messages (images, voice notes) are treated as free text -> menu
        const text = msg.type === "text" ? msg.text.body : "";
        handleMessage(msg.from, text).catch((e) => console.error(e));
      } catch (e) {
        console.error("Bad payload:", e);
      }
    });
    return;
  }

  res.writeHead(405).end();
});

server.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
