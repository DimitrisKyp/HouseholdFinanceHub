"use client";

// Reports Core Web Vitals (LCP, INP, CLS, FCP, TTFB) for each page to our own server.
import { useReportWebVitals } from "next/web-vitals";
import { sendEvent } from "@/lib/telemetry-client";

export default function WebVitals() {
  useReportWebVitals(metric => sendEvent({ type: "web_vital", name: metric.name, value: metric.value, rating: metric.rating }));
  return null;
}
