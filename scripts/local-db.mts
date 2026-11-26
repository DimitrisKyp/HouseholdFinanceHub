// Runs a private PostgreSQL server for this project, stored in your user folder.
// No admin rights needed; it uses the PostgreSQL programs already installed on the PC
// but is completely separate from any PostgreSQL service installed by IT.
//
//   npm run db:init     one-time setup: create the server, the `app` user and the database,
//                       and write DATABASE_URL to .env.local
//   npm run db:start    start the server (needed after each reboot)
//   npm run db:stop     stop the server
//   npm run db:status   show whether it is running
//   npm run db:init-test  create a separate database for the browser tests (npm run test:e2e)
//                         and write TEST_DATABASE_URL to .env.local
//
// Override locations with env vars PG_BIN (PostgreSQL bin folder) and LOCAL_DB_DIR.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = 5433;
const DB_NAME = "household_hub";
const TEST_DB_NAME = "household_hub_test";
const DB_USER = "app";

const PG_BIN = process.env.PG_BIN ?? "C:\\Program Files\\PostgreSQL\\17\\bin";
const ROOT = process.env.LOCAL_DB_DIR ?? path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), ".local"), "household-hub");
const DATA_DIR = path.join(ROOT, "pgdata");
const LOG_FILE = path.join(ROOT, "postgres.log");
const SUPERUSER_PW_FILE = path.join(ROOT, "postgres-superuser-password.txt");
const ENV_FILE = path.join(process.cwd(), ".env.local");

const exe = (name: string) => path.join(PG_BIN, process.platform === "win32" ? `${name}.exe` : name);

function run(name: string, args: string[], { quiet = false, env }: { quiet?: boolean; env?: Record<string, string | undefined> } = {}) {
  const result = spawnSync(exe(name), args, {
    // "ignore" matters for pg_ctl start: the server inherits stdio and would otherwise
    // keep our pipes open forever.
    stdio: quiet ? "ignore" : "inherit",
    env: { ...process.env, ...env },
  });
  if (result.error) throw result.error;
  return result.status;
}

const isRunning = () => run("pg_ctl", ["status", "-D", DATA_DIR], { quiet: true }) === 0;

function start() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error("No local database yet. Run: npm run db:init");
    process.exit(1);
  }
  if (isRunning()) return console.log(`Local PostgreSQL already running on port ${PORT}.`);
  const status = run("pg_ctl", ["start", "-D", DATA_DIR, "-l", LOG_FILE, "-w"], { quiet: true });
  if (status !== 0) {
    console.error(`Failed to start. See log: ${LOG_FILE}`);
    process.exit(1);
  }
  console.log(`Local PostgreSQL started on port ${PORT}.`);
}

function stop() {
  if (!isRunning()) return console.log("Local PostgreSQL is not running.");
  run("pg_ctl", ["stop", "-D", DATA_DIR, "-m", "fast", "-w"], { quiet: true });
  console.log("Local PostgreSQL stopped.");
}

function readEnvValue(key: string) {
  if (!fs.existsSync(ENV_FILE)) return null;
  const line = fs
    .readFileSync(ENV_FILE, "utf8")
    .split(/\r?\n/)
    .find(l => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1) : null;
}

function writeEnvValue(key: string, value: string) {
  const lines = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/) : [];
  const i = lines.findIndex(l => l.startsWith(`${key}=`));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else lines.unshift(`${key}=${value}`);
  fs.writeFileSync(ENV_FILE, lines.filter((l, idx) => l || idx < lines.length - 1).join("\n") + "\n");
}

function init() {
  if (fs.existsSync(DATA_DIR)) {
    console.error(`A local database already exists at ${DATA_DIR}. Nothing to do.`);
    process.exit(1);
  }
  fs.mkdirSync(ROOT, { recursive: true });

  // Hex passwords: letters and digits only, so they never need URL-encoding.
  const superuserPassword = randomBytes(18).toString("hex");
  const appPassword = randomBytes(18).toString("hex");
  fs.writeFileSync(SUPERUSER_PW_FILE, superuserPassword + "\n");

  console.log(`Creating local PostgreSQL in ${DATA_DIR} ...`);
  const status = run(
    "initdb",
    [
      "-D",
      DATA_DIR,
      "-U",
      "postgres",
      `--pwfile=${SUPERUSER_PW_FILE}`,
      "--auth=scram-sha-256",
      "--encoding=UTF8",
      "--lc-messages=C", // English server messages
    ],
    { quiet: true },
  );
  if (status !== 0) throw new Error("initdb failed");

  // Listen only on this machine, on our own port.
  fs.appendFileSync(path.join(DATA_DIR, "postgresql.conf"), `\n# household-hub\nport = ${PORT}\nlisten_addresses = 'localhost'\n`);

  start();

  const asSuperuser = (sql: string) =>
    run("psql", ["-h", "localhost", "-p", String(PORT), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-c", sql], {
      env: { PGPASSWORD: superuserPassword },
    });

  if (
    asSuperuser(`CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${appPassword}'`) !== 0 ||
    asSuperuser(`CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}`) !== 0
  ) {
    throw new Error("Creating the app user/database failed");
  }

  writeEnvValue("DATABASE_URL", `postgres://${DB_USER}:${appPassword}@localhost:${PORT}/${DB_NAME}`);

  console.log(`
Done.
  Database:            ${DB_NAME} on localhost:${PORT}
  App user:            ${DB_USER} (password saved in .env.local as DATABASE_URL)
  Admin user:          postgres (password saved in ${SUPERUSER_PW_FILE})
Next: npm run db:migrate`);
}

// A second, empty database on the same server for the browser tests. They wipe it freely,
// so they never touch the data in the main database.
function initTest() {
  if (!isRunning()) {
    console.error("Local PostgreSQL is not running. Run: npm run db:start");
    process.exit(1);
  }
  const appUrl = readEnvValue("DATABASE_URL");
  if (!appUrl || !fs.existsSync(SUPERUSER_PW_FILE)) {
    console.error("No local database set up yet. Run: npm run db:init");
    process.exit(1);
  }
  const testUrl = new URL(appUrl);
  testUrl.pathname = `/${TEST_DB_NAME}`;

  const env = { PGPASSWORD: fs.readFileSync(SUPERUSER_PW_FILE, "utf8").trim() };
  const admin = ["-h", "localhost", "-p", String(PORT), "-U", "postgres", "-d", "postgres"];
  const exists = spawnSync(exe("psql"), [...admin, "-tAc", `SELECT 1 FROM pg_database WHERE datname = '${TEST_DB_NAME}'`], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  if (exists.status !== 0) throw new Error("Could not connect as the admin user");
  if (exists.stdout.trim() !== "1") {
    const status = run("psql", [...admin, "-v", "ON_ERROR_STOP=1", "-q", "-c", `CREATE DATABASE ${TEST_DB_NAME} OWNER ${DB_USER}`], {
      env,
    });
    if (status !== 0) throw new Error("Creating the test database failed");
  }
  writeEnvValue("TEST_DATABASE_URL", testUrl.toString());
  console.log(`Test database ${TEST_DB_NAME} is ready (TEST_DATABASE_URL in .env.local). Run: npm run test:e2e`);
}

const commands: Record<string, () => void> = {
  init,
  "init-test": initTest,
  start,
  stop,
  status: () => console.log(isRunning() ? `Running on port ${PORT} (${DATA_DIR})` : "Not running."),
};

// Object.hasOwn: only our own commands, not inherited names like "toString".
const name = process.argv[2] ?? "";
const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
if (!command) {
  console.error(`Usage: node scripts/local-db.mts <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}
command();
