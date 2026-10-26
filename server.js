// Al-Aahad Marketing Group - WhatsApp Bot Server (NO n8n needed)
// Bot number: +92 311 1122953
// Phone Number ID: 1316836131522598
// Human/agent contact in replies: +92 302 2285787
//
// Run with Node.js 18+ only. No npm packages needed - uses built-in http + fetch.
//   1. Copy .env.example to .env and fill it ON THE SERVER ONLY (never in chat):
//        WHATSAPP_TOKEN=your permanent access token from Meta
//        VERIFY_TOKEN=a secret you invent, e.g. alaahad-verify-123
//        PHONE_NUMBER_ID=1316836131522598
//        PORT=3000
//   2. Start:  node server.js
//   3. Your public URL will be, for example: https://your-server.onrender.com
//      Webhook URL for Meta = https://your-server.onrender.com/webhook
//   4. In Meta Developers > WB App > WhatsApp > API Setup > Configure Webhooks:
//        Callback URL = https://your-server.onrender.com/webhook
//        Verify token = the same VERIFY_TOKEN from .env
//        Click Verify and save, then subscribe to "messages".
//   5. Test: from another phone, send "Price" to +92 311 1122953.

const http = require("http");
const { URL } = require("url");

function loadEnv() {
  // Tiny .env loader, no dependency. Real deployments should use the
  // platform's own Environment Variables panel instead of a .env file.
  try {
    const fs = require("fs");
    const path = require("path");
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z_]+)=(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
      }
    }
  } catch {}
}
loadEnv();

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.WHATSAPP_TOKEN || "";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "1316836131522598";
const GRAPH_VERSION = "v21.0";

const MAPS_LINK = "https://www.google.com/maps/place/North+Town+Residency+Phase+II/@25.0212389,67.0195007,17z/data=!3m1!4b1!4m6!3m5!1s0x3eb3410036e3948b:0x33ffc15d5776a33c!8m2!3d25.0212389!4d67.0220756!16s%2Fg%2F11nhz1gxy_?entry=ttu";

const WELCOME = `Assalam-o-Alaikum! Al-Aahad Marketing Group mein khush amdeed.\nBolan Hills ke bare mein maloomat ke liye number ya lafz likhein:\n\n1 - Location\n2 - Price\n3 - Payment Schedule\n4 - Site Videos\n5 - Verified By\n6 - Total Distance\n0 - Agent se baat karein\n\nAgent: 0302-2285787`;

function pickReply(text) {
  const t = (text || "").toLowerCase();
  if (["hi", "salam", "assalam", "hello", "aoa"].some((w) => t.includes(w)) || t === "menu") return WELCOME;
  if (t === "1" || t.includes("location") || t.includes("kahan") || t.includes("map") || t.includes("gadap")) return `Bolan Hills - North Town Residency Phase II\nLocation: Gadap Road, Near Hamdard Factory, Karachi\nGoogle Maps: ${MAPS_LINK}`;
  if (t === "2" || t.includes("price") || t.includes("rate") || t.includes("qeemat") || t.includes("booking")) return `Bolan Hills - Residential Plots\n80 Sq. Yds: Total Rs 3,500,000 | Booking Rs 300,000 | Monthly Rs 20,000\n120 Sq. Yds: Total Rs 4,500,000 | Booking Rs 400,000 | Monthly Rs 30,000\n5 Year Payment Plan available. Limited plots available.`;
  if (t === "3" || t.includes("payment") || t.includes("installment") || t.includes("qist") || t.includes("schedule")) return `80 Sq. Yds - Total 3,500,000:\nBooking 300,000 | Allocation 250,000 | Confirmation 250,000 | Start of Work 250,000 | Monthly 20,000 x 48 = 960,000 | Half Yearly 150,000 x 8 = 1,200,000 | Possession 290,000\n\n120 Sq. Yds - Total 4,500,000:\nBooking 400,000 | Allocation 400,000 | Confirmation 400,000 | Start of Work 400,000 | Monthly 30,000 x 48 = 1,440,000 | Half Yearly 140,000 x 8 = 1,120,000 | Possession 340,000\n\nExtra: Corner 10%, Road Facing 10%, West Open 5%, Park Facing 5%. Full cash payment par 10% discount.`;
  if (t === "4" || t.includes("video") || t.includes("site")) return `Bolan Hills ki latest site video - 80 aur 120 Sq. Yds residential plots, park, masjid, hospital aur gated community ke saath.`;
  if (t === "5" || t.includes("verified") || t.includes("noc") || t.includes("approved") || t.includes("sbca") || t.includes("lda")) return `Bolan Hills SBCA se approved hai aur LDA se leased hai.\nNOC ki tasdeeq ke liye SBCA ki official website par check karein.\nMazeed tasdeeq ke liye: 0302-2285787`;
  if (t === "6" || t.includes("distance") || t.includes("fasla") || t.includes("km") || t.includes("chowrangi")) return `4K Chowrangi se Bolan Hills site tak:\nTotal Distance: 6 km\nDrive Time: taqreeban 15 minutes`;
  if (t === "0" || t.includes("agent")) return `Shukriya! Hamara agent jald aap se rabta karega. Aap direct 0302-2285787 par bhi rabta kar sakte hain.`;
  return `Maazrat, main aapki baat samajh nahi saka. Barah-e-karam 1-6 mein se koi option chunein, ya apna sawal tafseel se likhein. Agent se baat ke liye 0 dabayein ya 0302-2285787 par rabta karein.`;
}

async function sendText(to, body) {
  if (!TOKEN) { console.error("WHATSAPP_TOKEN is not set"); return; }
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
  if (!res.ok) console.error("Send failed:", await res.text());
  else console.log("Replied to", to);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("Al-Aahad WhatsApp Bot is running. Webhook: /webhook\n");
  }
  if (url.pathname !== "/webhook") {
    res.writeHead(404); return res.end();
  }
  if (req.method === "GET") {
    // Meta verification
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === VERIFY_TOKEN) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(challenge);
    }
    res.writeHead(403); return res.end("Verification token mismatch");
  }
  if (req.method === "POST") {
    const body = await readBody(req);
    res.writeHead(200); res.end("OK"); // acknowledge fast, reply after
    try {
      console.log("Webhook POST received:", JSON.stringify(body).slice(0, 1000));
      const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (msg) console.log("Incoming message from", msg.from, "type", msg.type, "text", msg.text?.body);
      else console.log("Webhook POST had no text message in payload");
      if (msg && msg.type === "text") {
        await sendText(msg.from, pickReply(msg.text?.body || ""));
      }
    } catch (e) { console.error(e); }
    return;
  }
  res.writeHead(405); res.end();
});

server.listen(PORT, () => {
  console.log(`Al-Aahad WhatsApp Bot listening on port ${PORT}`);
  console.log(`Webhook path: /webhook  |  Phone Number ID: ${PHONE_NUMBER_ID}`);
  if (!TOKEN) console.log("WARNING: WHATSAPP_TOKEN is not set yet.");
  if (!VERIFY_TOKEN) console.log("WARNING: VERIFY_TOKEN is not set yet.");
});


// Al-Aahad Marketing Group - WhatsApp Bot (number-menu flow)
// Node.js 18+ only. No npm packages.
// All texts and projects live in projects.json. Edit that file, no restart needed.

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// ---------- env ----------
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z_]+)=(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
      }
    }
  } catch {}
})();

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.WHATSAPP_TOKEN || "";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "";
const APP_SECRET = process.env.APP_SECRET || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";
const GRAPH_VERSION = "v21.0";

// Set true to show the current menu again after every answer
const RESEND_MENU_AFTER_ANSWER = false;

// ---------- config (hot reloads when projects.json changes) ----------
const CONFIG_PATH = path.join(__dirname, "projects.json");
let CONFIG = { projects: [], mainExtras: [] };

function loadConfig() {
  try {
    CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    console.log(`Config loaded: ${CONFIG.projects.length} project(s)`);
  } catch (e) {
    console.error("Could not load projects.json, keeping previous config:", e.message);
  }
}
loadConfig();
fs.watchFile(CONFIG_PATH, { interval: 2000 }, loadConfig);

// ---------- menus (built from config) ----------
function mainMenuText() {
  const lines = [];
  let n = 1;
  for (const p of CONFIG.projects) lines.push(`[${n++}]${p.name}`);
  for (const e of CONFIG.mainExtras || []) lines.push(`[${n++}]${e.label}`);
  lines.push(`[0]${CONFIG.salesRepLabel}`);
  return `${CONFIG.mainIntro}\n\n${lines.join("\n")}`;
}

function projectMenuText(p) {
  const lines = p.menu.map((m, i) => `[${i + 1}]${m.label}`);
  lines.push("[0]Main Menu");
  return lines.join("\n");
}

// ---------- sessions: { state: "main" | project id, ts } ----------
const sessions = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000; // after 24h of silence, they get the welcome again
setInterval(() => {
  for (const [k, s] of sessions) if (Date.now() - s.ts > SESSION_TTL) sessions.delete(k);
}, 60 * 60 * 1000).unref();

// ---------- WhatsApp API ----------
async function sendText(to, body) {
  if (!TOKEN || !PHONE_NUMBER_ID) { console.error("WHATSAPP_TOKEN or PHONE_NUMBER_ID is not set"); return; }
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: true } }),
  });
  if (!res.ok) console.error("Send failed:", await res.text());
}

// ---------- lead capture + agent alert ----------
async function handoffToAgent(from) {
  const line = JSON.stringify({ ts: new Date().toISOString(), phone: from });
  try { fs.appendFileSync(path.join(__dirname, "leads.jsonl"), line + "\n"); } catch (e) { console.error(e.message); }
  // NOTE: the bot can only message the agent freely if the agent messaged the bot in the last 24h.
  // Otherwise this needs an approved template message.
  if (CONFIG.agentNumber) await sendText(CONFIG.agentNumber, `New lead: +${from} wants a sales representative.`);
  await sendText(from, CONFIG.salesRepReply);
}

// ---------- conversation ----------
async function showMain(from, s) {
  s.state = "main";
  await sendText(from, mainMenuText());
}

async function handleMessage(msg) {
  const from = msg.from;
  let s = sessions.get(from);

  // first message (or back after 24h): welcome + main menu, whatever they typed
  if (!s || Date.now() - s.ts > SESSION_TTL) {
    s = { state: "main", ts: Date.now() };
    sessions.set(from, s);
    await sendText(from, CONFIG.welcome);
    await sendText(from, mainMenuText());
    return;
  }
  s.ts = Date.now();

  // only a bare number counts: "1", "[1]", "1."
  const raw = msg.type === "text" ? (msg.text?.body || "").trim() : "";
  const m = raw.match(/^\[?\s*(\d{1,2})\s*\]?\.?$/);
  const n = m ? parseInt(m[1], 10) : null;

  if (s.state === "main") {
    const P = CONFIG.projects.length;
    const extras = CONFIG.mainExtras || [];
    if (n === 0) return handoffToAgent(from);
    if (n >= 1 && n <= P) {
      const p = CONFIG.projects[n - 1];
      s.state = p.id;
      return sendText(from, projectMenuText(p));
    }
    if (n > P && n <= P + extras.length) {
      await sendText(from, extras[n - P - 1].reply);
      if (RESEND_MENU_AFTER_ANSWER) await sendText(from, mainMenuText());
      return;
    }
    await sendText(from, CONFIG.invalidText);
    return sendText(from, mainMenuText());
  }

  // inside a project menu
  const p = CONFIG.projects.find((x) => x.id === s.state);
  if (!p) return showMain(from, s); // project was removed from the file
  if (n === 0) return showMain(from, s);
  if (n >= 1 && n <= p.menu.length) {
    await sendText(from, p.menu[n - 1].reply);
    if (RESEND_MENU_AFTER_ANSWER) await sendText(from, projectMenuText(p));
    return;
  }
  await sendText(from, CONFIG.invalidText);
  return sendText(from, projectMenuText(p));
}

// ---------- HTTP ----------
function readRaw(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0, done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    req.on("data", (c) => {
      size += c.length;
      if (size > 1e6) { finish(null); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => finish(Buffer.concat(chunks)));
    req.on("error", () => finish(null));
    req.on("close", () => finish(null));
  });
}

function validSignature(raw, header) {
  if (!APP_SECRET) return true; // enforced once APP_SECRET is set
  if (!header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(raw).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const seen = new Set(); // ignore retried webhooks
function alreadySeen(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 5000) seen.delete(seen.values().next().value);
  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("WhatsApp Bot is running. Webhook: /webhook\n");
  }
  if (url.pathname !== "/webhook") { res.writeHead(404); return res.end(); }

  if (req.method === "GET") {
    const ok =
      url.searchParams.get("hub.mode") === "subscribe" &&
      VERIFY_TOKEN &&
      url.searchParams.get("hub.verify_token") === VERIFY_TOKEN;
    if (ok) { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end(url.searchParams.get("hub.challenge")); }
    res.writeHead(403); return res.end("Verification token mismatch");
  }

  if (req.method === "POST") {
    const raw = await readRaw(req);
    if (!raw) { res.writeHead(413); return res.end(); }
    if (!validSignature(raw, req.headers["x-hub-signature-256"])) { res.writeHead(401); return res.end(); }
    res.writeHead(200); res.end("OK");

    let body;
    try { body = JSON.parse(raw.toString("utf8") || "{}"); } catch { return; }

    for (const entry of body.entry || [])
      for (const change of entry.changes || [])
        for (const msg of change.value?.messages || []) {
          if (alreadySeen(msg.id)) continue;
          try { await handleMessage(msg); } catch (e) { console.error("Handler error:", e); }
        }
    return;
  }

  res.writeHead(405); res.end();
});

server.listen(PORT, () => {
  console.log(`WhatsApp bot listening on port ${PORT}`);
  if (!TOKEN) console.log("WARNING: WHATSAPP_TOKEN is not set");
  if (!VERIFY_TOKEN) console.log("WARNING: VERIFY_TOKEN is not set");
  if (!PHONE_NUMBER_ID) console.log("WARNING: PHONE_NUMBER_ID is not set");
  if (!APP_SECRET) console.log("WARNING: APP_SECRET is not set, webhook signatures are NOT verified");
});
