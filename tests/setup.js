// Shared test setup: DOM matchers (toBeInTheDocument, ...) and cleanup between component tests.
// Components render in English, as they do for a visitor whose browser prefers English.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { setFallbackMessages } from "@/i18n/client";
import { MESSAGES } from "@/i18n/messages";

setFallbackMessages("en", MESSAGES.en);

afterEach(() => cleanup());
