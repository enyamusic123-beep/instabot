const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { loadConfig } = require("./config");
const { QueueStore } = require("./queue-store");
const { generateImage } = require("./providers/openai-image");
const instagram = require("./instagram");

const config = loadConfig();
const store = new QueueStore(config.dataFile);
const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((resolve, reject) => { let data = ""; req.on("data", (chunk) => { data += chunk; if (data.length > 100000) reject(new Error("Request body too large")); }); req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error("Request body must be valid JSON")); } }); req.on("error", reject); });
const waking = (date) => {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: config.wakingTimezone, hour: "2-digit", hour12: false }).format(date));
  return hour >= config.wakingStart && hour < config.wakingEnd;
};
const retryable = (error) => /Graph API failed \((429|5\d\d)\)/.test(error.message);

async function wakeScheduler() {
  const now = Date.now();
  const candidate = store.all().find((item) => item.status === "queued" && new Date(item.scheduledFor).getTime() <= now && waking(new Date()) && !store.all().some((other) => other.status === "published" && now - new Date(other.publishedAt).getTime() < 60 * 60 * 1000));
  if (!candidate) return;
  try { const result = await instagram.publish(candidate, config); await store.update(candidate.id, { status: "published", publishedAt: new Date().toISOString(), instagramMediaId: result.id }); }
  catch (error) {
    const attempts = candidate.attempts + 1;
    await store.update(candidate.id, { attempts, status: retryable(error) && attempts <= config.retryLimit ? "queued" : "failed", lastError: error.message });
  }
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/queue") return json(res, 200, { items: store.all() });
    if (req.method === "GET" && url.pathname === "/api/instagram/status") return json(res, 200, await instagram.status(config));
    if (req.method === "POST" && url.pathname === "/api/queue") {
      const key = req.headers["idempotency-key"];
      if (!key || key.length > 200) return json(res, 400, { error: "Idempotency-Key header is required" });
      const existing = store.findByIdempotency(key); if (existing) return json(res, 200, { item: existing, items: store.all(), idempotent: true });
      const body = await readBody(req);
      if (!body.prompt || !body.caption || !body.scheduledFor) return json(res, 400, { error: "prompt, caption, and scheduledFor are required" });
      const scheduled = new Date(body.scheduledFor); if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now()) return json(res, 400, { error: "scheduledFor must be a valid future timestamp" });
      const imageUrl = await generateImage(body.prompt, config);
      const item = await store.add({ idempotencyKey: key, prompt: body.prompt, caption: body.caption, scheduledFor: scheduled.toISOString(), imageUrl });
      return json(res, 201, { item, items: store.all() });
    }
    if (req.method === "POST" && /^\/api\/instagram\/publish\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split("/").pop(); const item = store.items.find((entry) => entry.id === id);
      if (!item) return json(res, 404, { error: "Queue item not found" });
      if (item.status === "published") return json(res, 200, { item, idempotent: true });
      const lastPublished = store.all().filter((entry) => entry.status === "published").sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];
      if (!waking(new Date()) || (lastPublished && Date.now() - new Date(lastPublished.publishedAt).getTime() < 60 * 60 * 1000)) {
        return json(res, 409, { error: "Publishing is limited to one post per hour during waking hours" });
      }
      const result = await instagram.publish(item, config); await store.update(id, { status: "published", publishedAt: new Date().toISOString(), instagramMediaId: result.id }); return json(res, 200, { item });
    }
    if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
      const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const file = path.resolve(__dirname, relative);
      if (file.startsWith(path.resolve(__dirname) + path.sep)) {
        const content = await fs.readFile(file);
        const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
        res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" }); return res.end(content);
      }
    }
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    if (error.code === "ENOENT") return json(res, 404, { error: "Not found" });
    return json(res, /required|valid|configured|body/.test(error.message) ? 400 : 502, { error: error.message });
  }
}

store.init().then(() => {
  http.createServer(handler).listen(config.port, () => console.log(`Signal API listening on ${config.port}`));
  setInterval(wakeScheduler, 60 * 1000).unref();
}).catch((error) => { console.error(error.message); process.exit(1); });
