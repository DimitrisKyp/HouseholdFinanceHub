// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDismiss } from "@/hooks/useDismiss";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { signalUnreadChanged } from "@/lib/unread-signal";

describe("useDismiss", () => {
  function Menu({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useDismiss(open, onDismiss, { containerRef: ref });
    return (
      <div>
        <div ref={ref}>inside</div>
        <p>outside</p>
      </div>
    );
  }

  it("closes on Escape and on a click outside, but not inside", () => {
    const onDismiss = vi.fn();
    render(<Menu open onDismiss={onDismiss} />);
    fireEvent.pointerDown(screen.getByText("inside"));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText("outside"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("does nothing while closed", () => {
    const onDismiss = vi.fn();
    render(<Menu open={false} onDismiss={onDismiss} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe("useUnreadCount", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("starts from the server's count, then asks again when told something arrived", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ unread: 2 }) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useUnreadCount(2, "/"));
    expect(result.current).toBe(2);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ unread: 5 }) });
    act(() => signalUnreadChanged());
    await waitFor(() => expect(result.current).toBe(5));
  });

  it("keeps the last count when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { result } = renderHook(() => useUnreadCount(3, "/"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current).toBe(3);
  });
});
