/**
 * WhatsApp Cloud API — sends an authentication template with one body parameter (the OTP code).
 *
 * Create an approved template in Meta Business (e.g. name `daily_katha_otp`) with body:
 *   "Your Daily Katha verification code is {{1}}"
 *
 * Env:
 *   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID (required for real sends)
 *   WHATSAPP_OTP_TEMPLATE_NAME (default daily_katha_otp)
 *   WHATSAPP_TEMPLATE_LANGUAGE (default en)
 *   OTP_ALLOW_WITHOUT_WHATSAPP=true — log only (dev / staging without Meta keys)
 */

const GRAPH_VERSION = 'v21.0';

export async function sendOtpViaWhatsApp(phoneDigits, code) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || 'daily_katha_otp';
  const langCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';
  const allowSkip = process.env.OTP_ALLOW_WITHOUT_WHATSAPP === 'true';

  if (!token || !phoneNumberId) {
    if (allowSkip) {
      console.warn(
        `[whatsapp] OTP_ALLOW_WITHOUT_WHATSAPP — skipping send to 91${phoneDigits} (code ${code})`,
      );
      return;
    }
    const err = new Error(
      'WhatsApp OTP is not configured (set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID)',
    );
    err.code = 'WHATSAPP_NOT_CONFIGURED';
    throw err;
  }

  const digits = String(phoneDigits).replace(/\D/g, '');
  const to = digits.length === 10 ? `91${digits}` : digits;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: langCode },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: String(code) }],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`WhatsApp send failed (${res.status}): ${text}`);
    err.code = 'WHATSAPP_SEND_FAILED';
    throw err;
  }
}
