// Looks up translated text. Pure, so the same code runs on the server, in the browser and in tests.
//
// Messages are objects per namespace, optionally grouped: { "title": "Budget",
// "panel": { "itemCount_one": "{count} item", "itemCount_other": "{count} items" } },
// read as t("title") and t("panel.itemCount", { count: 2 }).
// - {name} in a message is replaced by params.name.
// - With a numeric params.count, "<key>_one" / "<key>_other" is picked by the language's plural rules.

const pluralRules = new Map();
function pluralCategory(locale, count) {
  if (!pluralRules.has(locale)) pluralRules.set(locale, new Intl.PluralRules(locale));
  return pluralRules.get(locale).select(count);
}

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] === undefined || params[name] === null ? match : String(params[name]),
  );
}

/**
 * Returns t(key, params) for one namespace of `messages` ({ [namespace]: { [key]: text } }).
 * A missing message shows "namespace.key", so it stands out on the page and in tests.
 */
export function createTranslator(locale, messages, namespace) {
  const table = messages?.[namespace];
  if (!table && process.env.NODE_ENV !== "production") {
    console.error(`[i18n] Messages for "${namespace}" aren't loaded on this page (${locale}).`);
  }

  const lookup = path => path.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), table);

  return function t(key, params) {
    let template;
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
