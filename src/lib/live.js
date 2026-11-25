// Live updates between people in the same household, over PostgreSQL LISTEN/NOTIFY.
//
// publish() runs `pg_notify` with a small JSON event. Inside a transaction, PostgreSQL only delivers
// it after COMMIT, so nobody hears about a change that was rolled back. Each app server keeps one
// listening connection and hands events to the browsers connected to it (/api/events, Server-Sent
// Events). Because the database does the fan-out, this also works with several app servers.
import "server-only";
import { sql } from "drizzle-orm";
import { Client } from "pg";
import { db } from "@/db";

const CHANNEL = "household_events";
const RECONNECT_MS = 2_000;

/** What changed. The browser refreshes the page's data for these. */
export const LIVE_KINDS = ["expenses", "budget", "goals", "members", "notifications", "reminders"];

/**
 * Announces a change to everyone connected in the household.
 * event: { householdId, kind, actorId?, message?, userIds? } — userIds limits who receives it
 * (used for notifications); message is a short sentence shown to the others ("Sam added Bakery (€30)"),
 * built with liveMessage() so each browser shows it in its own language.
 * executor: db, or a transaction to announce it only once that commits.
 */
export async function publish(event, executor = db) {
  try {
    await executor.execute(sql`select pg_notify(${CHANNEL}, ${JSON.stringify(event)})`);
  } catch (error) {
    // Inside a transaction, let the caller's error handling decide; elsewhere a missed live update
    // isn't worth failing the change for (the next page load shows it anyway).
    if (executor !== db) throw error;
    console.error("Publishing a live update failed", error);
  }
}

/**
 * A message for the other members' screens: a key under "live" in the common messages, and its
 * values. An { amount, currency } pair is shown as money in the reader's language, e.g.
 * liveMessage("expenseAdded", { name: "Sam", title: "Bakery", amount: 30, currency: "EUR" }).
 */
export const liveMessage = (key, params = {}) => ({ key, params });

/** publish() for a Server Action: the household and who made the change come from the DAL context. */
export const announce = (context, kind, message = null) =>
  publish({ householdId: context.householdId, kind, actorId: context.user.id, message });

// One listening connection and its subscribers per server process (kept across hot reloads).
const state = (globalThis.__liveUpdates ??= { client: null, connecting: null, listeners: new Map() });

async function connect() {
  // LISTEN needs a connection of its own for as long as it runs, which a connection pooler in
  // "transaction" mode doesn't give. If DATABASE_URL goes through one (e.g. Supabase's port 6543),
  // set LIVE_DATABASE_URL to a direct or "session" mode address (Supabase's port 5432).
  const client = new Client({ connectionString: process.env.LIVE_DATABASE_URL || process.env.DATABASE_URL });
  client.on("notification", message => {
    let event;
    try {
      event = JSON.parse(message.payload);
    } catch {
      return;
    }
    for (const listener of state.listeners.get(event.householdId) ?? []) listener(event);
  });
  const reconnect = () => {
    if (state.client !== client) return;
    state.client = null;
    client.end().catch(() => {});
    setTimeout(() => state.listeners.size && ensureListening().catch(() => {}), RECONNECT_MS);
  };
  client.on("error", reconnect);
  client.on("end", reconnect);
  await client.connect();
  await client.query(`LISTEN ${CHANNEL}`);
  state.client = client;
}

function ensureListening() {
  if (state.client) return Promise.resolve();
  state.connecting ??= connect().finally(() => {
    state.connecting = null;
  });
  return state.connecting;
}

/** Calls listener(event) for every event in the household until the returned function is called. */
export async function subscribe(householdId, listener) {
  if (!state.listeners.has(householdId)) state.listeners.set(householdId, new Set());
  state.listeners.get(householdId).add(listener);
  await ensureListening();
  return () => {
    const set = state.listeners.get(householdId);
    set?.delete(listener);
    if (set && !set.size) state.listeners.delete(householdId);
  };
}
