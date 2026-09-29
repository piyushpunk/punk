/**
 * Order email templates — plain, branded HTML built without a template engine.
 * Every email uses FRONTEND_URL for links so they work in production and dev.
 */

const FRONTEND = () => process.env.FRONTEND_URL || "https://akuma-store.vercel.app";

const money = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const shell = (title, bodyHtml) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#F5EFE3;color:#3E4822;">
  <div style="background:#4F5B2A;padding:18px 24px;">
    <span style="font-size:22px;letter-spacing:2px;color:#F5EFE3;font-weight:bold;">AKUMA</span>
  </div>
  <div style="padding:24px;">
    <h2 style="margin:0 0 12px;font-size:18px;text-transform:uppercase;letter-spacing:1px;">${title}</h2>
    ${bodyHtml}
  </div>
  <div style="padding:16px 24px;border-top:1px solid #C3B48F;font-size:12px;color:#55492F;">
    AKUMA — limited drops, no restocks. Questions? Reply to this email or DM us on Instagram.
  </div>
</div>`;

const itemsTable = (items) => `
<table style="width:100%;border-collapse:collapse;margin:12px 0;">
  ${items
    .map(
      (it) => `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #C3B48F;font-size:14px;">
      ${it.name} — ${it.size}${it.color ? ` / ${it.color}` : ""} × ${it.quantity}
    </td>
    <td style="padding:8px 0;border-bottom:1px solid #C3B48F;font-size:14px;text-align:right;white-space:nowrap;">
      ${money(it.priceAtOrder * it.quantity)}
    </td>
  </tr>`,
    )
    .join("")}
</table>`;

const totalsBlock = (order) => `
<p style="margin:4px 0;font-size:14px;">Subtotal: ${money(order.subtotal)}</p>
${order.discount > 0 ? `<p style="margin:4px 0;font-size:14px;">Discount: −${money(order.discount)}</p>` : ""}
<p style="margin:4px 0;font-size:14px;">Shipping: ${money(order.shippingFee)}</p>
<p style="margin:12px 0 0;font-size:16px;font-weight:bold;">Total: ${money(order.total)}</p>`;

const addressBlock = (a) => `
<p style="margin:8px 0;font-size:14px;line-height:1.5;">
  ${a.line1}${a.line2 ? `, ${a.line2}` : ""}<br/>
  ${a.city}, ${a.state} — ${a.pincode}
</p>`;

const statusLabel = (s) => s.replace(/_/g, " ").toUpperCase();

/** Order placed — sent right after checkout (payment may still be pending). */
export const orderPlacedEmail = (order) => ({
  subject: `Order ${order.orderNumber} placed — AKUMA`,
  html: shell(
    "Order received",
    `<p style="margin:0 0 12px;font-size:14px;">Hi — thanks for your order. Here's what you got:</p>
     ${itemsTable(order.items)}
     ${totalsBlock(order)}
     <p style="margin:16px 0 4px;font-size:14px;">Shipping to:</p>
     ${addressBlock(order.shippingAddress)}
     <p style="margin:16px 0 0;font-size:13px;color:#55492F;">
       Status: <strong>${statusLabel(order.currentStatus)}</strong>. You'll get an email when it ships —
       track it any time in your <a href="${FRONTEND()}/orders" style="color:#8A6318;">order history</a>.
     </p>`,
  ),
});

/** Payment captured — confirmation. */
export const orderConfirmedEmail = (order) => ({
  subject: `Order ${order.orderNumber} confirmed — AKUMA`,
  html: shell(
    "Payment confirmed",
    `<p style="margin:0 0 12px;font-size:14px;">Payment received — order <strong>${order.orderNumber}</strong> is confirmed and heading to production.</p>
     ${itemsTable(order.items)}
     ${totalsBlock(order)}
     <p style="margin:16px 0 0;font-size:13px;color:#55492F;">
       Track progress in your <a href="${FRONTEND()}/orders" style="color:#8A6318;">order history</a>.
     </p>`,
  ),
});

/** Status update — shipped (with tracking), delivered, cancelled, refunded. */
export const orderStatusEmail = (order, entry) => ({
  subject: `Order ${order.orderNumber}: ${statusLabel(entry.status)} — AKUMA`,
  html: shell(
    `Order ${statusLabel(entry.status)}`,
    `<p style="margin:0 0 12px;font-size:14px;">Your order <strong>${order.orderNumber}</strong> is now <strong>${statusLabel(entry.status)}</strong>.</p>
     ${entry.note ? `<p style="margin:0 0 12px;font-size:14px;">${entry.note}</p>` : ""}
     ${entry.trackingNumber ? `<p style="margin:0 0 12px;font-size:15px;">Tracking: <strong>${entry.trackingNumber}</strong>${entry.trackingUrl ? ` — <a href="${entry.trackingUrl}" style="color:#8A6318;">track package</a>` : ""}</p>` : ""}
     ${itemsTable(order.items)}
     ${totalsBlock(order)}
     <p style="margin:16px 0 0;font-size:13px;">
       Full details: <a href="${FRONTEND()}/orders" style="color:#8A6318;">your order history</a>.
     </p>`,
  ),
});
