from __future__ import annotations

import random
import sqlite3
from datetime import datetime, timezone
from html import escape
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "server" / "data.sqlite"
PRODUCT_CATALOG = {
    "kavabox": ("combo", "KavaBox Черепаший Комбо", 499),
    "party-box": ("combo", "Party Box Мікеланджело", 459),
    "tech-box": ("combo", "Tech Box Донателло", 449),
    "fire-box": ("combo", "Fire Box Рафаель", 469),
    "sensei-box": ("combo", "Sensei Box Сплінтер", 479),
    "kavabanga": ("pizza", "Кавабанга Макс", 329),
    "shuriken-salami": ("pizza", "Сюрікен Салямі", 349),
    "pancyr-syriv": ("pizza", "Панцир Сирів", 299),
    "mutant-pepperoni": ("pizza", "Мутант Пепероні", 339),
    "tin-grybiv": ("pizza", "Тінь Грибів", 249),
    "ninja-bbq": ("pizza", "Ніндзя Барбекю", 349),
    "katana-hit": ("pizza", "Катана Хіт", 329),
    "kanalizaciyna-klasyka": ("pizza", "Каналізаційна Класика", 289),
    "leonardo-special": ("pizza", "Леонардо Особлива", 359),
    "michelangelo-party": ("pizza", "Мікеланджело Вечірка", 369),
    "raphael-fire": ("pizza", "Рафаель Вогонь", 369),
    "zelena-syla": ("pizza", "Зелена сила", 329),
    "donatello-tech": ("pizza", "Донателло Техно", 359),
    "shreder-deluxe": ("pizza", "Шредер Делюкс", 389),
    "splinter-teriyaki": ("pizza", "Сплінтер Теріякі", 379),
    "cola": ("drink", "Кола Кавабанга", 39),
    "fanta": ("drink", "Помаранчевий портал", 39),
    "sprite": ("drink", "Лаймовий ніндзя", 39),
    "mojito": ("drink", "Мохіто Майстер", 49),
    "energy-drink": ("drink", "Енерджі Драйв", 59),
    "ice-shuriken": ("drink", "Крижаний сюрикен", 45),
    "dojo-orange": ("drink", "Апельсин додзьо", 45),
    "espresso-shuriken": ("coffee", "Еспресо Сюрікен", 45),
    "americano-dojo": ("coffee", "Американо Додзьо", 55),
    "latte-sensei": ("coffee", "Лате Сенсей", 75),
    "cappuccino-katana": ("coffee", "Капучино Катана", 70),
    "raf-kavabanga": ("coffee", "Раф Кавабанга", 85),
    "green-ninja-tea": ("tea", "Зелений Ніндзя", 49),
    "berry-splinter-tea": ("tea", "Ягідний Сплінтер", 55),
    "ginger-raphael-tea": ("tea", "Імбирний Рафаель", 55),
}

app = Flask(__name__, static_folder=None)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_schema() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS orders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL DEFAULT 0,
              code TEXT UNIQUE NOT NULL,
              subtotal INTEGER NOT NULL,
              points_used INTEGER NOT NULL DEFAULT 0,
              points_earned INTEGER NOT NULL DEFAULT 0,
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
            """
        )
        cols = {row["name"] for row in conn.execute("PRAGMA table_info(orders)").fetchall()}
        if "customer_name" not in cols:
            conn.execute("ALTER TABLE orders ADD COLUMN customer_name TEXT NOT NULL DEFAULT 'Гість'")
        if "status" not in cols:
            conn.execute("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'Нове'")
        if "order_method" not in cols:
            conn.execute("ALTER TABLE orders ADD COLUMN order_method TEXT NOT NULL DEFAULT 'pickup'")
        if "delivery_address" not in cols:
            conn.execute("ALTER TABLE orders ADD COLUMN delivery_address TEXT")


def gen_code(conn: sqlite3.Connection) -> str:
    while True:
        code = str(random.randint(100000, 999999))
        exists = conn.execute("SELECT 1 FROM orders WHERE code = ?", (code,)).fetchone()
        if not exists:
            return code


def order_items(conn: sqlite3.Connection, order_id: int) -> list[dict]:
    return [
        {
            "id": row["product_id"],
            "title": row["title"],
            "type": row["item_type"],
            "price": row["price"],
            "qty": row["qty"],
        }
        for row in conn.execute(
            "SELECT product_id, title, item_type, price, qty FROM order_items WHERE order_id = ?",
            (order_id,),
        ).fetchall()
    ]


def order_payload(conn: sqlite3.Connection, order: sqlite3.Row) -> dict:
    items = order_items(conn, order["id"])
    order_method = order["order_method"] if "order_method" in order.keys() else "pickup"
    delivery_address = order["delivery_address"] if "delivery_address" in order.keys() and order["delivery_address"] else ""
    return {
        "id": order["id"],
        "code": order["code"],
        "subtotal": order["subtotal"],
        "pointsUsed": order["points_used"],
        "pointsEarned": order["points_earned"],
        "total": order["total"],
        "status": order["status"],
        "customerName": order["customer_name"],
        "orderMethod": order_method,
        "orderMethodLabel": order_method_label(order_method),
        "deliveryAddress": delivery_address,
        "createdAt": order["created_at"],
        "items": items,
    }


def clean_order_method(raw: object) -> str:
    method = str(raw or "").strip()
    return method if method in {"dine-in", "pickup", "courier"} else "pickup"


def order_method_label(method: str) -> str:
    if method == "dine-in":
        return "В закладі"
    if method == "courier":
        return "Кур'єр"
    return "Самовивіз"


def clean_delivery_address(raw: object) -> str:
    return " ".join(str(raw or "").strip().split())[:120]


def item_summary(conn: sqlite3.Connection, order_id: int) -> str:
    rows = conn.execute("SELECT title, qty FROM order_items WHERE order_id = ?", (order_id,)).fetchall()
    return ", ".join(f"{row['title']} x{row['qty']}" for row in rows)


@app.after_request
def add_headers(response):
    response.headers["Cache-Control"] = "no-store"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/health")
def health():
    return jsonify(ok=True)


@app.route("/orders/checkout", methods=["POST", "OPTIONS"])
def checkout():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(silent=True) or {}
    raw_items = body.get("items", [])
    customer_name = " ".join(str(body.get("customerName", "")).strip().split())[:60] or "Гість"
    order_method = clean_order_method(body.get("orderMethod"))
    delivery_address = clean_delivery_address(body.get("deliveryAddress"))
    items = []
    for item in raw_items if isinstance(raw_items, list) else []:
        try:
            qty = min(20, max(0, int(item.get("qty", 0))))
        except (TypeError, ValueError):
            continue
        product_id = str(item.get("id", "")).strip()
        product = PRODUCT_CATALOG.get(product_id)
        if product and qty > 0:
            item_type, title, price = product
            items.append({"id": product_id, "title": title, "type": item_type, "price": price, "qty": qty})

    if not items:
        return jsonify(ok=False, error="invalid_items"), 400
    if order_method == "courier" and len(delivery_address) < 5:
        return jsonify(ok=False, error="invalid_delivery_address"), 400

    subtotal = sum(item["price"] * item["qty"] for item in items)
    created_at = now_iso()

    with db() as conn:
        code = gen_code(conn)
        cur = conn.execute(
            """
            INSERT INTO orders (user_id, code, subtotal, points_used, points_earned, total, created_at, customer_name, status, order_method, delivery_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (0, code, subtotal, 0, 0, subtotal, created_at, customer_name, "Нове", order_method, delivery_address or None),
        )
        order_id = cur.lastrowid
        conn.executemany(
            """
            INSERT INTO order_items (order_id, product_id, title, item_type, price, qty)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [(order_id, item["id"], item["title"], item["type"], item["price"], item["qty"]) for item in items],
        )
        order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        return jsonify(ok=True, order=order_payload(conn, order))


@app.route("/orders/by-code/<code>")
def order_by_code(code: str):
    clean_code = "".join(ch for ch in code if ch.isdigit())[:6]
    with db() as conn:
        order = conn.execute("SELECT * FROM orders WHERE code = ?", (clean_code,)).fetchone()
        if not order:
            return jsonify(ok=False, error="not_found"), 404
        return jsonify(ok=True, order=order_payload(conn, order))


@app.route("/orders")
def orders():
    with db() as conn:
        rows = conn.execute("SELECT * FROM orders ORDER BY id DESC LIMIT 100").fetchall()
        return jsonify(ok=True, orders=[order_payload(conn, row) for row in rows])


@app.route("/orders/<int:order_id>/accept", methods=["POST", "OPTIONS"])
def accept_order(order_id: int):
    if request.method == "OPTIONS":
        return ("", 204)
    with db() as conn:
        conn.execute("UPDATE orders SET status = ? WHERE id = ?", ("Прийнято кухнею", order_id))
        order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if not order:
            return jsonify(ok=False, error="not_found"), 404
        return jsonify(ok=True, order=order_payload(conn, order))


@app.route("/orders/<int:order_id>/cancel", methods=["POST", "OPTIONS"])
def cancel_order(order_id: int):
    if request.method == "OPTIONS":
        return ("", 204)
    with db() as conn:
        conn.execute("UPDATE orders SET status = ? WHERE id = ?", ("Скасовано", order_id))
        order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if not order:
            return jsonify(ok=False, error="not_found"), 404
        return jsonify(ok=True, order=order_payload(conn, order))


@app.route("/orders/<int:order_id>/issued", methods=["POST", "OPTIONS"])
def issued_order(order_id: int):
    if request.method == "OPTIONS":
        return ("", 204)
    with db() as conn:
        conn.execute("UPDATE orders SET status = ? WHERE id = ?", ("Видано", order_id))
        order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if not order:
            return jsonify(ok=False, error="not_found"), 404
        return jsonify(ok=True, order=order_payload(conn, order))


@app.route("/orders/<int:order_id>/delete", methods=["POST", "DELETE", "OPTIONS"])
def delete_order(order_id: int):
    if request.method == "OPTIONS":
        return ("", 204)
    with db() as conn:
        order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if not order:
            return jsonify(ok=False, error="not_found"), 404
        if order["status"] == "Нове":
            return jsonify(ok=False, error="active_order"), 409
        conn.execute("DELETE FROM order_items WHERE order_id = ?", (order_id,))
        conn.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        return jsonify(ok=True, deletedId=order_id)


@app.route("/kitchen/orders.tsv")
def kitchen_orders_tsv():
    with db() as conn:
        rows = conn.execute("SELECT * FROM orders ORDER BY id DESC LIMIT 100").fetchall()
        lines = ["id\tcode\tcustomer\tmethod\taddress\tstatus\ttotal\tcreated\titems"]
        for row in rows:
            values = [
                row["id"],
                row["code"],
                row["customer_name"],
                order_method_label(row["order_method"] if "order_method" in row.keys() else "pickup"),
                row["delivery_address"] if "delivery_address" in row.keys() and row["delivery_address"] else "",
                row["status"],
                row["total"],
                row["created_at"],
                item_summary(conn, row["id"]),
            ]
            lines.append("\t".join(str(value).replace("\t", " ").replace("\n", " ") for value in values))
        return app.response_class("\n".join(lines), mimetype="text/plain; charset=utf-8")


@app.route("/kitchen/orders/<int:order_id>/accept", methods=["POST", "OPTIONS"])
def kitchen_accept_order(order_id: int):
    return accept_order(order_id)


@app.route("/kitchen/orders/<int:order_id>/cancel", methods=["POST", "OPTIONS"])
def kitchen_cancel_order(order_id: int):
    return cancel_order(order_id)


@app.route("/kitchen/orders/<int:order_id>/issued", methods=["POST", "OPTIONS"])
def kitchen_issued_order(order_id: int):
    return issued_order(order_id)


@app.route("/kitchen/orders/<int:order_id>/delete", methods=["POST", "DELETE", "OPTIONS"])
def kitchen_delete_order(order_id: int):
    return delete_order(order_id)


@app.route("/kitchen/report.tsv")
def kitchen_report_tsv():
    raw_date = str(request.args.get("date", "")).strip()
    report_date = raw_date if len(raw_date) == 10 else datetime.now(timezone.utc).date().isoformat()
    with db() as conn:
        orders = conn.execute(
            "SELECT * FROM orders WHERE substr(created_at, 1, 10) = ? ORDER BY id DESC",
            (report_date,),
        ).fetchall()
        total_orders = len(orders)
        total_revenue = sum(int(row["total"] or 0) for row in orders if "Скас" not in str(row["status"]))
        total_items = 0
        product_rows = conn.execute(
            """
            SELECT oi.title, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price) AS total
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE substr(o.created_at, 1, 10) = ? AND o.status NOT LIKE '%Скас%'
            GROUP BY oi.title
            ORDER BY qty DESC, total DESC
            """,
            (report_date,),
        ).fetchall()
        total_items = sum(int(row["qty"] or 0) for row in product_rows)
        lines = [
            "section\tname\tqty\ttotal",
            f"summary\torders\t{total_orders}\t{total_revenue}",
            f"summary\titems\t{total_items}\t{total_revenue}",
        ]
        for row in product_rows:
            values = ["product", row["title"], row["qty"], row["total"]]
            lines.append("\t".join(str(value).replace("\t", " ").replace("\n", " ") for value in values))
        return app.response_class("\n".join(lines), mimetype="text/plain; charset=utf-8")


@app.route("/receipt/<code>")
def receipt(code: str):
    clean_code = "".join(ch for ch in code if ch.isdigit())[:6]
    with db() as conn:
        order = conn.execute("SELECT * FROM orders WHERE code = ?", (clean_code,)).fetchone()
        if not order:
            return app.response_class("<h1>Чек не знайдено</h1>", status=404, mimetype="text/html; charset=utf-8")
        payload = order_payload(conn, order)
    created = str(payload["createdAt"]).replace("T", " ").replace("Z", "")
    items_html = "".join(
        f"""
        <div class="line item">
          <div class="item-name">{escape(item['title'])}</div>
          <div class="item-meta">{item['qty']} x {item['price']} грн</div>
          <div class="item-sum">{item['price'] * item['qty']} грн</div>
        </div>
        """
        for item in payload["items"]
    )
    qr_seed = payload["code"] + str(payload["total"]) + payload["customerName"]
    qr_cells = "".join(
        f"<i class=\"{'on' if (ord(qr_seed[i % len(qr_seed)]) + i * 7) % 5 in (0, 2, 3) else ''}\"></i>"
        for i in range(121)
    )
    html = f"""<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Чек {escape(payload['code'])} - Pizza Kavabanga</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin:0;
      min-height:100vh;
      font-family: "Courier New", ui-monospace, monospace;
      color:#101010;
      background:
        radial-gradient(900px 520px at 78% 12%, rgba(255,122,24,.22), transparent 62%),
        radial-gradient(760px 500px at 16% 18%, rgba(49,210,111,.14), transparent 64%),
        #070b10;
      padding:28px 14px;
    }}
    .toolbar {{
      width:min(420px, 100%);
      margin:0 auto 14px;
      display:flex;
      gap:8px;
      justify-content:center;
    }}
    .toolbar button,
    .toolbar a {{
      border:1px solid rgba(255,255,255,.16);
      border-radius:8px;
      padding:10px 12px;
      color:#fff;
      background:rgba(255,255,255,.08);
      font:800 13px Montserrat, Arial, sans-serif;
      text-decoration:none;
      cursor:pointer;
    }}
    .toolbar button:first-child {{
      background:linear-gradient(135deg, #ff7a18, #31d26f);
      color:#071015;
      border-color:transparent;
    }}
    .paper {{
      position:relative;
      width:min(420px, 100%);
      margin:0 auto;
      padding:18px 18px 20px;
      background:#fffdf3;
      box-shadow:0 28px 80px rgba(0,0,0,.55);
      border-radius:4px;
    }}
    .paper::before,
    .paper::after {{
      content:"";
      position:absolute;
      left:0;
      right:0;
      height:12px;
      background:repeating-linear-gradient(90deg, transparent 0 10px, #070b10 10px 18px);
    }}
    .paper::before {{ top:-1px; }}
    .paper::after {{ bottom:-1px; transform:rotate(180deg); }}
    .brand {{
      text-align:center;
      padding:10px 0 12px;
      border-bottom:1px dashed #222;
    }}
    .brand h1 {{
      margin:0;
      font:900 26px Montserrat, Arial, sans-serif;
      letter-spacing:.04em;
    }}
    .brand p,
    .muted {{
      margin:5px 0 0;
      color:#4d4d4d;
      font-size:12px;
      font-weight:700;
    }}
    .code {{
      margin-top:8px;
      display:inline-block;
      padding:6px 9px;
      border:2px solid #111;
      font-size:26px;
      font-weight:900;
      letter-spacing:.12em;
    }}
    .section {{
      padding:12px 0;
      border-bottom:1px dashed #222;
    }}
    .row,
    .line {{
      display:grid;
      grid-template-columns:1fr auto;
      gap:10px;
      align-items:start;
      margin:6px 0;
      font-size:13px;
      font-weight:700;
    }}
    .item {{
      grid-template-columns:1fr auto;
      padding:8px 0;
      border-bottom:1px dotted #aaa;
    }}
    .item-name {{
      grid-column:1 / -1;
      font-weight:900;
      line-height:1.25;
    }}
    .item-meta {{
      color:#555;
      font-size:12px;
    }}
    .item-sum {{
      text-align:right;
      font-weight:900;
    }}
    .total {{
      display:grid;
      grid-template-columns:1fr auto;
      gap:10px;
      align-items:center;
      padding:12px 0 4px;
      font:900 24px Montserrat, Arial, sans-serif;
    }}
    .status {{
      display:inline-block;
      margin-top:8px;
      padding:5px 8px;
      border:1px solid #111;
      font-weight:900;
      text-transform:uppercase;
      font-size:12px;
    }}
    .qr-wrap {{
      display:grid;
      justify-items:center;
      gap:8px;
      padding-top:14px;
    }}
    .qr {{
      width:132px;
      height:132px;
      display:grid;
      grid-template-columns:repeat(11, 1fr);
      grid-template-rows:repeat(11, 1fr);
      gap:2px;
      padding:8px;
      background:#fff;
      border:2px solid #111;
    }}
    .qr i {{
      display:block;
      background:#fff;
    }}
    .qr i.on {{
      background:#111;
    }}
    .thanks {{
      text-align:center;
      font-weight:900;
      padding-top:12px;
    }}
    @media print {{
      body {{ background:#fff; padding:0; }}
      .toolbar {{ display:none; }}
      .paper {{ box-shadow:none; width:80mm; border-radius:0; }}
      .paper::before,
      .paper::after {{ display:none; }}
    }}
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Друкувати чек</button>
    <a href="/pickup.html?code={escape(payload['code'])}">До замовлення</a>
  </div>
  <main class="paper">
    <div class="brand">
      <h1>PIZZA KAVABANGA</h1>
      <p>м. Черкаси, бульвар Шевченка 249</p>
      <p>ФОП Kavabanga Pizza · Самовивіз</p>
      <div class="code">{escape(payload['code'])}</div>
    </div>
    <section class="section">
      <div class="row"><span>Чек</span><strong>#{escape(payload['code'])}</strong></div>
      <div class="row"><span>Дата</span><strong>{escape(created)}</strong></div>
      <div class="row"><span>Клієнт</span><strong>{escape(payload['customerName'])}</strong></div>
      <div class="row"><span>Тип</span><strong>Самовивіз</strong></div>
      <span class="status">{escape(payload['status'])}</span>
    </section>
    <section class="section">
      {items_html}
      <div class="total"><span>РАЗОМ</span><span>{payload['total']} грн</span></div>
    </section>
    <section class="section">
      <div class="row"><span>Оплата</span><strong>При отриманні</strong></div>
      <div class="row"><span>Код видачі</span><strong>{escape(payload['code'])}</strong></div>
      <p class="muted">Покажи цей чек або назви код на видачі.</p>
    </section>
    <div class="qr-wrap">
      <div class="qr" aria-label="Код чека">{qr_cells}</div>
      <div class="muted">receipt/{escape(payload['code'])}</div>
    </div>
    <div class="thanks">Дякуємо за замовлення!</div>
  </main>
</body>
</html>"""
    return app.response_class(html, mimetype="text/html; charset=utf-8")


@app.route("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.route("/<path:path>")
def static_files(path: str):
    blocked_roots = {"server", "node_modules", "java", "__pycache__"}
    first_part = Path(path).parts[0] if Path(path).parts else ""
    if first_part in blocked_roots or Path(path).name.startswith("."):
        return app.response_class("Not found", status=404, mimetype="text/plain")
    target = ROOT / path
    if target.is_file():
        return send_from_directory(ROOT, path)
    return send_from_directory(ROOT, "index.html")


if __name__ == "__main__":
    ensure_schema()
    app.run(host="127.0.0.1", port=5000, debug=False)
