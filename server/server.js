import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import Database from "better-sqlite3";

const app = express();

const PORT = Number(process.env.PORT || 3001);
const ORIGIN = process.env.ORIGIN || "*";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PRODUCTS = new Map(
  [
    ["kavabox", "combo", "KavaBox Черепаший Комбо", 499],
    ["party-box", "combo", "Party Box Мікеланджело", 459],
    ["tech-box", "combo", "Tech Box Донателло", 449],
    ["fire-box", "combo", "Fire Box Рафаель", 469],
    ["sensei-box", "combo", "Sensei Box Сплінтер", 479],
    ["kavabanga", "pizza", "Кавабанга Макс", 329],
    ["shuriken-salami", "pizza", "Сюрікен Салямі", 349],
    ["pancyr-syriv", "pizza", "Панцир Сирів", 299],
    ["mutant-pepperoni", "pizza", "Мутант Пепероні", 339],
    ["tin-grybiv", "pizza", "Тінь Грибів", 249],
    ["ninja-bbq", "pizza", "Ніндзя Барбекю", 349],
    ["katana-hit", "pizza", "Катана Хіт", 329],
    ["kanalizaciyna-klasyka", "pizza", "Каналізаційна Класика", 289],
    ["leonardo-special", "pizza", "Леонардо Особлива", 359],
    ["michelangelo-party", "pizza", "Мікеланджело Вечірка", 369],
    ["raphael-fire", "pizza", "Рафаель Вогонь", 369],
    ["zelena-syla", "pizza", "Зелена сила", 329],
    ["donatello-tech", "pizza", "Донателло Техно", 359],
    ["shreder-deluxe", "pizza", "Шредер Делюкс", 389],
    ["splinter-teriyaki", "pizza", "Сплінтер Теріякі", 379],
    ["cola", "drink", "Кола Кавабанга", 39],
    ["fanta", "drink", "Помаранчевий портал", 39],
    ["sprite", "drink", "Лаймовий ніндзя", 39],
    ["mojito", "drink", "Мохіто Майстер", 49],
    ["energy-drink", "drink", "Енерджі Драйв", 59],
    ["ice-shuriken", "drink", "Крижаний сюрикен", 45],
    ["dojo-orange", "drink", "Апельсин додзьо", 45],
    ["espresso-shuriken", "coffee", "Еспресо Сюрікен", 45],
    ["americano-dojo", "coffee", "Американо Додзьо", 55],
    ["latte-sensei", "coffee", "Лате Сенсей", 75],
    ["cappuccino-katana", "coffee", "Капучино Катана", 70],
    ["raf-kavabanga", "coffee", "Раф Кавабанга", 85],
    ["green-ninja-tea", "tea", "Зелений Ніндзя", 49],
    ["berry-splinter-tea", "tea", "Ягідний Сплінтер", 55],
    ["ginger-raphael-tea", "tea", "Імбирний Рафаель", 55],
  ].map(([id, type, title, price]) => [id, { id, type, title, price }])
);

const dbPath = path.resolve(process.cwd(), "server", "data.sqlite");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function nowIso() {
  return new Date().toISOString();
}

function tableColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

function ensureSchema() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    name TEXT NOT NULL,
    favorite TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    code TEXT UNIQUE NOT NULL,
    subtotal INTEGER NOT NULL,
    points_used INTEGER NOT NULL,
    points_earned INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    title TEXT NOT NULL,
    item_type TEXT NOT NULL,
    price INTEGER NOT NULL,
    qty INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS product_likes (
    product_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (product_id, client_id)
  );
  `);

  const orderCols = tableColumns("orders");
  if (!orderCols.includes("customer_name")) {
    db.exec("ALTER TABLE orders ADD COLUMN customer_name TEXT NOT NULL DEFAULT 'Гість'");
  }
  if (!orderCols.includes("status")) {
    db.exec("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'Нове'");
  }
  if (!orderCols.includes("order_method")) {
    db.exec("ALTER TABLE orders ADD COLUMN order_method TEXT NOT NULL DEFAULT 'pickup'");
  }
  if (!orderCols.includes("delivery_address")) {
    db.exec("ALTER TABLE orders ADD COLUMN delivery_address TEXT");
  }

  const cols = tableColumns("users");
  const isLegacyTelegramSchema = cols.includes("telegram_handle") && !cols.includes("username");
  if (!isLegacyTelegramSchema) return;

  const legacyUsers = db.prepare("SELECT * FROM users").all();
  const migrate = db.transaction(() => {
    db.exec(`
      ALTER TABLE users RENAME TO users_telegram_backup;
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        name TEXT NOT NULL,
        favorite TEXT,
        points INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const insert = db.prepare(`
      INSERT INTO users (id, username, password_hash, salt, name, favorite, points, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const usedUsernames = new Set();
    for (const user of legacyUsers) {
      const baseUsername = String(user.telegram_handle || `guest_${user.id}`)
        .replace(/^@/, "")
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .slice(0, 24)
        .toLowerCase();
      let username = baseUsername || `guest_${user.id}`;
      while (usedUsernames.has(username)) {
        username = `${baseUsername.slice(0, 18) || "guest"}_${user.id}`;
      }
      usedUsernames.add(username);
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = hashPassword(crypto.randomBytes(12).toString("hex"), salt);
      insert.run(
        user.id,
        username || `guest_${user.id}`,
        passwordHash,
        salt,
        user.name || username || `Гість ${user.id}`,
        null,
        Number(user.points || 0),
        user.created_at || nowIso(),
        user.updated_at || nowIso()
      );
    }
  });
  migrate();
}

function normalizeUsername(raw) {
  const username = String(raw || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return null;
  return username;
}

function cleanName(raw) {
  return String(raw || "").trim().replace(/\s+/g, " ").slice(0, 48);
}

function cleanFavorite(raw) {
  return String(raw || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function cleanCustomerName(raw) {
  return String(raw || "").trim().replace(/\s+/g, " ").slice(0, 60) || "Гість";
}

function cleanOrderMethod(raw) {
  const method = String(raw || "").trim();
  return ["dine-in", "pickup", "courier"].includes(method) ? method : "pickup";
}

function orderMethodLabel(method) {
  if (method === "dine-in") return "В закладі";
  if (method === "courier") return "Кур'єр";
  return "Самовивіз";
}

function cleanDeliveryAddress(raw) {
  return String(raw || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function cleanProductId(raw) {
  const id = String(raw || "").trim();
  return PRODUCTS.has(id) ? id : "";
}

function cleanClientId(raw) {
  const id = String(raw || "").trim();
  return /^[a-zA-Z0-9_-]{12,80}$/.test(id) ? id : "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function money(uah) {
  return `${Math.round(Number(uah) || 0)} грн`;
}

function orderItems(orderId) {
  return db
    .prepare("SELECT product_id as id, title, item_type as type, price, qty FROM order_items WHERE order_id=?")
    .all(orderId);
}

function orderPayload(o) {
  return {
    id: o.id,
    code: o.code,
    subtotal: o.subtotal,
    pointsUsed: o.points_used,
    pointsEarned: o.points_earned,
    total: o.total,
    status: o.status || "Нове",
    customerName: o.customer_name || "Гість",
    orderMethod: o.order_method || "pickup",
    orderMethodLabel: orderMethodLabel(o.order_method || "pickup"),
    deliveryAddress: o.delivery_address || "",
    createdAt: o.created_at,
    items: orderItems(o.id),
  };
}

function itemSummary(orderId) {
  return orderItems(orderId)
    .map((item) => `${item.title} x ${item.qty}`)
    .join(", ");
}

function likeCountsPayload() {
  const counts = {};
  for (const row of db.prepare("SELECT product_id, COUNT(*) AS count FROM product_likes GROUP BY product_id").all()) {
    if (PRODUCTS.has(row.product_id)) counts[row.product_id] = Number(row.count || 0);
  }
  return counts;
}

function tsvCell(value) {
  return String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

function allowedOrigins(originEnv) {
  if (!originEnv || originEnv === "*") return true;
  return originEnv
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password, user) {
  const incoming = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(incoming, "hex"), Buffer.from(user.password_hash, "hex"));
}

function genToken() {
  return crypto.randomBytes(32).toString("hex");
}

function genPickupCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function mePayload(u) {
  return {
    id: u.id,
    username: u.username,
    name: u.name || "",
    favorite: u.favorite || "",
    points: Number(u.points || 0),
  };
}

function createSession(userId) {
  const token = genToken();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    token,
    userId,
    Date.now() + SESSION_TTL_MS,
    nowIso()
  );
  return token;
}

function auth(req, res, next) {
  const raw = String(req.headers.authorization || "");
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
  if (!token) return res.status(401).json({ ok: false, error: "unauthorized" });
  const row = db
    .prepare(
      `SELECT s.token, s.expires_at, u.id, u.username, u.name, u.favorite, u.points
       FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?`
    )
    .get(token);
  if (!row || Date.now() > Number(row.expires_at)) return res.status(401).json({ ok: false, error: "unauthorized" });
  req.user = row;
  req.token = token;
  next();
}

ensureSchema();

app.use(express.json({ limit: "128kb" }));
app.use(
  cors({
    origin: allowedOrigins(ORIGIN),
    credentials: false,
  })
);
app.use(["/server", "/node_modules", "/java", "/__pycache__"], (_req, res) => {
  res.status(404).json({ ok: false, error: "not_found" });
});
app.use(express.static(process.cwd(), { dotfiles: "ignore" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/likes", (_req, res) => {
  res.json({ ok: true, likes: likeCountsPayload() });
});

app.post("/likes/:id", (req, res) => {
  const productId = cleanProductId(req.params.id);
  const clientId = cleanClientId(req.body?.clientId);
  const liked = Boolean(req.body?.liked);
  if (!productId) return res.status(404).json({ ok: false, error: "not_found" });
  if (!clientId) return res.status(400).json({ ok: false, error: "invalid_client" });

  if (liked) {
    db.prepare("INSERT OR IGNORE INTO product_likes (product_id, client_id, created_at) VALUES (?, ?, ?)").run(productId, clientId, nowIso());
  } else {
    db.prepare("DELETE FROM product_likes WHERE product_id=? AND client_id=?").run(productId, clientId);
  }

  res.json({ ok: true, likes: likeCountsPayload() });
});

app.post("/auth/register", (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const name = cleanName(req.body?.name);
  const favorite = cleanFavorite(req.body?.favorite);
  const password = String(req.body?.password || "");

  if (!username) return res.status(400).json({ ok: false, error: "invalid_username" });
  if (!name || name.length < 2) return res.status(400).json({ ok: false, error: "invalid_name" });
  if (password.length < 6) return res.status(400).json({ ok: false, error: "weak_password" });
  if (db.prepare("SELECT 1 FROM users WHERE username=?").get(username)) {
    return res.status(409).json({ ok: false, error: "username_taken" });
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const created = nowIso();
  const result = db
    .prepare(
      `INSERT INTO users (username, password_hash, salt, name, favorite, points, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .run(username, passwordHash, salt, name, favorite || null, created, created);
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(result.lastInsertRowid);
  const token = createSession(user.id);
  res.json({ ok: true, token, user: mePayload(user) });
});

app.post("/auth/login", (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || "");
  if (!username || !password) return res.status(400).json({ ok: false, error: "bad_credentials" });

  const user = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (!user || !verifyPassword(password, user)) return res.status(401).json({ ok: false, error: "bad_credentials" });

  const token = createSession(user.id);
  res.json({ ok: true, token, user: mePayload(user) });
});

app.post("/auth/logout", auth, (req, res) => {
  db.prepare("DELETE FROM sessions WHERE token=?").run(req.token);
  res.json({ ok: true });
});

app.get("/me", auth, (req, res) => res.json({ ok: true, user: mePayload(req.user) }));
app.get("/auth/me", auth, (req, res) => res.json({ ok: true, user: mePayload(req.user) }));

app.post("/me/profile", auth, (req, res) => {
  const name = cleanName(req.body?.name);
  const favorite = cleanFavorite(req.body?.favorite);
  if (!name || name.length < 2) return res.status(400).json({ ok: false, error: "invalid_name" });
  db.prepare("UPDATE users SET name=?, favorite=?, updated_at=? WHERE id=?").run(
    name,
    favorite || null,
    nowIso(),
    req.user.id
  );
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  res.json({ ok: true, user: mePayload(user) });
});

app.get("/me/orders", auth, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 100").all(req.user.id).map(orderPayload);
  res.json({ ok: true, orders });
});

app.get("/orders/by-code/:code", (req, res) => {
  const code = String(req.params.code || "").replace(/\D/g, "").slice(0, 6);
  const o = db.prepare("SELECT * FROM orders WHERE code=?").get(code);
  if (!o) return res.status(404).json({ ok: false, error: "not_found" });
  res.json({ ok: true, order: orderPayload(o) });
});

app.post("/orders/:id/accept", (req, res) => {
  const id = Number(req.params.id || 0);
  db.prepare("UPDATE orders SET status=? WHERE id=?").run("Прийнято", id);
  const o = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  if (!o) return res.status(404).json({ ok: false, error: "not_found" });
  res.json({ ok: true, order: orderPayload(o) });
});

app.post("/orders/:id/cancel", (req, res) => {
  const id = Number(req.params.id || 0);
  db.prepare("UPDATE orders SET status=? WHERE id=?").run("Скасовано", id);
  const o = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  if (!o) return res.status(404).json({ ok: false, error: "not_found" });
  res.json({ ok: true, order: orderPayload(o) });
});

app.post("/orders/:id/issued", (req, res) => {
  const id = Number(req.params.id || 0);
  db.prepare("UPDATE orders SET status=? WHERE id=?").run("Видано", id);
  const o = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  if (!o) return res.status(404).json({ ok: false, error: "not_found" });
  res.json({ ok: true, order: orderPayload(o) });
});

app.post("/orders/:id/delete", (req, res) => {
  const id = Number(req.params.id || 0);
  const o = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  if (!o) return res.status(404).json({ ok: false, error: "not_found" });
  if ((o.status || "Нове") === "Нове") return res.status(409).json({ ok: false, error: "active_order" });
  db.prepare("DELETE FROM order_items WHERE order_id=?").run(id);
  db.prepare("DELETE FROM orders WHERE id=?").run(id);
  res.json({ ok: true, deletedId: id });
});

app.get("/kitchen/orders.tsv", (_req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 100").all();
  const lines = ["id\tcode\tcustomer\tmethod\taddress\tstatus\ttotal\tcreated\titems"];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.code,
        row.customer_name || "Гість",
        orderMethodLabel(row.order_method || "pickup"),
        row.delivery_address || "",
        row.status || "Нове",
        row.total,
        row.created_at,
        itemSummary(row.id),
      ]
        .map(tsvCell)
        .join("\t")
    );
  }
  res.type("text/plain; charset=utf-8").send(lines.join("\n"));
});

app.post("/kitchen/orders/:id/accept", (req, res) => {
  req.url = `/orders/${req.params.id}/accept`;
  app._router.handle(req, res);
});

app.post("/kitchen/orders/:id/cancel", (req, res) => {
  req.url = `/orders/${req.params.id}/cancel`;
  app._router.handle(req, res);
});

app.post("/kitchen/orders/:id/issued", (req, res) => {
  req.url = `/orders/${req.params.id}/issued`;
  app._router.handle(req, res);
});

app.post("/kitchen/orders/:id/delete", (req, res) => {
  req.url = `/orders/${req.params.id}/delete`;
  app._router.handle(req, res);
});

app.get("/kitchen/report.tsv", (req, res) => {
  const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || "")) ? String(req.query.date) : new Date().toISOString().slice(0, 10);
  const orders = db.prepare("SELECT * FROM orders WHERE substr(created_at, 1, 10)=? ORDER BY id DESC").all(reportDate);
  const activeOrders = orders.filter((order) => !String(order.status || "").includes("Скас"));
  const totalOrders = orders.length;
  const totalRevenue = activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const productRows = db
    .prepare(
      `SELECT oi.title, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price) AS total
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE substr(o.created_at, 1, 10)=? AND o.status NOT LIKE '%Скас%'
       GROUP BY oi.title
       ORDER BY qty DESC, total DESC`
    )
    .all(reportDate);
  const totalItems = productRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const lines = ["section\tname\tqty\ttotal", `summary\torders\t${totalOrders}\t${totalRevenue}`, `summary\titems\t${totalItems}\t${totalRevenue}`];
  for (const row of productRows) {
    lines.push(["product", row.title, row.qty, row.total].map(tsvCell).join("\t"));
  }
  res.type("text/plain; charset=utf-8").send(lines.join("\n"));
});

app.post("/orders/checkout", (req, res) => {
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const items = rawItems
    .map((it) => {
      const product = PRODUCTS.get(String(it.id || ""));
      const qty = Math.max(0, Math.min(20, Number(it.qty || 0) | 0));
      return product && qty > 0 ? { ...product, qty } : null;
    })
    .filter(Boolean);
  if (!items.length) return res.status(400).json({ ok: false, error: "invalid_items" });

  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const total = subtotal;
  const customerName = cleanCustomerName(req.body?.customerName);
  const orderMethod = cleanOrderMethod(req.body?.orderMethod);
  const deliveryAddress = cleanDeliveryAddress(req.body?.deliveryAddress);
  if (orderMethod === "courier" && deliveryAddress.length < 5) {
    return res.status(400).json({ ok: false, error: "invalid_delivery_address" });
  }
  let code = genPickupCode();
  while (db.prepare("SELECT 1 FROM orders WHERE code=?").get(code)) code = genPickupCode();
  const createdAt = nowIso();

  const tx = db.transaction(() => {
    const orderRes = db
      .prepare(
        `INSERT INTO orders (user_id, code, subtotal, points_used, points_earned, total, created_at, customer_name, status, order_method, delivery_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(0, code, subtotal, 0, 0, total, createdAt, customerName, "Нове", orderMethod, deliveryAddress || null);
    const orderId = Number(orderRes.lastInsertRowid);
    const ins = db.prepare(
      "INSERT INTO order_items (order_id, product_id, title, item_type, price, qty) VALUES (?, ?, ?, ?, ?, ?)"
    );
    items.forEach((it) => ins.run(orderId, it.id, it.title, it.type, it.price, it.qty));
    return orderId;
  });

  const orderId = tx();
  res.json({
    ok: true,
    order: {
      id: orderId,
      code,
      subtotal,
      pointsUsed: 0,
      pointsEarned: 0,
      total,
      status: "Нове",
      customerName,
      orderMethod,
      orderMethodLabel: orderMethodLabel(orderMethod),
      deliveryAddress,
      createdAt,
      items,
    },
  });
});

app.get("/receipt/:code", (req, res) => {
  const code = String(req.params.code || "").replace(/\D/g, "").slice(0, 6);
  const o = db.prepare("SELECT * FROM orders WHERE code=?").get(code);
  if (!o) return res.status(404).send("<h1>Чек не знайдено</h1>");
  const order = orderPayload(o);
  const items = order.items
    .map((item) => `<div class="receipt__item"><span>${escapeHtml(item.title)} x ${item.qty}</span><strong>${money(item.price * item.qty)}</strong></div>`)
    .join("");
  res.type("html").send(`<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Чек ${escapeHtml(order.code)} - Pizza Kavabanga</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070b10;color:#111;font-family:Arial,sans-serif;padding:24px}
.receipt{width:min(420px,100%);background:#fffdf4;padding:22px;border-radius:8px;box-shadow:0 28px 80px rgba(0,0,0,.55)}
h1{margin:0 0 8px;text-align:center}.code{font-size:42px;font-weight:900;text-align:center;color:#ff7a18;letter-spacing:.08em}
.row,.receipt__item,.total{display:flex;justify-content:space-between;gap:16px;border-top:1px dashed #999;padding:10px 0}
.total{font-size:24px;font-weight:900}.muted{color:#666;font-size:13px;text-align:center}.actions{display:flex;gap:8px;margin-bottom:12px}
a,button{padding:10px 12px;border-radius:8px;border:0;background:#111;color:#fff;text-decoration:none;font-weight:800;cursor:pointer}
@media print{body{background:#fff;padding:0}.actions{display:none}.receipt{box-shadow:none}}
</style></head><body><main><div class="actions"><button onclick="print()">Друкувати</button><a href="/pickup.html?code=${escapeHtml(order.code)}">До замовлення</a></div>
<section class="receipt"><h1>Pizza Kavabanga</h1><div class="muted">м. Черкаси, бульвар Шевченка 249</div><div class="code">${escapeHtml(order.code)}</div>
<div class="row"><span>Клієнт</span><strong>${escapeHtml(order.customerName)}</strong></div><div class="row"><span>Тип</span><strong>${escapeHtml(order.orderMethodLabel)}</strong></div>${order.deliveryAddress ? `<div class="row"><span>Адреса</span><strong>${escapeHtml(order.deliveryAddress)}</strong></div>` : ""}<div class="row"><span>Статус</span><strong>${escapeHtml(order.status)}</strong></div>
${items}<div class="total"><span>Разом</span><span>${money(order.total)}</span></div><p class="muted">Покажи цей чек або назви код на видачі.</p></section></main></body></html>`);
});

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});
