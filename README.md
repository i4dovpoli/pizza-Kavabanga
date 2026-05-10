# Pizza Kavabanga

Site and order API for Pizza Kavabanga.

## Local Start

```bash
npm install
npm start
```

Open:

```text
http://localhost:3001
```

## Deploy With Render + GitHub Pages

1. Push this project to GitHub.
2. On Render, create a new Web Service from the same GitHub repo.
3. Use:

```text
Build Command: npm install
Start Command: npm start
```

4. After deploy, Render gives you a URL like:

```text
https://kavabanga-api.onrender.com
```

5. Put that URL into `js/config.js`:

```js
window.KAVABANGA_API_BASE = "https://kavabanga-api.onrender.com";
```

6. Enable GitHub Pages for the repo. The site will load from GitHub Pages, but orders will go to Render.

## Kitchen App

The Java kitchen app reads orders from the API.

Local API:

```bash
javac java/KitchenOrdersApp.java
java -cp java KitchenOrdersApp
```

Render API:

```bash
javac java/KitchenOrdersApp.java
java -Dkavabanga.api=https://kavabanga-api.onrender.com -cp java KitchenOrdersApp
```

You can also set an environment variable:

```bash
set KAVABANGA_API_BASE=https://kavabanga-api.onrender.com
java -cp java KitchenOrdersApp
```

## Important

Render Free may sleep after inactivity. The first order request after sleep can take a little longer.

SQLite on Render Free is OK for a demo. For real cafe use, move orders to a hosted database such as PostgreSQL.
