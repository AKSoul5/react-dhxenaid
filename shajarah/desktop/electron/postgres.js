// The app's own PostgreSQL: binaries from @embedded-postgres/<platform>, a
// data folder in the user's profile, started and stopped with pg_ctl (which
// also drops administrator rights on Windows, as PostgreSQL requires).

const { execFile } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const EXE = process.platform === "win32" ? ".exe" : "";
const PLATFORM = { win32: "windows", linux: "linux", darwin: "darwin" }[process.platform];

function binDir() {
  return path.join(__dirname, "node_modules", "@embedded-postgres", `${PLATFORM}-${process.arch}`, "native", "bin");
}

function run(file, args, log) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout: 120000 }, (err, stdout, stderr) => {
      fs.appendFileSync(log, `$ ${path.basename(file)} ${args.join(" ")}\n${stdout}${stderr}\n`);
      if (err) reject(new Error(`${path.basename(file)} failed: ${stderr || err.message}`));
      else resolve(stdout);
    });
  });
}

class Database {
  /** dataDir holds the cluster; logDir the PostgreSQL logs. */
  constructor(dataDir, logDir) {
    this.dataDir = dataDir;
    this.cluster = path.join(dataDir, "cluster");
    this.passwordFile = path.join(dataDir, "password");
    this.log = path.join(logDir, "postgres-tools.log");
    this.serverLog = path.join(logDir, "postgres.log");
    this.bin = binDir();
    this.user = "shajarah";
    this.name = "shajarah";
  }

  async init() {
    if (fs.existsSync(path.join(this.cluster, "PG_VERSION"))) return;
    fs.mkdirSync(this.dataDir, { recursive: true });
    // a folder left over from a failed first start would make initdb refuse
    fs.rmSync(this.cluster, { recursive: true, force: true });
    fs.writeFileSync(this.passwordFile, crypto.randomBytes(24).toString("hex"), { mode: 0o600 });
    await run(path.join(this.bin, `initdb${EXE}`), [
      "-D", this.cluster, "-U", this.user, `--pwfile=${this.passwordFile}`,
      "-A", "scram-sha-256", "-E", "UTF8", "--locale=C",
    ], this.log);
    // local connections only, and no Unix socket folder to need
    fs.appendFileSync(path.join(this.cluster, "postgresql.conf"),
      "\nlisten_addresses = '127.0.0.1'\nunix_socket_directories = ''\n");
  }

  async start(port) {
    this.port = port;
    await run(path.join(this.bin, `pg_ctl${EXE}`), [
      "start", "-D", this.cluster, "-l", this.serverLog, "-w", "-t", "60", "-o", `-p ${port}`,
    ], this.log);
    const password = fs.readFileSync(this.passwordFile, "utf8").trim();
    this.url = `postgresql://${this.user}:${password}@127.0.0.1:${port}/${this.name}?schema=public`;
    const admin = new Client({ host: "127.0.0.1", port, user: this.user, password, database: "postgres" });
    await admin.connect();
    try {
      const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [this.name]);
      if (!rowCount) await admin.query(`CREATE DATABASE "${this.name}"`);
    } finally {
      await admin.end();
    }
  }

  async stop() {
    if (!this.port) return;
    this.port = undefined;
    await run(path.join(this.bin, `pg_ctl${EXE}`), ["stop", "-D", this.cluster, "-m", "fast", "-w", "-t", "30"], this.log)
      .catch(() => {});
  }
}

module.exports = { Database };
