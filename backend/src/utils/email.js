/**
 * Email utility — deliberately tolerant, with two transports.
 *
 * 1. Brevo HTTP API (preferred in production): sends over HTTPS:443.
 *    REQUIRED on Render free tier — Render blocks ALL outbound SMTP ports
 *    (25/465/587), so nodemailer/Gmail-SMTP can never connect from there
 *    ("Connection timeout" after exactly 10s was this exact block).
 *    Brevo free tier: 300 emails/day, sender = a verified email address.
 *
 * 2. Classic SMTP via nodemailer (fallback, e.g. local dev): dynamic import;
 *    the dependency is optional so local dev works without it.
 *
 * If neither is configured → logs the email to the console in non-production
 * and reports `delivered: false` instead of throwing, so flows like
 * forgot-password never fail because a mail server is missing.
 *
 * Return contract (consumed by auth.controller → mailFailure field):
 *   { delivered: true }  |
 *   { delivered: false, reason: string, code: string|null }
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const sendViaBrevo = async ({ to, subject, text, html }) => {
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER;
  const senderName = process.env.BREVO_SENDER_NAME || "AKUMA";

  try {
    // AbortSignal.timeout guards the whole call; Node 20+ has global fetch.
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        textContent: text,
        ...(html ? { htmlContent: html } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      let reason = bodyText.slice(0, 300) || `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(bodyText);
        reason = parsed.message || reason;
      } catch {
        /* body was not JSON — keep raw text */
      }
      console.error(`📧 [brevo] send failed: HTTP ${res.status} — ${reason}`);
      return {
        delivered: false,
        reason: `Brevo HTTP ${res.status}: ${reason}`,
        code: `BREVO_${res.status}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    console.log(`📧 Email sent via Brevo to ${to} (messageId ${data.messageId || "n/a"})`);
    return { delivered: true, messageId: data.messageId || null };
  } catch (error) {
    console.error("📧 [brevo] send failed:", error.message);
    return {
      delivered: false,
      reason: error.message || "Brevo request failed",
      code: error.name === "TimeoutError" ? "BREVO_TIMEOUT" : null,
    };
  }
};

const sendViaSmtp = async ({ to, subject, text, html }) => {
  try {
    // nodemailer is CJS — dynamic import yields { default: { createTransport } }.
    const mod = await import("nodemailer");
    const nodemailer = mod.default ?? mod;
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Hard caps so a bad host/port/firewall can NEVER hang a request —
      // every phase of the SMTP conversation must answer within seconds.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      tls: { rejectUnauthorized: true },
    });

    console.log(
      `📧 SMTP → ${process.env.SMTP_HOST}:${port} (secure=${port === 465}) as ${process.env.SMTP_USER}`
    );

    // verify() fails fast with a clear auth/connection error instead of a
    // timeout deep inside sendMail. Its failure is the diagnosis: ECONNREFUSED
    // (blocked port), ETIMEDOUT (firewall), EAUTH (bad credentials/App Password).
    await transporter.verify();

    // Send with the same failure visibility — but let the send run to its own
    // socket timeout (15s) instead of a hard 5s race: Gmail on a cold start
    // often takes 6-9s, which the old race misreported as "not delivered"
    // even when the mail WAS sent afterwards.
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        ...(html ? { html } : {}),
      });
      console.log(`📧 Email sent to ${to}`);
      return { delivered: true };
    } catch (sendErr) {
      console.error(
        "📧 [email] send failed:",
        sendErr.message,
        sendErr.code ? `[code: ${sendErr.code}]` : "",
        sendErr.response ? `[smtp: ${sendErr.response}]` : ""
      );
      return {
        delivered: false,
        reason: sendErr.response || sendErr.message || "send failed",
        code: sendErr.code || null,
      };
    }
  } catch (error) {
    console.error(
      "📧 [email] send failed:",
      error.message,
      error.code ? `[code: ${error.code}]` : "",
      error.response ? `[smtp: ${error.response}]` : ""
    );
    return {
      delivered: false,
      reason: error.response || error.message || "send failed",
      code: error.code || null,
    };
  }
};

export const sendEmail = async ({ to, subject, text, html }) => {
  // Transport 1: Brevo HTTP API — the ONLY transport that works on Render free
  // tier (outbound SMTP is firewalled there). Takes precedence when configured.
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo({ to, subject, text, html });
  }

  // Transport 2: classic SMTP (works locally and on hosts that allow SMTP).
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  if (smtpConfigured) {
    return sendViaSmtp({ to, subject, text, html });
  }

  // No transport configured — always log suppression, because in production
  // this is the ONLY visible sign that the mail vars never reached the
  // process (vars added to the wrong service, naming typos, stale deploy).
  console.warn(`📧 [email] no mail transport configured — suppressed mail to ${to} ("${subject}")`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`📧 [mail suppressed — no transport configured]\nTo: ${to}\nSubject: ${subject}\n---\n${text}`);
  }
  return { delivered: false, reason: "No mail transport configured (set BREVO_API_KEY or SMTP_*)" };
};
