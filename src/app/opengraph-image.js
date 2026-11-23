// The preview image shown when a link to the app is shared (Open Graph / social cards).
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: shared budgets, expenses and savings goals`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BARS = [38, 52, 44, 66, 58, 80];

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        padding: "72px",
        background: "radial-gradient(circle at top, #1e293b 0%, #0f172a 45%, #020617 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
        <div style={{ fontSize: 28, letterSpacing: 10, color: "#67e8f9", textTransform: "uppercase" }}>{SITE_NAME}</div>
        <div style={{ marginTop: 24, fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>Plan the household budget together.</div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#cbd5e1" }}>Expenses, bills, savings goals and forecasts in one place.</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 360 }}>
        {BARS.map((value, index) => (
          <div
            key={index}
            style={{ width: 44, height: `${value}%`, borderRadius: 8, background: index === BARS.length - 1 ? "#34d399" : "#3987e5" }}
          />
        ))}
      </div>
    </div>,
    size,
  );
}
