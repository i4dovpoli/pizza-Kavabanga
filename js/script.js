const API_OVERRIDE_KEY = "kavabanga:apiBase";
const CONFIG_API_BASE = String(window.KAVABANGA_API_BASE || "").trim().replace(/\/+$/, "");
const DEFAULT_API_BASE = location.protocol === "file:" ? "http://localhost:3001" : location.origin;
const API_BASE = (localStorage.getItem(API_OVERRIDE_KEY) || CONFIG_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
const AUTH_TOKEN_KEY = "kavabanga:authToken";
const AUTH_USER_KEY = "kavabanga:authUser";
const AUTH_PASSWORD_KEY = "kavabanga:autoPassword";
const CART_KEY = "kavabanga:cart";
const RETURN_TO_KEY = "kavabanga:returnTo";
const LOCAL_USERS_KEY = "kavabanga:localUsers";
const LOCAL_ORDERS_KEY = "kavabanga:localOrders";
const FAVORITES_KEY = "kavabanga:favorites";
const LIKE_COUNTS_KEY = "kavabanga:likeCounts";
const LIKE_CLIENT_KEY = "kavabanga:likeClient";
const ORDER_METHODS = {
  "dine-in": "В закладі",
  pickup: "Самовивіз",
  courier: "Кур'єр",
};
const ORDER_STEPS = ["Прийнято", "Готується", "Готово"];

const money = (uah) => `${Math.round(Number(uah) || 0)} грн`;
const orderMethodLabel = (method) => ORDER_METHODS[method] || ORDER_METHODS.pickup;
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

const PRODUCTS = [
  {
    id: "kavabox",
    type: "combo",
    title: "KavaBox Черепаший Комбо",
    desc: "Іграшка з серії черепашок, Кола Кавабанга 0.5 л і Піца Кавабанга Макс",
    price: 499,
    weight: "комбо",
    image: "./images/kavabox.png",
    badge: { text: "Бокс", tone: "green" },
    includes: ["Фігурка-сюрприз", "Кола Кавабанга", "Кавабанга Макс"],
    featured: true,
  },
  {
    id: "party-box",
    type: "combo",
    title: "Party Box Мікеланджело",
    desc: "Для вечірки: Мікеланджело Вечірка, Лаймовий ніндзя і колекційна фігурка-сюрприз",
    price: 459,
    weight: "комбо",
    image: "./images/michelangelo-box.jpg",
    badge: { text: "Party", tone: "orange" },
    includes: ["Піца Мікеланджело", "Лаймовий ніндзя", "Фігурка"],
  },
  {
    id: "tech-box",
    type: "combo",
    title: "Tech Box Донателло",
    desc: "Донателло Техно, Крижаний сюрікен і геройська іграшка для колекції",
    price: 449,
    weight: "комбо",
    image: "./images/donatello-box.jpg",
    badge: { text: "Tech", tone: "green" },
    includes: ["Донателло Техно", "Крижаний сюрікен", "Фігурка"],
  },
  {
    id: "fire-box",
    type: "combo",
    title: "Fire Box Рафаель",
    desc: "Гострий набір: Рафаель Вогонь, Апельсин додзьо і фігурка-сюрприз",
    price: 469,
    weight: "комбо",
    image: "./images/raphael-box.jpg",
    badge: { text: "Гострий", tone: "orange" },
    includes: ["Рафаель Вогонь", "Апельсин додзьо", "Фігурка"],
  },
  {
    id: "sensei-box",
    type: "combo",
    title: "Sensei Box Сплінтер",
    desc: "Ситний бокс із піцою Сплінтер Теріякі, Колою Кавабанга і фігуркою",
    price: 479,
    weight: "комбо",
    image: "./images/sprinter-box.jpg",
    badge: { text: "Сенсей", tone: "green" },
    includes: ["Сплінтер Теріякі", "Кола Кавабанга", "Фігурка"],
  },
  { id: "kavabanga", type: "pizza", title: "Кавабанга Макс", desc: "Пепероні, гриби, оливки", price: 329, weight: "30 см", image: "./images/kavabanga.jpg", badge: { text: "Хіт", tone: "orange" } },
  { id: "shuriken-salami", type: "pizza", title: "Сюрікен Салямі", desc: "Салямі, моцарела, томати, зелений перець", price: 349, weight: "30 см", image: "./images/salami.jpg", badge: { text: "Новинка", tone: "orange" } },
  { id: "pancyr-syriv", type: "pizza", title: "Панцир Сирів", desc: "4 сири, тягуча моцарела", price: 299, weight: "30 см", image: "./images/pancyr-syriv.jpg", badge: { text: "Сирна", tone: "green" } },
  { id: "mutant-pepperoni", type: "pizza", title: "Мутант Пепероні", desc: "Пепероні, сир, соус", price: 339, weight: "30 см", image: "./images/mutant-pepperoni.jpg", badge: { text: "Ситна", tone: "orange" } },
  { id: "tin-grybiv", type: "pizza", title: "Тінь Грибів", desc: "Гриби, моцарела, соус", price: 249, weight: "30 см", image: "./images/tin-grybiv.jpg", badge: { text: "Класика", tone: "green" } },
  { id: "ninja-bbq", type: "pizza", title: "Ніндзя Барбекю", desc: "Курка, бекон, соус барбекю", price: 349, weight: "30 см", image: "./images/ninja-bbq.jpg", badge: { text: "Барбекю", tone: "orange" } },
  { id: "katana-hit", type: "pizza", title: "Катана Хіт", desc: "Сир, шинка, томати", price: 329, weight: "30 см", image: "./images/katana-hit.jpg", badge: { text: "Топ", tone: "green" } },
  { id: "kanalizaciyna-klasyka", type: "pizza", title: "Каналізаційна Класика", desc: "Сир, гриби, маслини", price: 289, weight: "30 см", image: "./images/kanalizaciyna-klasyka.jpg", badge: { text: "Класика", tone: "green" } },
  { id: "leonardo-special", type: "pizza", title: "Леонардо Особлива", desc: "Сир, м'ясо, овочі", price: 359, weight: "30 см", image: "./images/leonardo-special.jpg", badge: { text: "Особлива", tone: "orange" } },
  { id: "michelangelo-party", type: "pizza", title: "Мікеланджело Вечірка", desc: "Багато сиру, веселий мікс", price: 369, weight: "30 см", image: "./images/michelangelo-party.jpg", badge: { text: "Вечірка", tone: "orange" } },
  { id: "raphael-fire", type: "pizza", title: "Рафаель Вогонь", desc: "Гостра, як Рафаель", price: 369, weight: "30 см", image: "./images/raphael-fire.jpg", badge: { text: "Гостра", tone: "orange" } },
  { id: "zelena-syla", type: "pizza", title: "Зелена сила", desc: "Шпинат, моцарела, зелень", price: 329, weight: "30 см", image: "./images/zelena-syla.jpg", badge: { text: "Ніндзя", tone: "green" } },
  { id: "donatello-tech", type: "pizza", title: "Донателло Техно", desc: "Курка, гриби, сирний соус", price: 359, weight: "30 см", image: "./images/donatello-tech.jpg", badge: { text: "Новинка", tone: "green" } },
  { id: "shreder-deluxe", type: "pizza", title: "Шредер Делюкс", desc: "Пепероні, бекон, томати, чилі", price: 389, weight: "30 см", image: "./images/lux.jpg", badge: { text: "Гостра", tone: "orange" } },
  { id: "splinter-teriyaki", type: "pizza", title: "Сплінтер Теріякі", desc: "Курка теріякі, гриби, кунжут", price: 379, weight: "30 см", image: "./images/sprinter.jpg", badge: { text: "Сенсей", tone: "green" } },
  { id: "cola", type: "drink", title: "Кола Кавабанга", desc: "0.5 л", price: 39, weight: "0.5 л", image: "./images/cola.jpg", badge: { text: "Холодна", tone: "green" } },
  { id: "fanta", type: "drink", title: "Помаранчевий портал", desc: "0.5 л", price: 39, weight: "0.5 л", image: "./images/orange.jpg", badge: { text: "Енергетик", tone: "orange" } },
  { id: "sprite", type: "drink", title: "Лаймовий ніндзя", desc: "0.5 л", price: 39, weight: "0.5 л", image: "./images/ninja.jpg", badge: { text: "Лайм", tone: "green" } },
  { id: "mojito", type: "drink", title: "Мохіто Майстер", desc: "0.5 л", price: 49, weight: "0.5 л", image: "./images/mojito.jpg", badge: { text: "Свіжий", tone: "green" } },
  { id: "energy-drink", type: "drink", title: "Енерджі Драйв", desc: "0.5 л", price: 59, weight: "0.5 л", image: "./images/energy-drink.jpg", badge: { text: "Заряд", tone: "orange" } },
  { id: "ice-shuriken", type: "drink", title: "Крижаний сюрикен", desc: "0.5 л", price: 45, weight: "0.5 л", image: "./images/ice.jpg", badge: { text: "Лід", tone: "green" } },
  { id: "dojo-orange", type: "drink", title: "Апельсин додзьо", desc: "0.5 л", price: 45, weight: "0.5 л", image: "./images/apel.jpg", badge: { text: "Додзьо", tone: "orange" } },
  { id: "espresso-shuriken", type: "coffee", title: "Еспресо Сюрікен", desc: "Міцний короткий удар кави", price: 45, weight: "60 мл", image: "./images/espresso-shuriken.jpg", badge: { text: "Кава", tone: "orange" } },
  { id: "americano-dojo", type: "coffee", title: "Американо Додзьо", desc: "Чорна кава для спокійного старту", price: 55, weight: "250 мл", image: "./images/americano-dojo.jpg", badge: { text: "Класика", tone: "green" } },
  { id: "latte-sensei", type: "coffee", title: "Лате Сенсей", desc: "Молочна кава з м'якою пінкою", price: 75, weight: "300 мл", image: "./images/latte-sensei.jpg", badge: { text: "Ніжна", tone: "green" } },
  { id: "cappuccino-katana", type: "coffee", title: "Капучино Катана", desc: "Баланс еспресо, молока і щільної пінки", price: 70, weight: "250 мл", image: "./images/cappuccino-katana.jpg", badge: { text: "Топ", tone: "orange" } },
  { id: "raf-kavabanga", type: "coffee", title: "Раф Кавабанга", desc: "Вершкова кава з фірмовим настроєм", price: 85, weight: "300 мл", image: "./images/raf-kavabanga.jpg", badge: { text: "Фірмова", tone: "orange" } },
  { id: "green-ninja-tea", type: "tea", title: "Зелений Ніндзя", desc: "Легкий зелений чай після гарячої піци", price: 49, weight: "350 мл", image: "./images/green-ninja-tea.jpg", badge: { text: "Чай", tone: "green" } },
  { id: "berry-splinter-tea", type: "tea", title: "Ягідний Сплінтер", desc: "Насичений ягідний чай з кислинкою", price: 55, weight: "350 мл", image: "./images/berry-splinter-tea.jpg", badge: { text: "Ягоди", tone: "orange" } },
  { id: "ginger-raphael-tea", type: "tea", title: "Імбирний Рафаель", desc: "Теплий чай з імбиром і цитрусом", price: 55, weight: "350 мл", image: "./images/ginger-raphael-tea.jpg", badge: { text: "Гарячий", tone: "orange" } },
];

const els = {
  grid: document.querySelector("[data-grid]"),
  tabs: Array.from(document.querySelectorAll("[data-tab]")),
  search: document.querySelector("[data-search]"),
  toast: document.querySelector("[data-toast]"),
  year: document.querySelector("[data-year]"),
  userLinks: Array.from(document.querySelectorAll("[data-user-link]")),
  userLabels: Array.from(document.querySelectorAll("[data-user-label]")),
  userPoints: Array.from(document.querySelectorAll("[data-user-points]")),
  cartCounts: Array.from(document.querySelectorAll("[data-cart-count]")),
  drawer: document.querySelector("[data-drawer]"),
  cart: document.querySelector("[data-cart]"),
  cartTotal: document.querySelector("[data-cart-total]"),
  checkout: document.querySelector("[data-checkout]"),
  orderSuccess: document.querySelector("[data-order-success]"),
  orderCode: document.querySelector("[data-order-code]"),
  burger: document.querySelector("[data-burger]"),
  mobile: document.querySelector("[data-mobile-menu]"),
  mobileClose: document.querySelector("[data-mobile-close]"),
  mobileLinks: Array.from(document.querySelectorAll("[data-mobile-link]")),

  authForm: document.querySelector("[data-auth-form]"),
  authModeButtons: Array.from(document.querySelectorAll("[data-auth-mode]")),
  authName: document.querySelector("[data-auth-name]"),
  authUsername: document.querySelector("[data-auth-username]"),
  authPassword: document.querySelector("[data-auth-password]"),
  authFavorite: document.querySelector("[data-auth-favorite]"),
  authRegisterOnly: Array.from(document.querySelectorAll("[data-register-only]")),
  authSubmit: document.querySelector("[data-auth-submit]"),
  quickLogin: document.querySelector("[data-quick-login]"),
  profileBlock: document.querySelector("[data-profile-block]"),
  profileAvatar: document.querySelector("[data-profile-avatar]"),
  profileLevel: document.querySelector("[data-profile-level]"),
  profileProgress: document.querySelector("[data-profile-progress]"),
  profileProgressText: document.querySelector("[data-profile-progress-text]"),
  profileName: document.querySelector("[data-profile-name]"),
  profileUsername: document.querySelector("[data-profile-username]"),
  profilePoints: document.querySelector("[data-profile-points]"),
  profileFavorite: document.querySelector("[data-profile-favorite]"),
  profilePassword: document.querySelector("[data-profile-password]"),
  profileFavorites: document.querySelector("[data-profile-favorites]"),
  profileForm: document.querySelector("[data-profile-form]"),
  logoutBtn: document.querySelector("[data-logout]"),

  ordersUser: document.querySelector("[data-orders-user]"),
  ordersPoints: document.querySelector("[data-orders-points]"),
  ordersList: document.querySelector("[data-orders-list]"),

  pickupForm: document.querySelector("[data-pickup-form]"),
  pickupResult: document.querySelector("[data-pickup-result]"),
};

let me = null;
let currentTab = "all";
let query = "";
let authMode = "login";
let lastRenderedOrders = [];
let likeCounts = {};
const cart = new Map();
const authState = {
  token: localStorage.getItem(AUTH_TOKEN_KEY) || "",
  user: null,
};

function toast(msg) {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (els.toast.hidden = true), 1900);
}

function formatErr(err) {
  const code = err?.message || "";
  const messages = {
    invalid_username: "Логін: 3-24 символи, латиниця, цифри або _.",
    invalid_name: "Введи ім'я від 2 символів.",
    weak_password: "Пароль має бути від 6 символів.",
    username_taken: "Такий логін уже зайнятий.",
    bad_credentials: "Невірний логін або пароль.",
    unauthorized: "Дія недоступна.",
    invalid_delivery_address: "Введи адресу для доставки кур'єром.",
  };
  return messages[code] || code || "Невідома помилка";
}

function getToken() {
  return authState.token || localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function setToken(token) {
  authState.token = token || "";
  if (!authState.token) localStorage.removeItem(AUTH_TOKEN_KEY);
  else localStorage.setItem(AUTH_TOKEN_KEY, authState.token);
}

function getAuthUser() {
  return authState.user;
}

function setAuthUser(user) {
  authState.user = isValidUser(user) ? user : null;
  if (authState.user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authState.user));
  else localStorage.removeItem(AUTH_USER_KEY);
}

function isValidUser(user) {
  return Boolean(user && typeof user === "object" && Number.isFinite(Number(user.id)));
}

function normalizeUsername(raw) {
  const username = String(raw || "").trim().toLowerCase();
  return /^[a-z0-9_]{3,24}$/.test(username) ? username : "";
}

async function passwordHash(password) {
  if (!crypto?.subtle) {
    let hash = 0;
    for (const ch of `kavabanga:${password}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return String(hash);
  }
  const data = new TextEncoder().encode(`kavabanga:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function localUserPayload(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    favorite: user.favorite || "",
    points: Number(user.points || 0),
  };
}

function productById(id) {
  return PRODUCTS.find((product) => product.id === id) || null;
}

function normalizedCartItems(rawItems) {
  return (Array.isArray(rawItems) ? rawItems : [])
    .map((item) => {
      const product = productById(String(item.id || ""));
      const qty = Math.max(0, Math.min(20, Number(item.qty || 0) | 0));
      return product && qty > 0 ? { id: product.id, title: product.title, type: product.type, price: product.price, qty } : null;
    })
    .filter(Boolean);
}

function randomProfileId() {
  const users = readJson(LOCAL_USERS_KEY, []);
  let id = "";
  do {
    id = String(Math.floor(10000 + Math.random() * 90000));
  } while (users.some((user) => String(user.username) === id || Number(user.id) === Number(id)));
  return id;
}

function randomPassword() {
  return `pizza${Math.floor(100 + Math.random() * 900)}`;
}

function currentLocalUser() {
  const token = getToken();
  if (!token.startsWith("local:")) return null;
  const id = Number(token.split(":")[1]);
  const users = readJson(LOCAL_USERS_KEY, []);
  const user = users.find((user) => Number(user.id) === id) || null;
  if (user) return user;
  const cached = readJson(AUTH_USER_KEY, null);
  return Number(cached?.id) === id ? cached : null;
}

async function localApi(path, opts = {}) {
  const body = opts.body || {};
  const users = readJson(LOCAL_USERS_KEY, []);

  if (path === "/auth/register") {
    const username = normalizeUsername(body.username);
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    if (!username) throw new Error("invalid_username");
    if (name.length < 2) throw new Error("invalid_name");
    if (password.length < 6) throw new Error("weak_password");
    if (users.some((user) => user.username === username)) throw new Error("username_taken");

    const user = {
      id: Number(username),
      username,
      name,
      favorite: String(body.favorite || "").trim(),
      points: 0,
      passwordHash: await passwordHash(password),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeJson(LOCAL_USERS_KEY, users);
    const token = `local:${user.id}:${crypto.randomUUID()}`;
    return { ok: true, token, user: localUserPayload(user), local: true };
  }

  if (path === "/auth/login") {
    const username = normalizeUsername(body.username);
    const password = String(body.password || "");
    const user = users.find((item) => item.username === username);
    if (!user || user.passwordHash !== (await passwordHash(password))) throw new Error("bad_credentials");
    const token = `local:${user.id}:${crypto.randomUUID()}`;
    return { ok: true, token, user: localUserPayload(user), local: true };
  }

  if (path.startsWith("/orders/by-code/")) {
    const code = decodeURIComponent(path.split("/").pop() || "");
    const order = readJson(LOCAL_ORDERS_KEY, []).find((item) => item.code === code);
    if (!order) throw new Error("not_found");
    return { ok: true, order, local: true };
  }

  if (path === "/orders/checkout") {
    const items = normalizedCartItems(body.items);
    if (!items.length) throw new Error("invalid_items");
    const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    const orders = readJson(LOCAL_ORDERS_KEY, []);
    const customerName = String(body.customerName || "").trim() || "Гість";
    const orderMethod = Object.hasOwn(ORDER_METHODS, body.orderMethod) ? body.orderMethod : "pickup";
    const deliveryAddress = String(body.deliveryAddress || "").trim().replace(/\s+/g, " ").slice(0, 120);
    if (orderMethod === "courier" && deliveryAddress.length < 5) throw new Error("invalid_delivery_address");
    let code = String(Math.floor(100000 + Math.random() * 900000));
    while (orders.some((order) => order.code === code)) code = String(Math.floor(100000 + Math.random() * 900000));
    const order = {
      id: Date.now(),
      userId: null,
      customerName,
      code,
      subtotal,
      pointsUsed: 0,
      pointsEarned: 0,
      total: subtotal,
      status: "Нове",
      orderMethod,
      orderMethodLabel: orderMethodLabel(orderMethod),
      deliveryAddress,
      createdAt: new Date().toISOString(),
      items,
    };
    orders.push(order);
    writeJson(LOCAL_ORDERS_KEY, orders);
    return { ok: true, order, local: true };
  }

  if (path === "/likes") {
    return { ok: true, likes: normalizedLikeCounts(readJson(LIKE_COUNTS_KEY, {})), local: true };
  }

  if (path.startsWith("/likes/")) {
    const id = decodeURIComponent(path.split("/").pop() || "");
    if (!productById(id)) throw new Error("not_found");
    const counts = normalizedLikeCounts(readJson(LIKE_COUNTS_KEY, {}));
    counts[id] = Math.max(0, (Number(counts[id] || 0) | 0) + (body.liked ? 1 : -1));
    writeJson(LIKE_COUNTS_KEY, counts);
    return { ok: true, likes: counts, local: true };
  }

  const user = currentLocalUser();
  if (!user) throw new Error("unauthorized");

  if (path === "/auth/me" || path === "/me") return { ok: true, user: localUserPayload(user), local: true };

  if (path === "/auth/logout") return { ok: true, local: true };

  if (path === "/me/profile") {
    const name = String(body.name || "").trim();
    const password = String(body.password || "").trim();
    if (name.length < 2) throw new Error("invalid_name");
    if (password && password.length < 6) throw new Error("weak_password");
    user.name = name;
    user.favorite = String(body.favorite || "").trim();
    if (password) user.passwordHash = await passwordHash(password);
    writeJson(LOCAL_USERS_KEY, users);
    return { ok: true, user: localUserPayload(user), local: true };
  }

  if (path === "/me/orders") {
    const orders = readJson(LOCAL_ORDERS_KEY, []).filter((order) => Number(order.userId) === Number(user.id));
    return { ok: true, orders: orders.sort((a, b) => b.id - a.id), local: true };
  }

  throw new Error("not_found");
}

async function api(path, opts = {}) {
  const headers = { "content-type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const isFilePage = location.protocol === "file:";
  const isOrderPath = path === "/orders/checkout" || path.startsWith("/orders/by-code/");

  if (path === "/auth/register" || path === "/auth/login") return localApi(path, opts);
  if (isOrderPath && isFilePage) return localApi(path, opts);
  if (token.startsWith("local:")) return localApi(path, opts);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method || "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) throw new Error(data?.error || `HTTP_${res.status}`);
    if (!data || typeof data !== "object" || data.ok !== true) throw new Error("invalid_response");
    if (path === "/orders/checkout" && data.order) {
      const localOrders = readJson(LOCAL_ORDERS_KEY, []);
      if (!localOrders.some((order) => order.code === data.order.code)) {
        writeJson(LOCAL_ORDERS_KEY, [
          ...localOrders,
          {
            ...data.order,
            items: Array.isArray(opts.body?.items) ? opts.body.items : data.order.items || [],
          },
        ]);
      }
    }
    return data;
  } catch (err) {
    if (err instanceof TypeError || err?.message === "Failed to fetch") return localApi(path, opts);
    if (isOrderPath && /^(HTTP_404|HTTP_405|HTTP_501|invalid_response)$/.test(err?.message || "")) return localApi(path, opts);
    if (path.startsWith("/orders/by-code/") && err?.message === "not_found") return localApi(path, opts);
    throw err;
  }
}

function saveCart() {
  const obj = {};
  for (const [id, qty] of cart.entries()) {
    const product = productById(id);
    const q = Math.max(0, Math.min(99, Number(qty || 0) | 0));
    if (product && q > 0) obj[id] = q;
  }
  localStorage.setItem(CART_KEY, JSON.stringify(obj));
}

function loadCart() {
  cart.clear();
  const obj = readJson(CART_KEY, {});
  Object.entries(obj).forEach(([id, qty]) => {
    const q = Math.max(0, Math.min(99, Number(qty || 0) | 0));
    if (productById(id) && q > 0) cart.set(id, q);
  });
  saveCart();
}

function cartCount() {
  let n = 0;
  for (const q of cart.values()) n += q;
  return n;
}

function cartSubtotal() {
  let s = 0;
  for (const [id, q] of cart.entries()) {
    const p = productById(id);
    if (p) s += p.price * q;
  }
  return s;
}

function orderItemsTotal(items = []) {
  return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
}

function likeClientId() {
  let id = localStorage.getItem(LIKE_CLIENT_KEY) || "";
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(LIKE_CLIENT_KEY, id);
  }
  return id;
}

function normalizedLikeCounts(raw) {
  const counts = {};
  if (!raw || typeof raw !== "object") return counts;
  Object.entries(raw).forEach(([id, count]) => {
    if (productById(id)) counts[id] = Math.max(0, Number(count || 0) | 0);
  });
  return counts;
}

function setLikeCounts(nextCounts) {
  likeCounts = normalizedLikeCounts(nextCounts);
  writeJson(LIKE_COUNTS_KEY, likeCounts);
}

function favoriteIds() {
  return readJson(FAVORITES_KEY, []);
}

function setFavoriteIds(ids) {
  writeJson(FAVORITES_KEY, Array.from(new Set(ids)));
}

function isFavorite(id) {
  return favoriteIds().includes(id);
}

async function toggleFavorite(id) {
  const ids = favoriteIds();
  const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
  const liked = next.includes(id);
  setFavoriteIds(next);
  likeCounts[id] = Math.max(0, (Number(likeCounts[id] || 0) | 0) + (liked ? 1 : -1));
  renderGrid();
  updateProfileFavorites();
  toast(liked ? "Лайк додано" : "Лайк прибрано");
  try {
    const data = await api(`/likes/${encodeURIComponent(id)}`, {
      method: "POST",
      body: { liked, clientId: likeClientId() },
    });
    setLikeCounts(data.likes || {});
    renderGrid();
  } catch (e) {
    likeCounts[id] = Math.max(0, (Number(likeCounts[id] || 0) | 0) + (liked ? -1 : 1));
    setFavoriteIds(ids);
    renderGrid();
    updateProfileFavorites();
    toast("Не вдалося зберегти лайк");
  }
}

function productLikeCount(product) {
  return Math.max(0, Number(likeCounts[product.id] || 0) | 0);
}

async function loadLikes() {
  setLikeCounts(readJson(LIKE_COUNTS_KEY, {}));
  renderGrid();
  try {
    const data = await api("/likes");
    setLikeCounts(data.likes || {});
    renderGrid();
  } catch {}
}

function cacheUser(user) {
  if (!isValidUser(user)) return;
  me = user;
  setAuthUser(user);
}

function clearAuth() {
  setToken("");
  setAuthUser(null);
  me = null;
}

function hydrateAuthFromStorage() {
  authState.token = localStorage.getItem(AUTH_TOKEN_KEY) || "";
  authState.user = isValidUser(readJson(AUTH_USER_KEY, null)) ? readJson(AUTH_USER_KEY, null) : null;
  if (authState.user && !authState.token.startsWith("local:")) setToken(`local:${authState.user.id}:restored`);
  me = authState.user;
}

function userLevel(points) {
  const p = Number(points || 0);
  if (p >= 500) {
    return { name: "Kavabanga Pro", current: 500, next: 1000, nextName: "VIP-бонус" };
  }
  if (p >= 200) {
    return { name: "Піца-фан", current: 200, next: 500, nextName: "Kavabanga Pro" };
  }
  return { name: "Новачок", current: 0, next: 200, nextName: "Піца-фан" };
}

function updateUserUi() {
  me = getAuthUser();
  if (!isValidUser(me)) {
    els.userLabels.forEach((label) => {
      label.textContent = "Самовивіз";
    });
    els.userLinks.forEach((link) => {
      if (link instanceof HTMLAnchorElement) link.href = "./pickup.html";
    });
    els.userPoints.forEach((points) => {
      points.hidden = true;
    });
    return;
  }
  els.userLabels.forEach((label) => {
    label.textContent = me.name || me.username || "Самовивіз";
  });
  els.userLinks.forEach((link) => {
    if (link instanceof HTMLAnchorElement) link.href = "./pickup.html";
  });
  els.userPoints.forEach((points) => {
    points.hidden = false;
    points.textContent = String(me.points || 0);
  });
}

function updateAuthMode(nextMode) {
  authMode = nextMode === "register" ? "register" : "login";
  if (!els.authModeButtons.length) {
    if (els.authSubmit) els.authSubmit.textContent = "Створити код";
    return;
  }
  els.authModeButtons.forEach((button) => {
    const active = button.getAttribute("data-auth-mode") === authMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  els.authRegisterOnly.forEach((node) => {
    node.hidden = authMode !== "register";
  });
  if (els.authSubmit) els.authSubmit.textContent = authMode === "register" ? "Створити код" : "Самовивіз";
}

function updateProfileFavorites() {
  if (!els.profileFavorites) return;
  const items = favoriteIds()
    .map((id) => PRODUCTS.find((product) => product.id === id))
    .filter(Boolean);
  if (!items.length) {
    els.profileFavorites.innerHTML = `<span class="muted">Лайків поки немає</span>`;
    return;
  }
  els.profileFavorites.innerHTML = items.map((item) => `<span class="favorite-chip">${item.title}</span>`).join("");
}

function updateLoginPageUi() {
  if (!els.authForm) return;
  me = getAuthUser();
  const loggedIn = Boolean(isValidUser(me) && getToken());

  els.authForm.hidden = loggedIn;
  if (els.profileBlock) els.profileBlock.hidden = !loggedIn;
  if (!loggedIn) {
    updateAuthMode(authMode);
    return;
  }

  const level = userLevel(me.points);
  const points = Number(me.points || 0);
  const progress = Math.max(0, Math.min(100, ((points - level.current) / (level.next - level.current)) * 100));
  const remaining = Math.max(0, level.next - points);
  if (els.profileAvatar) els.profileAvatar.textContent = (me.name || me.username || "K").slice(0, 1).toUpperCase();
  if (els.profileLevel) els.profileLevel.textContent = level.name;
  if (els.profileProgress) els.profileProgress.style.width = `${progress}%`;
  if (els.profileProgressText) {
    els.profileProgressText.textContent = remaining
      ? `${points} / ${level.next} · ще ${remaining} до ${level.nextName}`
      : `${points} · ${level.nextName} відкрито`;
  }
  if (els.profileName) els.profileName.value = me.name || "";
  if (els.profileUsername) els.profileUsername.textContent = `@${me.username}`;
  if (els.profilePoints) els.profilePoints.textContent = String(me.points || 0);
  if (els.profileFavorite) els.profileFavorite.value = me.favorite || "";
  if (els.profilePassword) els.profilePassword.value = localStorage.getItem(AUTH_PASSWORD_KEY) || "";
  updateProfileFavorites();
}

async function finishAuth(data, message, password = "") {
  setToken(data.token);
  cacheUser(data.user);
  if (password) localStorage.setItem(AUTH_PASSWORD_KEY, password);
  updateUserUi();
  updateLoginPageUi();
  const ret = localStorage.getItem(RETURN_TO_KEY);
  localStorage.removeItem(RETURN_TO_KEY);
  toast(message);
  if (ret && ret !== location.pathname) setTimeout(() => (location.href = ret), 350);
}

async function createAutoProfile() {
  const id = randomProfileId();
  const password = randomPassword();
  const body = {
    username: id,
    password,
    name: `Гість ${id}`,
    favorite: "Кавабанга Макс",
  };
  const data = await localApi("/auth/register", { method: "POST", body });
  await finishAuth(data, `Код створено. ID: ${id}, пароль: ${password}`, password);
}

async function loadMe() {
  if (!getToken()) {
    clearAuth();
    updateUserUi();
    updateLoginPageUi();
    return;
  }
  try {
    const data = await api("/auth/me");
    cacheUser(data.user);
  } catch (e) {
    clearAuth();
  }
  updateUserUi();
  updateLoginPageUi();
}

function cardTemplate(p) {
  const activeFavorite = isFavorite(p.id);
  const likes = productLikeCount(p);
  const typeLabel =
    p.type === "drink" ? "Напій" : p.type === "combo" ? "Бокс" : p.type === "coffee" ? "Кава" : p.type === "tea" ? "Чай" : "Піца";
  const includes = Array.isArray(p.includes) ? `<div class="card__includes">${p.includes.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : "";
  const badge = p.badge ? `<span class="card-chip ${p.badge.tone === "green" ? "card-chip--green" : "card-chip--orange"}">${escapeHtml(p.badge.text)}</span>` : "";
  const cardClass = p.type === "combo" ? "card--box" : "";
  return `
  <article class="card ${cardClass}">
    <div class="card__media">
      <img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy" decoding="async" />
    </div>
    <div class="card__body">
      <div class="card__meta"><span>${escapeHtml(typeLabel)}</span><span>${escapeHtml(p.weight)}</span>${badge}</div>
      <h3 class="card__title">${escapeHtml(p.title)}</h3>
      <p class="card__desc">${escapeHtml(p.desc)}</p>
      ${includes}
      <div class="card__foot">
        <div class="price">${money(p.price)}</div>
        <div class="card__actions">
          <button class="favorite-btn ${activeFavorite ? "is-active" : ""}" type="button" data-favorite="${p.id}" aria-label="Лайк">
            <span aria-hidden="true">${activeFavorite ? "♥" : "♡"}</span>
            <b>${likes}</b>
          </button>
          <button class="card-cart-btn" type="button" data-open-cart data-cart-button aria-label="Відкрити кошик">
            <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="currentColor" d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6.2 6h15.2a1 1 0 0 1 1 1.2l-1.2 6.4a2 2 0 0 1-2 1.6H8.1a2 2 0 0 1-2-1.5L4.3 2.9H2a1 1 0 1 1 0-2h3a1 1 0 0 1 1 .8L6.2 6Zm1 2 1 5h11.1l1-5H7.2Z" /></svg>
            <span class="card-cart-btn__badge" data-card-cart-count hidden>0</span>
          </button>
          <button class="add" type="button" data-add="${p.id}">Додати</button>
        </div>
      </div>
    </div>
  </article>`;
}

const MENU_SECTIONS = [
  { type: "pizza", title: "Піца", eyebrow: "Гаряча черепашача класика" },
  { type: "combo", title: "Бокси", eyebrow: "Комбо з іграшкою та напоєм" },
  { type: "drink", title: "Напої", eyebrow: "Холодні напої до піци" },
  { type: "coffee", title: "Кава", eyebrow: "Гаряча кава для швидкого самовивозу" },
  { type: "tea", title: "Чай", eyebrow: "Теплі чаї до вечірнього сету" },
];

function productMatchesQuery(p, q) {
  const searchable = `${p.title} ${p.desc} ${(p.includes || []).join(" ")}`.toLowerCase();
  return !q || searchable.includes(q);
}

function sectionTemplate(section, items) {
  return `
    <section class="menu-section" aria-label="${section.title}">
      <div class="menu-section__head">
        <div>
          <span>${section.eyebrow}</span>
          <h2>${section.title}</h2>
        </div>
        <strong>${items.length}</strong>
      </div>
      <div class="menu-section__grid">${items.map(cardTemplate).join("")}</div>
    </section>`;
}

function openCartDrawer() {
  setMobileMenu(false, { focus: false });
  setDrawer(true);
}

function cartTriggerFromEvent(event) {
  return event.target?.closest?.("[data-open-cart], [data-cart-button]");
}

function handleCartTrigger(event) {
  const trigger = cartTriggerFromEvent(event);
  if (!trigger) return false;
  event.preventDefault();
  event.stopPropagation();
  openCartDrawer();
  return true;
}

function bindCardCartButtons() {
  document.querySelectorAll("[data-open-cart]").forEach((button) => {
    button.addEventListener("click", (event) => {
      handleCartTrigger(event);
    });
  });
}

function renderGrid() {
  if (!els.grid) return;
  const q = query.toLowerCase();
  const sections = MENU_SECTIONS.map((section) => ({
    ...section,
    items: PRODUCTS.filter(
      (p) =>
        p.type === section.type &&
        (currentTab === "all" || currentTab === section.type) &&
        productMatchesQuery(p, q)
    ),
  })).filter((section) => section.items.length);

  if (!sections.length) {
    els.grid.innerHTML = `<div class="about__card menu-empty" style="grid-column:1 / -1;"><h3 class="section-title">Нічого не знайдено</h3></div>`;
    return;
  }
  els.grid.innerHTML = sections.map((section) => sectionTemplate(section, section.items)).join("");
  bindCardCartButtons();
  syncBadges();
}

function syncBadges() {
  const n = cartCount();
  els.cartCounts.forEach((b) => {
    b.textContent = String(n);
    b.hidden = n === 0;
  });
  document.querySelectorAll("[data-card-cart-count]").forEach((b) => {
    b.textContent = String(n);
    b.hidden = n === 0;
    b.closest(".card-cart-btn")?.classList.toggle("has-items", n > 0);
  });
}

function syncTotals() {
  if (!els.cartTotal) return;
  const subtotal = cartSubtotal();
  els.cartTotal.textContent = money(subtotal);
  if (els.checkout) els.checkout.disabled = cartCount() === 0;
}

function syncCartUi({ render = false } = {}) {
  saveCart();
  syncBadges();
  syncTotals();
  if (render || (els.drawer && !els.drawer.hidden)) renderCart();
}

function setCartQty(id, qty) {
  const product = productById(id);
  if (!product) return;
  const next = Math.max(0, Math.min(99, Number(qty || 0) | 0));
  if (next <= 0) cart.delete(product.id);
  else cart.set(product.id, next);
  syncCartUi({ render: true });
}

function addToCart(id, qty = 1) {
  const product = productById(id);
  if (!product) return null;
  const current = cart.get(product.id) || 0;
  setCartQty(product.id, current + Number(qty || 1));
  return product;
}

function renderCart() {
  if (!els.cart) return;
  const subtotal = cartSubtotal();
  const count = cartCount();
  const progress = Math.max(12, Math.min(100, (subtotal / 900) * 100));
  const summaryHtml = cart.size
    ? `<div class="cart-summary" style="--cart-progress:${progress}%">
        <div class="cart-summary__top"><strong>Твій сет майже готовий</strong><span>${count} шт.</span></div>
        <div class="cart-summary__bar" aria-hidden="true"><span></span></div>
        <div class="cart-summary__row"><span>Обери спосіб отримання нижче</span><strong>${money(subtotal)}</strong></div>
      </div>`
    : "";
  if (!cart.size) {
    els.cart.innerHTML = `<div class="about__card cart-empty"><div class="section-title" style="font-size:16px;">Кошик порожній</div><p class="muted">Додай піцу з каталогу, і вона одразу з'явиться тут.</p></div>`;
    syncTotals();
    return;
  }
  const rows = [];
  for (const [id, qty] of cart.entries()) {
    const p = productById(id);
    if (!p) continue;
    rows.push(`
      <div class="cart-item">
        <div class="cart-item__thumb"><img src="${p.image}" alt="" /></div>
        <div class="cart-item__main"><div class="cart-item__name">${escapeHtml(p.title)}</div><div class="cart-item__meta">${money(p.price)} x ${qty} = ${money(p.price * qty)}</div></div>
        <div class="qty">
          <button type="button" data-qty="-1" data-id="${id}" aria-label="Зменшити кількість">-</button>
          <span>${qty}</span>
          <button type="button" data-qty="1" data-id="${id}" aria-label="Збільшити кількість">+</button>
        </div>
        <button class="cart-item__remove" type="button" data-remove="${id}" aria-label="Видалити товар">x</button>
      </div>`);
  }
  if (!rows.length) {
    cart.clear();
    saveCart();
    renderCart();
    return;
  }
  els.cart.innerHTML = `${summaryHtml}${rows.join("")}`;
  syncTotals();
}

function cartFavoritesTemplate() {
  const favorites = favoriteIds()
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, 5);

  if (!favorites.length) {
    return `<div class="cart-favorites cart-favorites--empty">
      <div class="cart-favorites__head"><strong>Лайки</strong><span>серце біля товару</span></div>
      <p>Натисни ♡ у меню, і улюблена піца чи напій з'явиться тут.</p>
    </div>`;
  }

  return `<div class="cart-favorites">
    <div class="cart-favorites__head"><strong>Лайки</strong><span>швидко додати</span></div>
    <div class="cart-favorites__list">
      ${favorites
        .map(
          (p) => `
        <button class="cart-favorite" type="button" data-cart-favorite-add="${p.id}">
          <img src="${p.image}" alt="" />
          <span><strong>${escapeHtml(p.title)}</strong><small>${money(p.price)}</small></span>
          <b>+</b>
        </button>`
        )
        .join("")}
    </div>
  </div>`;
}

function setDrawer(open) {
  if (!els.drawer) return;
  els.drawer.hidden = !open;
  els.drawer.setAttribute("aria-hidden", String(!open));
  if (open) renderCart();
}

function showOrderSuccess(order) {
  if (!els.orderSuccess) return;
  if (els.orderCode) els.orderCode.textContent = order.code;
  const panel = els.orderSuccess.querySelector(".order-success__panel");
  if (panel) {
    const pickupLink = panel.querySelector('a[href="./pickup.html"]');
    if (pickupLink && order.code) pickupLink.href = `./pickup.html?code=${encodeURIComponent(order.code)}`;
    let receiptLink = panel.querySelector("[data-receipt-link]");
    if (!receiptLink) {
      receiptLink = document.createElement("a");
      receiptLink.className = "btn btn--ghost";
      receiptLink.setAttribute("data-receipt-link", "");
      receiptLink.target = "_blank";
      receiptLink.rel = "noreferrer";
      receiptLink.textContent = "Онлайн чек";
      panel.querySelector(".order-success__actions")?.prepend(receiptLink);
    }
    if (receiptLink && order.code) receiptLink.href = `./receipt/${encodeURIComponent(order.code)}`;
    let method = panel.querySelector("[data-order-method]");
    if (!method) {
      method = document.createElement("div");
      method.className = "order-success__method";
      method.setAttribute("data-order-method", "");
      const address = panel.querySelector(".order-success__address");
      panel.insertBefore(method, address || panel.querySelector(".order-success__actions"));
    }
    const methodLabel = order.orderMethodLabel || orderMethodLabel(order.orderMethod);
    method.innerHTML = `<span>${escapeHtml(methodLabel)}</span>${order.deliveryAddress ? `<strong>${escapeHtml(order.deliveryAddress)}</strong>` : ""}`;
    let timeline = panel.querySelector("[data-order-timeline]");
    if (!timeline) {
      timeline = document.createElement("div");
      timeline.className = "order-timeline";
      timeline.setAttribute("data-order-timeline", "");
      const address = panel.querySelector(".order-success__address");
      panel.insertBefore(timeline, address || panel.querySelector(".order-success__actions"));
    }
    timeline.innerHTML = renderOrderTimeline(order);
    let details = panel.querySelector("[data-order-items]");
    if (!details) {
      details = document.createElement("div");
      details.className = "order-success__items";
      details.setAttribute("data-order-items", "");
      const address = panel.querySelector(".order-success__address");
      panel.insertBefore(details, address || panel.querySelector(".order-success__actions"));
    }
    const items = Array.isArray(order.items) ? order.items : [];
    const total = Number(order.total || orderItemsTotal(items));
    details.innerHTML = `
      <div class="order-success__items-head"><span>Склад замовлення</span><strong>${money(total)}</strong></div>
      ${items
        .map(
          (item) => `
        <div class="order-success__item">
          <span>${escapeHtml(item.title)}</span>
          <strong>${Number(item.qty || 1)} x ${money(item.price)}</strong>
        </div>`
        )
        .join("")}
    `;
  }
  els.orderSuccess.hidden = false;
}

function orderStepIndex(order) {
  const status = String(order?.status || "").toLowerCase();
  if (status.includes("скас")) return -1;
  if (status.includes("видан")) return 2;
  if (status.includes("готов")) return 2;
  if (status.includes("прий") || status.includes("гот")) return 1;
  return 0;
}

function renderOrderTimeline(order) {
  const active = orderStepIndex(order);
  return ORDER_STEPS.map(
    (step, index) => `<div class="order-timeline__step ${active >= index ? "is-active" : ""}">
      <span>${index + 1}</span>
      <strong>${escapeHtml(step)}</strong>
    </div>`
  ).join("");
}

function addItemsToCart(items) {
  items.forEach((item) => {
    const product = productById(item.id);
    if (!product) return;
    cart.set(product.id, (cart.get(product.id) || 0) + Number(item.qty || 1));
  });
  syncCartUi({ render: true });
  setDrawer(true);
}

async function checkout() {
  if (!cart.size) return toast("Кошик порожній");
  const customerInput = document.querySelector("[data-customer-name]");
  const customerName = String(customerInput?.value || "").trim();
  const methodInput = document.querySelector("[data-order-method-input]");
  const checkedMethod = document.querySelector("[data-order-method-radio]:checked");
  const addressInput = document.querySelector("[data-delivery-address]");
  const rawMethod = checkedMethod?.value || methodInput?.value || "pickup";
  const orderMethod = Object.hasOwn(ORDER_METHODS, rawMethod) ? rawMethod : "pickup";
  const deliveryAddress = String(addressInput?.value || "").trim();
  if (customerInput && customerName.length < 2) {
    customerInput.focus();
    return toast("Введи ім'я для замовлення");
  }
  if (orderMethod === "courier" && deliveryAddress.length < 5) {
    addressInput?.focus();
    return toast("Введи адресу для кур'єра");
  }
  const items = Array.from(cart.entries())
    .map(([id, qty]) => {
      const p = productById(id);
      return p ? { id: p.id, qty } : null;
    })
    .filter(Boolean);
  try {
    const data = await api("/orders/checkout", { method: "POST", body: { items, customerName, orderMethod, deliveryAddress } });
    data.order.items = normalizedCartItems(data.order.items?.length ? data.order.items : items);
    data.order.total = Number(data.order.total || orderItemsTotal(data.order.items));
    cart.clear();
    saveCart();
    syncBadges();
    renderCart();
    setDrawer(false);
    toast(`Код замовлення: ${data.order.code}`);
    showOrderSuccess(data.order);
  } catch (e) {
    toast(`Помилка: ${formatErr(e)}`);
  }
}

function orderStatus(order) {
  return order.status || "Прийнято";
}

function pickupItemImage(item) {
  return PRODUCTS.find((product) => product.id === item.id)?.image || "./images/icon.png";
}

function renderPickupOrder(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.total || orderItemsTotal(items));
  const count = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const methodLabel = order.orderMethodLabel || orderMethodLabel(order.orderMethod);
  const locationText =
    order.orderMethod === "courier" && order.deliveryAddress
      ? `Доставка: ${order.deliveryAddress}`
      : order.orderMethod === "dine-in"
        ? "В закладі: м. Черкаси, бульвар Шевченка 249"
        : "Забрати: м. Черкаси, бульвар Шевченка 249";
  return `<div class="pickup-result">
    <div class="pickup-result__top">
      <div>
        <span>Код самовивозу</span>
        <strong>${escapeHtml(order.code)}</strong>
      </div>
      <b>${escapeHtml(orderStatus(order))}</b>
    </div>
    <div class="order-timeline pickup-result__timeline">
      ${renderOrderTimeline(order)}
    </div>
    <div class="pickup-result__summary">
      <div><span>Ім'я</span><strong>${escapeHtml(order.customerName || "Гість")}</strong></div>
      <div><span>Тип</span><strong>${escapeHtml(methodLabel)}</strong></div>
      <div><span>Позицій</span><strong>${items.length}</strong></div>
      <div><span>Кількість</span><strong>${count}</strong></div>
      <div><span>Разом</span><strong>${money(total)}</strong></div>
    </div>
    <div class="pickup-result__items">
      ${
        items.length
          ? items
              .map(
                (item) => `<div class="pickup-result__item">
                  <img src="${pickupItemImage(item)}" alt="" loading="lazy" decoding="async" />
                  <span>${escapeHtml(item.title)}</span>
                  <strong>${Number(item.qty || 1)} x ${money(item.price)}</strong>
                </div>`
              )
              .join("")
          : `<div class="pickup-result__item pickup-result__item--empty"><span>Склад замовлення не збережено</span></div>`
      }
    </div>
    <div class="pickup-result__actions">
      <a class="pickup-result__address" href="https://www.google.com/maps/search/?api=1&query=%D0%A7%D0%B5%D1%80%D0%BA%D0%B0%D1%81%D0%B8%20%D0%B1%D1%83%D0%BB%D1%8C%D0%B2%D0%B0%D1%80%20%D0%A8%D0%B5%D0%B2%D1%87%D0%B5%D0%BD%D0%BA%D0%B0%20249" target="_blank" rel="noreferrer">${escapeHtml(locationText)}</a>
      <a class="btn btn--ghost" href="./receipt/${encodeURIComponent(order.code)}" target="_blank" rel="noreferrer">Онлайн чек</a>
    </div>
  </div>`;
}

function setMobileMenu(open, opts = {}) {
  if (!els.mobile) return;
  const isOpen = Boolean(open);
  els.mobile.hidden = !isOpen;
  els.mobile.setAttribute("aria-hidden", String(!isOpen));
  els.burger?.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("mobile-menu-open", isOpen);

  if (isOpen && opts.focus !== false) {
    els.mobileClose?.focus();
  } else if (!isOpen && opts.restoreFocus) {
    els.burger?.focus();
  }
}

function prepareMobileMenuLayer() {
  if (els.mobile && els.mobile.parentElement !== document.body) {
    document.body.appendChild(els.mobile);
  }
}

function ensureCustomerNameField() {
  const checkoutBtn = els.checkout;
  if (!checkoutBtn || document.querySelector("[data-customer-name]")) return;
  const box = document.createElement("div");
  box.className = "checkout-customer";
  box.innerHTML = `
    <label class="checkout-customer__field">
      <span>Ім'я для замовлення</span>
      <input class="input" data-customer-name autocomplete="name" placeholder="Наприклад Олена" maxlength="60" />
    </label>
    <div class="checkout-methods" role="radiogroup" aria-label="Спосіб отримання">
      <label><input type="radio" name="order-method" value="dine-in" data-order-method-radio /><span>В закладі</span></label>
      <label><input type="radio" name="order-method" value="pickup" data-order-method-radio checked /><span>Самовивіз</span></label>
      <label><input type="radio" name="order-method" value="courier" data-order-method-radio /><span>Кур'єр</span></label>
    </div>
    <input type="hidden" data-order-method-input value="pickup" />
    <label class="checkout-customer__field checkout-customer__field--address" data-delivery-address-wrap hidden>
      <span>Адреса для кур'єра</span>
      <input class="input" data-delivery-address autocomplete="street-address" placeholder="Вулиця, будинок, під'їзд" maxlength="120" />
    </label>
  `;
  checkoutBtn.parentElement?.insertBefore(box, checkoutBtn);
  const hiddenInput = box.querySelector("[data-order-method-input]");
  const addressWrap = box.querySelector("[data-delivery-address-wrap]");
  const addressInput = box.querySelector("[data-delivery-address]");
  const syncOrderMethod = (value) => {
    const method = Object.hasOwn(ORDER_METHODS, value) ? value : "pickup";
    hiddenInput.value = method;
    addressWrap.hidden = method !== "courier";
    box.querySelectorAll("[data-order-method-radio]").forEach((input) => {
      input.checked = input.value === method;
    });
    if (method === "courier") addressInput?.focus();
  };
  box.querySelectorAll("[data-order-method-radio]").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      syncOrderMethod(radio.value);
    });
    radio.closest("label")?.addEventListener("click", () => syncOrderMethod(radio.value));
  });
  syncOrderMethod(hiddenInput.value);
}

async function renderOrdersPage() {
  me = getAuthUser();
  if (!els.ordersList) return;
  if (!isValidUser(me)) {
    els.ordersList.innerHTML = `<div class="about__card"><p class="muted">Введи код замовлення на сторінці самовивозу.</p><a class="btn btn--primary" href="./pickup.html">Перейти до замовлення</a></div>`;
    return;
  }
  if (els.ordersUser) els.ordersUser.textContent = `${me.name} (@${me.username})`;
  if (els.ordersPoints) els.ordersPoints.textContent = String(me.points || 0);
  try {
    const data = await api("/me/orders");
    lastRenderedOrders = data.orders || [];
    if (!lastRenderedOrders.length) {
      els.ordersList.innerHTML = `<div class="about__card"><p class="muted">Замовлень ще немає.</p></div>`;
      return;
    }
    els.ordersList.innerHTML = lastRenderedOrders
      .map(
        (o, index) => `
      <div class="about__card order-card">
        <div class="order-card__top">
          <div>
            <div class="section-title" style="font-size:16px;">Код: <span style="color:#ff7a18">${o.code}</span></div>
            <div class="muted">${new Date(o.createdAt).toLocaleString("uk-UA")}</div>
          </div>
          <span class="order-status">${orderStatus(o)}</span>
        </div>
        <div class="order-card__items">${(o.items || []).map((item) => `<span>${item.title} × ${item.qty}</span>`).join("")}</div>
        <div class="order-card__bottom">
          <div><div class="price">${money(o.total)}</div></div>
          <button class="btn btn--ghost" type="button" data-repeat-order="${index}">Повторити</button>
        </div>
      </div>`
      )
      .join("");
  } catch (e) {
    els.ordersList.innerHTML = `<div class="about__card"><p class="muted">Не вдалося завантажити: ${formatErr(e)}</p></div>`;
  }
}

function initLoginPage() {
  if (!els.authForm) return;
  updateAuthMode("login");
  updateLoginPageUi();

  els.authModeButtons.forEach((button) => {
    button.addEventListener("click", () => updateAuthMode(button.getAttribute("data-auth-mode")));
  });

  els.authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await createAutoProfile();
    } catch (e) {
      toast(formatErr(e));
    }
  });

  els.quickLogin?.addEventListener("click", async () => {
    try {
      await createAutoProfile();
    } catch (e) {
      toast(`Помилка: ${formatErr(e)}`);
    }
  });

  els.profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = await api("/me/profile", {
        method: "POST",
        body: {
          name: els.profileName?.value || "",
          favorite: els.profileFavorite?.value || "",
          password: els.profilePassword?.value || "",
        },
      });
      cacheUser(data.user);
      if (els.profilePassword?.value) localStorage.setItem(AUTH_PASSWORD_KEY, els.profilePassword.value);
      updateUserUi();
      updateLoginPageUi();
      toast("Дані оновлено");
    } catch (e) {
      toast(formatErr(e));
    }
  });

  els.logoutBtn?.addEventListener("click", async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    clearAuth();
    updateUserUi();
    updateLoginPageUi();
    toast("Вихід виконано");
  });
}

function initPickupPage() {
  if (!els.pickupForm || !els.pickupResult) return;
  const codeInput = els.pickupForm.querySelector('input[name="code"]');

  async function checkPickupCode(rawCode) {
    const code = String(rawCode || "").trim();
    if (!code) return;
    els.pickupResult.innerHTML = `<div class="pickup-empty pickup-empty--loading"><span>Перевіряємо</span><strong>Шукаємо замовлення ${code}</strong><p>Зараз підтягнемо склад кошика.</p></div>`;
    try {
      const data = await api(`/orders/by-code/${encodeURIComponent(code)}`);
      els.pickupResult.innerHTML = renderPickupOrder(data.order);
    } catch {
      els.pickupResult.innerHTML = `<div class="pickup-empty pickup-empty--error"><span>Код не знайдено</span><strong>${code}</strong><p>Перевір цифри й спробуй ще раз.</p></div>`;
    }
  }

  codeInput?.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
  });

  els.pickupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await checkPickupCode(new FormData(els.pickupForm).get("code"));
  });

  const codeFromUrl = new URLSearchParams(location.search).get("code");
  if (codeFromUrl) {
    if (codeInput) codeInput.value = codeFromUrl.replace(/\D/g, "").slice(0, 6);
    checkPickupCode(codeInput?.value || codeFromUrl);
  }
}

function init() {
  if (els.year) els.year.textContent = String(new Date().getFullYear());
  ensureCustomerNameField();
  loadCart();
  syncBadges();
  renderGrid();
  loadLikes();
  syncTotals();

  els.tabs.forEach((b) =>
    b.addEventListener("click", () => {
      currentTab = b.getAttribute("data-tab") || "all";
      els.tabs.forEach((x) => x.classList.toggle("is-active", x === b));
      renderGrid();
    })
  );
  els.search?.addEventListener("input", (e) => {
    query = String(e.target.value || "");
    renderGrid();
  });

  document.addEventListener("pointerup", handleCartTrigger, true);
  document.addEventListener("click", handleCartTrigger, true);

  document.addEventListener("click", (e) => {
    const favorite = e.target?.closest?.("[data-favorite]");
    if (favorite) {
      toggleFavorite(favorite.getAttribute("data-favorite"));
      return;
    }
    const repeat = e.target?.closest?.("[data-repeat-order]");
    if (repeat) {
      const order = lastRenderedOrders[Number(repeat.getAttribute("data-repeat-order"))];
      if (order?.items?.length) {
        addItemsToCart(order.items);
        toast("Замовлення додано в кошик");
      }
      return;
    }
    const add = e.target?.closest?.("[data-add]");
    if (add) {
      const id = add.getAttribute("data-add");
      addToCart(id);
      toast("Додано в кошик");
      return;
    }
    const favoriteAdd = e.target?.closest?.("[data-cart-favorite-add]");
    if (favoriteAdd) {
      const id = favoriteAdd.getAttribute("data-cart-favorite-add");
      const product = addToCart(id);
      if (!product) return;
      toast(`${product.title} додано`);
      return;
    }
    const remove = e.target?.closest?.("[data-remove]");
    if (remove) {
      setCartQty(remove.getAttribute("data-remove"), 0);
      return;
    }
    const q = e.target?.closest?.("[data-qty][data-id]");
    if (q) {
      const id = q.getAttribute("data-id");
      const delta = Number(q.getAttribute("data-qty"));
      setCartQty(id, (cart.get(id) || 0) + delta);
      return;
    }
    if (cartTriggerFromEvent(e)) {
      openCartDrawer();
    }
    if (e.target?.closest?.("[data-drawer-close]")) setDrawer(false);
    if (e.target?.closest?.("[data-order-success-close]")) {
      if (els.orderSuccess) els.orderSuccess.hidden = true;
    }
  });

  els.checkout?.addEventListener("click", checkout);

  prepareMobileMenuLayer();
  setMobileMenu(false, { focus: false });
  els.burger?.addEventListener("click", () => {
    setMobileMenu(els.mobile?.hidden, { restoreFocus: true });
  });
  els.mobileClose?.addEventListener("click", () => {
    setMobileMenu(false, { restoreFocus: true });
  });
  els.mobile?.addEventListener("click", (e) => {
    if (e.target === els.mobile) setMobileMenu(false, { restoreFocus: true });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.mobile && !els.mobile.hidden) setMobileMenu(false, { restoreFocus: true });
  });
  els.mobileLinks.forEach((a) =>
    a.addEventListener("click", () => {
      setMobileMenu(false, { focus: false });
    })
  );

  initPickupPage();
}

init();
