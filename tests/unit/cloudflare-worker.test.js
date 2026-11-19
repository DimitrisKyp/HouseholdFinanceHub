import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { APP_MARKER } from "../../deploy/cloudflare-worker.js";

const env = { TUNNEL_URL: "https://abc123-3000.euw.devtunnels.ms" };
const fromApp = (body, init = {}) => new Response(body, { ...init, headers: { [APP_MARKER]: "1", ...init.headers } });

afterEach(() => vi.unstubAllGlobals());

describe("Cloudflare Worker", () => {
  it("passes visits through to the app, with the public address and the visitor's IP", async () => {
    const fetchMock = vi.fn(async () => fromApp("hello", { headers: { "content-type": "text/html" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      new Request("https://nestestia.com/budget?month=2026-11", { headers: { "cf-connecting-ip": "203.0.113.7", cookie: "a=1" } }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello");
    const [target, init] = fetchMock.mock.calls[0];
    expect(target.toString()).toBe("https://abc123-3000.euw.devtunnels.ms/budget?month=2026-11");
    expect(init.redirect).toBe("manual");
    expect(init.headers.get("x-forwarded-host")).toBe("nestestia.com");
    expect(init.headers.get("x-forwarded-proto")).toBe("https");
    expect(init.headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(init.headers.get("x-tunnel-skip-antiphishing-page")).toBe("true");
    expect(init.headers.get("cookie")).toBe("a=1");
  });

  it("sends form posts through with their body", async () => {
    const fetchMock = vi.fn(async (_target, init) => fromApp(await new Response(init.body).text()));
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(new Request("https://nestestia.com/sign-in", { method: "POST", body: "email=a%40b.c" }), env);

    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(await response.text()).toBe("email=a%40b.c");
  });

  it("turns the tunnel's address in redirects back into the public one, and keeps cookies", async () => {
    vi.stubGlobal("fetch", async () =>
      fromApp(null, {
        status: 307,
        headers: { location: "https://abc123-3000.euw.devtunnels.ms/sign-in?next=%2Fgoals", "set-cookie": "session=x; Secure; HttpOnly" },
      }),
    );

    const response = await worker.fetch(new Request("https://nestestia.com/goals"), env);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://nestestia.com/sign-in?next=%2Fgoals");
    expect(response.headers.get("set-cookie")).toBe("session=x; Secure; HttpOnly");
  });

  it("leaves relative redirects alone", async () => {
    vi.stubGlobal("fetch", async () => fromApp(null, { status: 303, headers: { location: "/" } }));
    const response = await worker.fetch(new Request("https://nestestia.com/sign-in"), env);
    expect(response.headers.get("location")).toBe("/");
  });

  it.each([
    ["the PC can't be reached", () => Promise.reject(new TypeError("fetch failed"))],
    ["the tunnel answers with its own error page", async () => new Response("Tunnel not connected", { status: 502 })],
    ["the tunnel shows its warning page", async () => new Response("<html>developer tunnel</html>", { status: 200 })],
  ])("shows the offline page when %s", async (_case, fetchImpl) => {
    vi.stubGlobal("fetch", fetchImpl);

    const response = await worker.fetch(new Request("https://nestestia.com/"), env);

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const html = await response.text();
    expect(html).toContain("Currently offline");
    expect(html).toContain("Εκτός σύνδεσης");
  });

  it("shows the offline page when no tunnel address is set", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await worker.fetch(new Request("https://nestestia.com/"), {});
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends www to the bare domain", async () => {
    const response = await worker.fetch(new Request("https://www.nestestia.com/goals?x=1"), env);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://nestestia.com/goals?x=1");
  });
});
