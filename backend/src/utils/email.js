/**
 * Email utility — deliberately tolerant.
 *
 * - If SMTP_HOST/SMTP_USER are configured → sends via nodemailer (dynamic import;
 *   the dependency is optional so local dev works without it).
 * - Otherwise → logs the email to the console in non-production and reports
 *   `delivered: false` instead of throwing, so flows like forgot-password never
 *   fail because a mail server is missing.
 */

export const sendEmail = async ({ to, subject, text, html }) => {
  const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

  if (!configured) {
    // Always log suppression — in production this is the ONLY visible sign
    // that the SMTP vars never reached the process (vars added to the wrong
    // service, naming typos, stale deploy). A silent no-mail here is
    // indistinguishable from a broken SMTP otherwise.
    console.warn(`📧 [email] SMTP not configured — suppressed mail to ${to} ("${subject}")`);
    if (process.env.NODE_ENV !== "production") {
      console.log(`📧 [mail suppressed — SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n---\n${text}`);
    }
    return { delivered: false, reason: "SMTP not configured" };
  }

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
      // Gmail sometimes needs a beat before TLS starts on 587 (STARTTLS);
      // without this, first-connection TLS handshakes intermittently fail.
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
