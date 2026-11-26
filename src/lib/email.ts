// Outgoing email. Uses SMTP when SMTP_URL is set (works with any provider: Resend, Brevo, Gmail,
// a local Mailpit...). Without it, in development the email is printed in the `npm run dev`
// terminal instead of being sent, so you can click the link from there.
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { isLocale } from "@/i18n/config";
import { getLocale, getTranslations } from "@/i18n/server";
import type { TranslationParams } from "@/i18n/translate";

const APP_NAME = "Household Hub";

let transporter: Transporter | undefined;
function getTransporter() {
  if (!process.env.SMTP_URL) return null;
  transporter ??= nodemailer.createTransport(process.env.SMTP_URL);
  return transporter;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch] ?? ch);

export type EmailMessage = { to: string; subject: string; text: string; html?: string };

/** Who a link email goes to. Without `locale` it's written in the language of the current request. */
export type LinkEmailRecipient = { to: string; name?: string | null; url: string; locale?: string | null };

/** Sends an email: { to, subject, text, html }. Throws if it can't be sent. */
export async function sendEmail({ to, subject, text, html }: EmailMessage) {
  const smtp = getTransporter();

  if (!smtp) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_URL is not set, so emails can't be sent.");
    }
    console.log(
      `\n──── Email (not sent: SMTP_URL is not set) ────\nTo: ${to}\nSubject: ${subject}\n\n${text}\n──────────────────────────────────────────────\n`,
    );
    return;
  }

  await smtp.sendMail({
    from: process.env.EMAIL_FROM || `${APP_NAME} <no-reply@localhost>`,
    to,
    subject,
    text,
    html,
  });
}

// Shared layout: a short message and one button. Plain-text version is always included.
type LinkEmailContent = {
  lang: string;
  greeting: string;
  lines: string[];
  buttonLabel: string;
  url: string;
  footer: string;
  fallbackNote: string;
};

function linkEmail({ lang, greeting, lines, buttonLabel, url, footer, fallbackNote }: LinkEmailContent) {
  const text = [greeting, "", ...lines, "", `${buttonLabel}: ${url}`, "", footer].join("\n");
  const html = `<!doctype html>
<html lang="${lang}"><body style="margin:0;padding:24px;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
    <p style="margin:0 0 16px;font-size:13px;font-weight:bold;color:#0e7490">${APP_NAME}</p>
    <p style="margin:0 0 16px">${escapeHtml(greeting)}</p>
    ${lines.map(line => `<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(line)}</p>`).join("")}
    <p style="margin:24px 0">
      <a href="${escapeHtml(url)}" style="display:inline-block;background:#0e7490;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">${escapeHtml(buttonLabel)}</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:#6b7280">${escapeHtml(fallbackNote)}</p>
    <p style="margin:0 0 24px;font-size:12px;word-break:break-all"><a href="${escapeHtml(url)}" style="color:#0e7490">${escapeHtml(url)}</a></p>
    <p style="margin:0;font-size:12px;color:#6b7280">${escapeHtml(footer)}</p>
  </div>
</body></html>`;
  return { text, html };
}

/**
 * Builds and sends one of the emails below from its messages (email.json, section `key`).
 * Written in `locale` if given, otherwise in the language of the request that triggers it
 * (the person who asked for it; for an invitation, the person inviting).
 */
async function sendLinkEmail({
  to,
  name,
  url,
  key,
  lines = ["line"],
  params = {},
  locale,
}: LinkEmailRecipient & { key: string; lines?: string[]; params?: TranslationParams }) {
  const language = isLocale(locale) ? locale : await getLocale();
  const t = await getTranslations("email", language);
  const p = { app: APP_NAME, ...params };
  return sendEmail({
    to,
    subject: t(`${key}.subject`, p),
    ...linkEmail({
      lang: language,
      greeting: name ? t("greeting", { name }) : t("greetingNoName"),
      lines: lines.map(line => t(`${key}.${line}`, p)),
      buttonLabel: t(`${key}.button`, p),
      url,
      footer: t(`${key}.footer`, p),
      fallbackNote: t("buttonFallback"),
    }),
  });
}

export function sendVerificationEmail({ to, name, url, locale }: LinkEmailRecipient) {
  return sendLinkEmail({ to, name, url, key: "verify", locale });
}

/** Sent when someone tries to sign up with an email that already has an account. */
export function sendAccountExistsEmail({ to, name, url, locale }: LinkEmailRecipient) {
  return sendLinkEmail({ to, name, url, key: "accountExists", locale });
}

export function sendPasswordResetEmail({ to, name, url, locale }: LinkEmailRecipient) {
  return sendLinkEmail({ to, name, url, key: "reset", locale });
}

/** Security notice after a password change or reset. */
export function sendPasswordChangedEmail({ to, name, url, locale }: LinkEmailRecipient) {
  return sendLinkEmail({ to, name, url, key: "passwordChanged", lines: ["line1", "line2"], locale });
}

/**
 * Today's reminders in one email: lines are the reminders' titles and bodies, already in the
 * reader's language (see renderNotification).
 */
export async function sendRemindersEmail({
  to,
  name,
  reminders,
  locale,
}: Omit<LinkEmailRecipient, "url"> & { reminders: { title: string; body?: string | null }[] }) {
  const language = isLocale(locale) ? locale : await getLocale();
  const t = await getTranslations("email", language);
  const p = { app: APP_NAME, count: reminders.length, first: reminders[0]?.title };
  return sendEmail({
    to,
    subject: t("reminders.subject", p),
    ...linkEmail({
      lang: language,
      greeting: name ? t("greeting", { name }) : t("greetingNoName"),
      lines: [t("reminders.line", p), ...reminders.map(item => (item.body ? `• ${item.title}: ${item.body}` : `• ${item.title}`))],
      buttonLabel: t("reminders.button", p),
      url: siteUrl("/reminders"),
      footer: t("reminders.footer", p),
      fallbackNote: t("buttonFallback"),
    }),
  });
}

/** Absolute URL on this site, for links inside emails. */
export function siteUrl(path: string) {
  return new URL(path, process.env.BETTER_AUTH_URL).toString();
}

/**
 * role: "editor" | "viewer". roleLabel (the English label, e.g. "Editor") is still accepted
 * from older callers and turned back into the role.
 */
export async function sendInviteEmail({
  to,
  inviterName,
  householdName,
  role,
  roleLabel,
  url,
  expiresInDays,
  locale,
}: {
  to: string;
  inviterName: string;
  householdName: string;
  role?: string | null;
  roleLabel?: string | null;
  url: string;
  expiresInDays: number;
  locale?: string | null;
}) {
  const roleKey = role ?? String(roleLabel ?? "").toLowerCase();
  const common = await getTranslations("common", locale);
  return sendLinkEmail({
    to,
    url,
    key: "invite",
    lines: [roleKey === "viewer" ? "line1Viewer" : "line1Editor", "line2"],
    params: { inviter: inviterName, household: householdName, role: common(`roles.${roleKey}`), days: expiresInDays },
    locale,
  });
}
