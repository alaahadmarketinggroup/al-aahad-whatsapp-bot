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
  "Mazeed Maloomat Hasil Karne Ke Liye Neeche Diye Gaye Options Mein Se Kisi Ek Number Sa Reply Karein.\n\nAur sales team sa baat karna ka liya 0302-2285787 par rabta karain.  ";

const WEBSITE = "https://alaahadmarketinggroup.com/";
const SALES_NUMBER = "03022285787";

// Must stay BELOW the SALES_NUMBER line, because it uses it
const UNKNOWN_MSG =
  "Maaf kijiye, hum aapka message samajh nahi sake.\n" +
  "Barae meharbani neeche diye gaye menu mein se koi number select karein, " +
  `ya hum se is number par rabta karein: ${SALES_NUMBER}`;

// Line added at the end of the North Town Phase 2 prices
const DISCOUNT_LINE =
  "Contact our Sales Representative for exclusive discount: 0302-2285787";

// Builds a price message:  title, then one line per plot size, then the discount line
function planText(title, lines) {
  return `${title}\n\n${lines.join("\n")}\n\n${DISCOUNT_LINE}`;
}

// ---------- PROJECTS ----------
//
// Menu numbers 1 to 7 are given to the projects below, in order (first = [1], second = [2] ...).
// [8] is Ready-to-Move and [9] is Website, so keep this list to 7 projects at most.
//
// There are two kinds of entries:
//  A) a normal project  -> has location, price, verified
//  B) a group of projects (like North Town Phase 2) -> has ONE shared location and verified,
//     and a "projects" list where each project only has its own name and price.
//
// To add a normal project, paste another { name, location, price, verified } block.
// To add a project inside North Town Phase 2, paste another { name, price } block in its list.

const PROJECTS = [
  {
    name: "North Town Phase 2",
    // Shared by ALL projects in this group. Replace the two texts below when you have them.
    location:
      "Location details coming soon. Please contact our sales team: 0302-2285787",
    verified:
      "The project is verified by SBCA\nthe project is leased by LDA\nPlease contact our sales team for more details 0302-2285787",
    projects: [
      {
        name: "Bolan",
        price: planText("Bolan - 5 Year Payment Plan", [
          "80 sq yds: 3,500,000",
          "120 sq yds: 4,500,000",
        ]),
      },
      {
        name: "Bolan Hills",
        price: planText("Bolan Hills - 5 Year Payment Plan", [
          "80 sq yds: 3,500,000",
          "120 sq yds: 4,500,000",
        ]),
      },
      {
        name: "Bab-E-Aman Residency",
        price: planText("Bab-E-Aman Residency - 5 Year Payment Plan", [
          "80 sq yds: 3,500,000",
          "120 sq yds: 4,500,000",
        ]),
      },
      {
        name: "Executive Bolan Corner",
        price: planText("Executive Bolan Corner - 5 Year Payment Plan", [
          "100 sq yds: 3,500,000",
        ]),
      },
    ],
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
    name: "Al Ghafoor Sky Rise",
    location: "the location is https://maps.app.goo.gl/1BY53ScvHYLxLzP8A",
    price:
      "The price is 5,000,000 for 80 square yds\n" +
      "Monthly Installments 25,000",
    verified: "the project is verified by SBCA",
  },
];

// Fixed menu numbers for the two special options
const READY_KEY = 8;
const WEBSITE_KEY = 9;
const MAX_PROJECTS = 7;

if (PROJECTS.length > MAX_PROJECTS) {
  console.error(`WARNING: only ${MAX_PROJECTS} projects fit in the menu (1-7). Extra projects are ignored.`);
}

function projectKey(i) {
  return i + 1;
}
function projectIndexFromKey(n) {
  if (n >= 1 && n <= MAX_PROJECTS) return n - 1;
  return -1;
}

// Ready-to-Move Projects (menu option [8]). The customer sees a numbered list,
// picks a number, and gets that project's location.
// To add one, paste another { name, location } line. Numbers update automatically.
const READY_PROJECTS = [
  { name: "Times Residency", location: "https://maps.app.goo.gl/eErUbaND2B6XHqn58" },
  { name: "North Town Residency Phase 1", location: "https://maps.app.goo.gl/gW9ERYpeG53p9ukj9" },
  { name: "Saima Arabian Villas", location: "https://maps.app.goo.gl/qhecbiK1WcLBsuVC8" },
  { name: "Naya Nazimabad", location: "https://maps.app.goo.gl/vwcgHWESvazHmNHp6" },
];

// Shown at the bottom of the Ready-to-Move list
const READY_CONTACT =
  "Ready-to-Move Projects ki maloomat ke liye humari sales team se 0302-2285787 par rabta karein.";

// ---------- MENUS ----------

function mainMenuText() {
  const items = PROJECTS.slice(0, MAX_PROJECTS).map((p, i) => [projectKey(i), p.name]);
  items.push([READY_KEY, "Ready-to-Move Projects"], [WEBSITE_KEY, "Website"]);
  items.sort((a, b) => a[0] - b[0]);
  const lines = items.map(([k, label]) => `[${k}] ${label}`);
  lines.push("[0] Sales Representative Se Baat Karein.");
  return `${MAIN_MENU_INTRO}\n\n${lines.join("\n")}`;
}

// List of projects inside a group (for example North Town Phase 2)
function groupMenuText(group) {
  const lines = group.projects.map((p, i) => `[${i + 1}] ${p.name}`);
  lines.push("[0] Main Menu");
  return lines.join("\n");
}

// Ready-to-Move list page
function readyMenuText() {
  const lines = READY_PROJECTS.map((p, i) => `[${i + 1}] ${p.name}`);
  lines.push("[0] Main Menu");
  return `Ready-to-Move Projects:\n\n${lines.join("\n")}\n\n${READY_CONTACT}`;
}

// Location / Price / Verified By menu. For a project inside a group, [0] goes back to the list.
function projectMenuText(insideGroup) {
  return `[1] Location\n[2] Price\n[3] Verified By\n[0] ${insideGroup ? "Back" : "Main Menu"}`;
}

// ---------- SESSIONS (in memory) ----------

// phone -> { state: "main" | "group" | "project" | "subproject" | "ready", project, sub, lastSeen }
const sessions = new Map();
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

// Writes a searchable lead line to the Render Logs. In Render > Logs, type LEAD in the search box.
function logLead(reason, name, from) {
  console.log(`LEAD | ${reason} | ${name} (+${from}) | https://wa.me/${from}`);
}

async function handleMessage(from, text, name) {
  const input = text.trim();
  const session = sessions.get(from);

  // First message (or returning after a long break)
  if (!session || Date.now() - session.lastSeen > SESSION_TIMEOUT) {
    sessions.set(from, { state: "main", project: null, sub: null, lastSeen: Date.now() });
    await send(from, WELCOME);
    await send(from, mainMenuText());
    if (from !== OWNER_NUMBER) {
      logLead("NEW CHAT", name, from);
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
        logLead("WANTS SALES REP", name, from);
        await notifyOwner(`Wants a sales representative: ${name} (+${from})\nhttps://wa.me/${from}`);
      }
    } else if (key === WEBSITE_KEY) {
      await send(from, WEBSITE);
    } else if (key === READY_KEY) {
      logLead("VIEWED READY-TO-MOVE", name, from);
      session.state = "ready";
      await send(from, readyMenuText());
    } else if (PROJECTS[projectIndex]) {
      const chosen = PROJECTS[projectIndex];
      session.project = projectIndex;
      session.sub = null;
      if (chosen.projects) {
        session.state = "group";
        await send(from, groupMenuText(chosen));
      } else {
        session.state = "project";
        await send(from, projectMenuText(false));
      }
    } else {
      await send(from, UNKNOWN_MSG);
      await send(from, mainMenuText());
    }
    return;
  }

  // ----- Ready-to-Move page -----
  if (session.state === "ready") {
    const n = /^\d+$/.test(input) ? Number(input) : -1;

    if (input === "0") {
      session.state = "main";
      await send(from, mainMenuText());
    } else if (n >= 1 && READY_PROJECTS[n - 1]) {
      const p = READY_PROJECTS[n - 1];
      logLead(`VIEWED LOCATION - Ready-to-Move / ${p.name}`, name, from);
      await send(from, `${p.name}\nthe location is ${p.location}`);
      await send(from, readyMenuText());
    } else {
      await send(from, UNKNOWN_MSG);
      await send(from, readyMenuText());
    }
    return;
  }

  // ----- List of projects inside a group (North Town Phase 2) -----
  if (session.state === "group") {
    const group = PROJECTS[session.project];
    const n = /^\d+$/.test(input) ? Number(input) : -1;

    if (input === "0") {
      session.state = "main";
      session.project = null;
      await send(from, mainMenuText());
    } else if (n >= 1 && group.projects[n - 1]) {
      session.sub = n - 1;
      session.state = "subproject";
      await send(from, projectMenuText(true));
    } else {
      await send(from, UNKNOWN_MSG);
      await send(from, groupMenuText(group));
    }
    return;
  }

  // ----- Location / Price / Verified By (normal project or project inside a group) -----
  const inGroup = session.state === "subproject";
  const parent = PROJECTS[session.project];
  const item = inGroup ? parent.projects[session.sub] : parent;
  const location = inGroup ? parent.location : item.location;
  const verified = inGroup ? parent.verified : item.verified;
  const logName = inGroup ? `${parent.name} / ${item.name}` : item.name;

  if (input === "1") {
    await send(from, location);
    await send(from, projectMenuText(inGroup));
  } else if (input === "2") {
    logLead(`VIEWED PRICE - ${logName}`, name, from);
    await send(from, item.price);
    await send(from, projectMenuText(inGroup));
  } else if (input === "3") {
    await send(from, verified);
    await send(from, projectMenuText(inGroup));
  } else if (input === "0") {
    if (inGroup) {
      session.state = "group";
      session.sub = null;
      await send(from, groupMenuText(parent));
    } else {
      session.state = "main";
      session.project = null;
      await send(from, mainMenuText());
    }
  } else {
    await send(from, UNKNOWN_MSG);
    await send(from, projectMenuText(inGroup));
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
