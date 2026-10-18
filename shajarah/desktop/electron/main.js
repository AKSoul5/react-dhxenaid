// Shajarah as a desktop program: starts the app's own database and the app
// server in the background, and shows the app in a window. Closing the
// window stops both. Everything is kept in the user's profile
// (%APPDATA%\Shajarah on Windows): the database, and logs.
//
// `Shajarah --smoke-test` starts everything without a window, checks that
// the app answers and can save a family, prints the result and exits
// (0 = all good); the installer build runs it on a real Windows machine.

const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { Database } = require("./postgres");
const { migrate } = require("./migrate");

const SMOKE = process.argv.includes("--smoke-test");
const userData = app.getPath("userData");
const logDir = path.join(userData, "logs");
fs.mkdirSync(logDir, { recursive: true });
const mainLog = path.join(logDir, "shajarah.log");
const log = (msg) => fs.appendFileSync(mainLog, `${new Date().toISOString()} ${msg}\n`);

const resources = app.isPackaged ? process.resourcesPath : __dirname;
const serverDir = path.join(resources, "server");
const migrationsDir = path.join(resources, "migrations");
const iconPath = path.join(__dirname, "build", process.platform === "win32" ? "icon.ico" : "icon.png");

const db = new Database(path.join(userData, "database"), logDir);
let server = null;
let appUrl = null;

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function get(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", () => resolve(0));
    req.setTimeout(5000, () => req.destroy());
  });
}

async function waitFor(url, seconds) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const status = await get(url);
    if (status && status < 500) return true;
    if (server && server.exitCode !== null) return false;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function startServer() {
  const port = await freePort();
  const out = fs.openSync(path.join(logDir, "server.log"), "a");
  // Electron's own binary runs the Next.js server as plain Node.
  server = spawn(process.execPath, [path.join(serverDir, "server.js")], {
    cwd: serverDir,
    env: {
      ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production",
      PORT: String(port), HOSTNAME: "127.0.0.1", DATABASE_URL: db.url,
    },
    stdio: ["ignore", out, out],
    windowsHide: true,
  });
  appUrl = `http://127.0.0.1:${port}`;
  if (!(await waitFor(appUrl, 90))) throw new Error("The app server did not start.");
}

let startupSeconds = null;
async function start() {
  const t0 = Date.now();
  const step = (what) => log(`${what} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  log("starting");
  await db.init();
  step("database ready on disk");
  await db.start(await freePort());
  step("database started");
  const applied = await migrate(db.url, migrationsDir);
  step(applied.length ? `migrations applied: ${applied.join(", ")}` : "database up to date");
  await startServer();
  startupSeconds = (Date.now() - t0) / 1000;
  step(`ready at ${appUrl}`);
}

let stopping = null;
let stopped = false;
function stop() {
  stopping ??= (async () => {
    if (server && server.exitCode === null) {
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], { windowsHide: true });
      else server.kill();
    }
    await db.stop();
    stopped = true;
    log("stopped");
  })();
  return stopping;
}

function splashWindow() {
  const w = new BrowserWindow({
    width: 360, height: 140, frame: false, resizable: false, show: false, icon: iconPath,
    backgroundColor: "#f6efe0",
  });
  w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`<!doctype html><meta charset="utf-8">
    <body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
      font:600 18px 'Segoe UI',sans-serif;color:#5b3a1d;background:#f6efe0">Starting Shajarah…</body>`));
  w.once("ready-to-show", () => w.show());
  return w;
}

function mainWindow() {
  const w = new BrowserWindow({
    width: 1400, height: 900, show: false, icon: iconPath, title: "Shajarah",
    autoHideMenuBar: true, backgroundColor: "#f6efe0",
  });
  // Photos and documents open in a window of their own; other links in the browser.
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(appUrl) || url.startsWith("data:")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
  w.loadURL(appUrl);
  w.once("ready-to-show", () => w.show());
  return w;
}

async function smokeTest() {
  const results = { startupSeconds };
  results.home = await get(appUrl);
  results.demo = await get(`${appUrl}/demo?sample=nouri`);
  const created = await fetch(`${appUrl}/api/trees`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Smoke test family" }),
  });
  results.createTree = created.status;
  const tree = await created.json().catch(() => ({}));
  results.readTree = tree.id ? (await fetch(`${appUrl}/api/trees/${tree.id}`)).status : 0;
  if (tree.id) results.deleteTree = (await fetch(`${appUrl}/api/trees/${tree.id}`, { method: "DELETE" })).status;
  const ok = results.home === 200 && results.demo === 200 && results.createTree === 201 && results.readTree === 200;
  return { ok, results };
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) {
      if (w.isMinimized()) w.restore();
      w.focus();
    }
  });

  app.whenReady().then(async () => {
    const splash = SMOKE ? null : splashWindow();
    try {
      await start();
    } catch (err) {
      log(`failed: ${err.stack || err}`);
      splash?.destroy();
      if (SMOKE) console.error(`SMOKE FAIL ${err.message}`);
      else dialog.showErrorBox("Shajarah could not start", `${err.message}\n\nDetails are in ${logDir}`);
      await stop();
      app.exit(1);
      return;
    }
    if (SMOKE) {
      const { ok, results } = await smokeTest().catch((err) => ({ ok: false, results: { error: String(err) } }));
      const line = `SMOKE ${ok ? "PASS" : "FAIL"} ${JSON.stringify(results)}`;
      console.log(line);
      log(line);
      fs.writeFileSync(path.join(logDir, "smoke-test.txt"), line + "\n");
      await stop();
      app.exit(ok ? 0 : 1);
      return;
    }
    mainWindow();
    splash.destroy();
  });

  app.on("window-all-closed", () => app.quit());
  // Stop the server and the database before the program ends.
  app.on("will-quit", (event) => {
    if (stopped) return;
    event.preventDefault();
    stop().finally(() => app.exit(0));
  });
}
