// Looks up translated text. Pure, so the same code runs on the server, in the browser and in tests.
//
// Messages are objects per namespace, optionally grouped: { "title": "Budget",
// "panel": { "itemCount_one": "{count} item", "itemCount_other": "{count} items" } },
// read as t("title") and t("panel.itemCount", { count: 2 }).
// - {name} in a message is replaced by params.name.
// - With a numeric params.count, "<key>_one" / "<key>_other" is picked by the language's plural rules.

/** Values substituted into {placeholders}; any value is shown with String(value). */
export type TranslationParams = Record<string, unknown>;
/** t(key, params): the translated text, or "namespace.key" when the message is missing. */
export type Translator = (key: string, params?: TranslationParams) => string;
/** Loaded messages by namespace. Their shape is checked at runtime (lookup), so `unknown` is honest. */
export type MessageNamespaces = Record<string, unknown>;

const pluralRules = new Map<string, Intl.PluralRules>();
function pluralCategory(locale: string, count: number) {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules.select(count);
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] === undefined || params[name] === null ? match : String(params[name]),
  );
}

/**
 * Returns t(key, params) for one namespace of `messages` ({ [namespace]: { [key]: text } }).
 * A missing message shows "namespace.key", so it stands out on the page and in tests.
 */
export function createTranslator(locale: string, messages: MessageNamespaces | null | undefined, namespace: string): Translator {
  const table = messages?.[namespace];
  if (!table && process.env.NODE_ENV !== "production") {
    console.error(`[i18n] Messages for "${namespace}" aren't loaded on this page (${locale}).`);
  }

  const lookup = (path: string) =>
    path
      .split(".")
      .reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), table);

  return function t(key, params) {
    let template: unknown;
    if (table && typeof params?.count === "number") {
      template = lookup(`${key}_${pluralCategory(locale, params.count)}`) ?? lookup(`${key}_other`);
    }
    template ??= lookup(key);
    if (typeof template !== "string") {
      if (table && process.env.NODE_ENV !== "production") console.error(`[i18n] Missing message "${namespace}.${key}" (${locale}).`);
      return `${namespace}.${key}`;
    }
    return interpolate(template, params);
  };
}
