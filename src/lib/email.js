// Outgoing email. Uses SMTP when SMTP_URL is set (works with any provider: Resend, Brevo, Gmail,
// a local Mailpit...). Without it, in development the email is printed in the `npm run dev`
// terminal instead of being sent, so you can click the link from there.
import "server-only";
import nodemailer from "nodemailer";

const APP_NAME = "Household Finance Hub";

let transporter;
function getTransporter() {
  if (!process.env.SMTP_URL) return null;
  transporter ??= nodemailer.createTransport(process.env.SMTP_URL);
  return transporter;
}

const escapeHtml = value =>
  String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

/** Sends an email: { to, subject, text, html }. Throws if it can't be sent. */
export async function sendEmail({ to, subject, text, html }) {
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
function linkEmail({ greeting, lines, buttonLabel, url, footer }) {
  const text = [greeting, "", ...lines, "", `${buttonLabel}: ${url}`, "", footer].join("\n");
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
    <p style="margin:0 0 16px;font-size:13px;font-weight:bold;color:#0e7490">${APP_NAME}</p>
    <p style="margin:0 0 16px">${escapeHtml(greeting)}</p>
    ${lines.map(line => `<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(line)}</p>`).join("")}
    <p style="margin:24px 0">
      <a href="${escapeHtml(url)}" style="display:inline-block;background:#0e7490;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">${escapeHtml(buttonLabel)}</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:#6b7280">If the button doesn't work, copy this link into your browser:</p>
    <p style="margin:0 0 24px;font-size:12px;word-break:break-all"><a href="${escapeHtml(url)}" style="color:#0e7490">${escapeHtml(url)}</a></p>
    <p style="margin:0;font-size:12px;color:#6b7280">${escapeHtml(footer)}</p>
  </div>
</body></html>`;
  return { text, html };
}

export function sendVerificationEmail({ to, name, url }) {
  return sendEmail({
    to,
    subject: `Confirm your email for ${APP_NAME}`,
    ...linkEmail({
      greeting: `Hi ${name},`,
      lines: ["Please confirm your email address to finish setting up your account. The link works for 24 hours."],
      buttonLabel: "Confirm email",
      url,
      footer: "If you didn't create an account, you can ignore this email.",
    }),
  });
}

/** Sent when someone tries to sign up with an email that already has an account. */
export function sendAccountExistsEmail({ to, name, url }) {
  return sendEmail({
    to,
    subject: `You already have a ${APP_NAME} account`,
    ...linkEmail({
      greeting: `Hi ${name},`,
      lines: ["Someone (hopefully you) tried to create an account with this email, but you already have one."],
      buttonLabel: "Sign in",
      url,
      footer: "If this wasn't you, you can ignore this email. Your account hasn't changed.",
    }),
  });
}
