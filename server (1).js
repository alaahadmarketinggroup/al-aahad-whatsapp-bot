/*
  Al-Aahad Marketing Group - WhatsApp bot (single file, no npm packages)

  Requires: Node.js 18 or newer
  Run:      node server.js
  Webhook:  https://YOUR-SERVER/webhook  (set in Meta dashboard, subscribe to "messages")
*/

const http = require("http");

// ---------- SETTINGS (paste your values here, or set them as environment variables) ----------

const TOKEN = process.env.WHATSAPP_TOKEN || "PASTE_YOUR_ACCESS_TOKEN_HERE";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "PASTE_YOUR_PHONE_NUMBER_ID_HERE";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "PASTE_ANY_SECRET_WORD_HERE";
const PORT = process.env.PORT || 3000;
// Your PERSONAL number for alerts, country code first, no + or 0 (example: 923001234567).
// Set it in Render > Environment as OWNER_NUMBER. Must NOT be the bot number.
const OWNER_NUMBER = process.env.OWNER_NUMBER || "";

// ---------- CONTENT (edit texts here only) ----------

const WELCOME =
  "Assalam-o-Alaikum!\n" +
  "Al-Aahad Marketing Group se rabta karne ka shukriya!\n" +
  "Hum aapko aapke budget aur zarooriyat ke mutabiq behtareen property dhoondhne mein madad karte hain.";

const MAIN_MENU_INTRO =
  "Mazeed Maloomat Hasil Karne Ke Liye Neeche Diye Gaye Options Mein Se Kisi Ek Number Sa Reply Karein.\n\nAur salesmen sa baat karna ka liya 0302-2285787 par rabta karain.  ";

const WEBSITE = "https://alaahadmarketinggroup.com/";
const SALES_NUMBER = "03022285787";

// Must stay BELOW the SALES_NUMBER line, because it uses it
const UNKNOWN_MSG =
  "Maaf kijiye, hum aapka message samajh nahi sake.\n" +
  "Barae meharbani neeche diye gaye menu mein se koi number select karein, " +
  `ya hum se is number par rabta karein: ${SALES_NUMBER}`;

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
    verified: "The project is verified by SBCA\nthe project is leased by LDA",
  },
  {
    name: "Titanium",
    location: "the location is https://maps.app.goo.gl/S3UHn7Xh8MVQ3st86",
    price:
      "The price is 4,495,000 for 80 square yds\n" +
      "Monthly Installments 20,000\n\n" +
      "The price is 5,795,000 for 120 square yds\n" +
      "Monthly Installments 30,000",
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

// Fixed menu numbers. Normal projects use 1-3, then skip 4 and 5 (so a 4th project is [6]).
const WEBSITE_KEY = 4;
const READY_KEY = 5;

function projectKey(i) {
  return i < 3 ? i + 1 : i + 3;
}
function projectIndexFromKey(n) {
  if (n >= 1 && n <= 3) return n - 1;
  if (n >= 6) return n - 3;
  return -1;
}

// Message sent when a customer presses 5. Edit the text anytime.
// Use \n for a new line and \n\n for a blank line.
const READY_TEXT =
  "Ready-to-Move Projects ki maloomat ke liye humari sales team se " +
  "0302-2285787 par rabta karein.";

// ---------- MENUS ----------

function mainMenuText() {
  const items = PROJECTS.map((p, i) => [projectKey(i), p.name]);
  items.push([WEBSITE_KEY, "Website"], [READY_KEY, "Ready-to-Move Projects"]);
  items.sort((a, b) => a[0] - b[0]);
  const lines = items.map(([k, label]) => `[${k}] ${label}`);
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

// Sends an alert to the owner's personal number (needs OWNER_NUMBER to be set)
async function notifyOwner(text) {
  if (!OWNER_NUMBER) return;
  await send(OWNER_NUMBER, text);
}

// ---------- BOT LOGIC ----------

async function handleMessage(from, text, name) {
  const input = text.trim();
  const session = sessions.get(from);

  // First message (or returning after a long break)
  if (!session || Date.now() - session.lastSeen > SESSION_TIMEOUT) {
    sessions.set(from, { state: "main", project: null, lastSeen: Date.now() });
    await send(from, WELCOME);
    await send(from, mainMenuText());
    if (from !== OWNER_NUMBER) {
      await notifyOwner(`New chat: ${name} (+${from})\nhttps://wa.me/${from}`);
    }
    return;
  }
  session.lastSeen = Date.now();

  // ----- Main menu -----
  if (session.state === "main") {
    const key = /^\d+$/.test(input) ? Number(input) : -1;
    const projectIndex = projectIndexFromKey(key);

    if (input === "0") {
      await send(from, SALES_NUMBER);
      if (from !== OWNER_NUMBER) {
        await notifyOwner(`Wants a sales representative: ${name} (+${from})\nhttps://wa.me/${from}`);
      }
    } else if (key === WEBSITE_KEY) {
      await send(from, WEBSITE);
    } else if (key === READY_KEY) {
      await send(from, READY_TEXT);
    } else if (PROJECTS[projectIndex]) {
      session.state = "project";
      session.project = projectIndex;
      await send(from, projectMenuText());
    } else {
      await send(from, UNKNOWN_MSG);
      await send(from, mainMenuText());
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
    await send(from, UNKNOWN_MSG);
    await send(from, projectMenuText());
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
        const value = JSON.parse(raw)?.entry?.[0]?.changes?.[0]?.value;
        const msg = value?.messages?.[0];
        if (!msg || seenMessages.has(msg.id)) return;
        seenMessages.add(msg.id);
        if (seenMessages.size > 1000) seenMessages.clear();

        // Non-text messages (images, voice notes) are treated as free text -> menu
        const text = msg.type === "text" ? msg.text.body : "";
        const name = value?.contacts?.[0]?.profile?.name || "Unknown name";

        // Log who is contacting the bot (visible in Render > Logs)
        console.log(
          `[${new Date().toISOString()}] ${name} (+${msg.from}): ${text || "[" + msg.type + "]"}`
        );

        handleMessage(msg.from, text, name).catch((e) => console.error(e));
      } catch (e) {
        console.error("Bad payload:", e);
      }
    });
    return;
  }

  res.writeHead(405).end();
});

server.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
