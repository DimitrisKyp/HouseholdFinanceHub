// Live updates for the signed-in user's household, as Server-Sent Events (see lib/live.ts).
// The browser keeps this open (EventSource reconnects by itself) and refreshes what it shows when
// something changes. Events are only names and short messages: the data itself is always loaded
// through the normal, permission-checked pages.
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { householdMember } from "@/db/schema";
import { getMembership, getSession } from "@/lib/dal";
import { subscribe, type LiveKind, type LiveMessage } from "@/lib/live";

async function stillMember(householdId: string, userId: string) {
  const [row] = await db
    .select({ id: householdMember.id })
    .from(householdMember)
    .where(and(eq(householdMember.householdId, householdId), eq(householdMember.userId, userId)));
  return Boolean(row);
}

const HEARTBEAT_MS = 25_000; // keeps proxies from closing an idle connection

// Serverless hosts (Vercel) end a request after a time limit; ask for the longest one. When it ends,
// the browser reconnects and catches up (hooks/useLiveUpdates.ts). `npm start` on a server ignores this.
export const maxDuration = 300;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Not signed in", { status: 401 });
  const membership = await getMembership(session.user.id);
  if (!membership) return new Response("No household", { status: 403 });
  const userId = session.user.id;

  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe = () => {};
  const close = () => {
    clearInterval(heartbeat);
    unsubscribe();
    try {
      controller?.close();
    } catch {
      // already closed
    }
  };
  const send = (text: string) => {
    try {
      controller?.enqueue(encoder.encode(text));
    } catch {
      close(); // the browser went away
    }
  };
  const sendChange = (data: { kind: LiveKind; mine: boolean; message: LiveMessage | null }) =>
    send(`event: change\ndata: ${JSON.stringify(data)}\n\n`);

  // Listen before answering: once the browser sees the connection open, no change is missed.
  unsubscribe = await subscribe(membership.householdId, async event => {
    if (event.userIds && !event.userIds.includes(userId)) return;
    // Someone removed from the household stops hearing about it straight away.
    if (event.kind === "members" && !(await stillMember(membership.householdId, userId))) {
      sendChange({ kind: "members", mine: false, message: null });
      close();
      return;
    }
    const { kind, actorId = null, message = null } = event;
    sendChange({ kind, mine: actorId === userId, message });
  });

  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController;
      send("retry: 5000\n\n");
      heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
      request.signal.addEventListener("abort", close);
    },
    cancel() {
      clearInterval(heartbeat);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tells nginx-style proxies not to buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
