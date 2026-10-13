import "server-only";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

type MailProvider = "resend" | "console";

function resolveProvider(): MailProvider {
  const forced = process.env.MAIL_PROVIDER;
  if (forced === "resend" || forced === "console") return forced;
  return process.env.RESEND_API_KEY ? "resend" : "console";
}

/** En producción solo cuenta un proveedor real; en desarrollo la consola vale
 *  (el código se imprime en el log del servidor). */
export function isMailConfigured(): boolean {
  return resolveProvider() === "resend" || process.env.NODE_ENV !== "production";
}

async function sendWithResend(message: MailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) throw new Error("Resend: faltan RESEND_API_KEY o MAIL_FROM");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend ${response.status}: ${body.slice(0, 300)}`);
  }
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (resolveProvider() === "resend") return sendWithResend(message);
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mailer no configurado: define RESEND_API_KEY y MAIL_FROM");
  }
  console.info(`[mailer] Para: ${message.to}\n[mailer] Asunto: ${message.subject}\n${message.text}`);
}
