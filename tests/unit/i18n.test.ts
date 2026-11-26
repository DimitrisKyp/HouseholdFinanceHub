import { describe, expect, it } from "vitest";
import { LOCALES, negotiateLocale } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";
import type { Namespace } from "@/i18n/messages";
import { createTranslator } from "@/i18n/translate";
import { formatDay, formatMoney, formatMonth } from "@/lib/format";

const messages = {
  shop: {
    title: "Shop",
    greeting: "Hi {name}, you have {count} new {count} {missing}",
    cart: { items_one: "{count} item", items_other: "{count} items" },
  },
};

describe("createTranslator", () => {
  const t = createTranslator("en", messages, "shop");

  it("reads plain and grouped keys", () => {
    expect(t("title")).toBe("Shop");
    expect(t("cart.items", { count: 1 })).toBe("1 item");
  });

  it("fills in values and leaves unknown placeholders alone", () => {
    expect(t("greeting", { name: "Sam", count: 2 })).toBe("Hi Sam, you have 2 new 2 {missing}");
  });

  it("picks the plural form for the language", () => {
    expect(t("cart.items", { count: 0 })).toBe("0 items");
    expect(t("cart.items", { count: 3 })).toBe("3 items");
  });

  it("shows the key when a message is missing", () => {
    expect(t("nope")).toBe("shop.nope");
  });
});

describe("negotiateLocale", () => {
  it("picks the first supported language by preference", () => {
    expect(negotiateLocale("el-GR,el;q=0.9,en;q=0.8")).toBe("el");
    expect(negotiateLocale("de-DE,de;q=0.9,el;q=0.5,en;q=0.7")).toBe("en");
    expect(negotiateLocale("fr;q=0.9, el;q=0.95")).toBe("el");
  });

  it("falls back to English", () => {
    expect(negotiateLocale("de-DE")).toBe("en");
    expect(negotiateLocale("")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });
});

describe("formatting per language", () => {
  it("formats money, days and months in Greek", () => {
    expect(formatMoney(1250.5, "EUR", "el")).toBe("1.250,50 €");
    expect(formatDay("2026-11-18", "el")).toBe("18 Νοε 2026");
    expect(formatMonth("2026-11-01", "el")).toBe("Νοέμβριος 2026");
  });

  it("keeps English as before", () => {
    expect(formatMoney(1250.5, "EUR")).toBe("€1,250.50");
    expect(formatDay("2026-11-18")).toBe("18 Nov 2026");
  });
});

// Every message must exist in every language, with the same placeholders.
// [dotted key, message] pairs. Recursive functions need their return type written out.
type Entry = [key: string, message: unknown];
const flatten = (node: object, prefix = ""): Entry[] =>
  Object.entries(node).flatMap(([key, value]): Entry[] =>
    typeof value === "object" && value !== null ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]],
  );
const placeholders = (text: unknown) => [...String(text).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
// Plural forms differ between languages ("_one" may not exist), so compare the base key.
const baseKey = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, "");

describe("message catalogues", () => {
  const [base, ...others] = LOCALES;

  for (const locale of others) {
    // Object.keys() is typed string[] (objects may have extra keys), so name the real key type.
    for (const namespace of Object.keys(MESSAGES[base]) as Namespace[]) {
      it(`${locale}/${namespace}.json has the same messages as ${base}`, () => {
        const reference = new Map(flatten(MESSAGES[base][namespace]));
        const translated = new Map(flatten(MESSAGES[locale][namespace] ?? {}));
        expect([...new Set([...translated.keys()].map(baseKey))].sort()).toEqual([...new Set([...reference.keys()].map(baseKey))].sort());
        for (const [key, text] of translated) {
          // "_one" forms may spell the number out ("one item"), so only "_other" must match.
          if (key !== baseKey(key) && !key.endsWith("_other")) continue;
          const original = reference.get(key);
          expect(placeholders(text), `${namespace}.${key}`).toEqual(placeholders(original));
        }
      });
    }
  }

  it("has no empty messages", () => {
    for (const locale of LOCALES) {
      for (const [namespace, table] of Object.entries(MESSAGES[locale])) {
        for (const [key, text] of flatten(table)) expect(String(text).trim(), `${locale}/${namespace}.${key}`).not.toBe("");
      }
    }
  });
});
