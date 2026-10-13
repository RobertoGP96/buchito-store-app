interface TwoFactorCodeEmailInput {
  storeName: string;
  code: string;
  minutes: number;
}

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Correo con el código de verificación (login o alta del método correo). */
export function buildTwoFactorCodeEmail({ storeName, code, minutes }: TwoFactorCodeEmailInput): MailContent {
  const subject = `${code} es tu código de verificación de ${storeName}`;
  const text = [
    `Tu código de verificación de ${storeName} es: ${code}`,
    "",
    `Caduca en ${minutes} minutos.`,
    "Si no has intentado iniciar sesión ni activar la verificación en dos pasos, ignora este correo.",
  ].join("\n");
  const safeName = escapeHtml(storeName);
  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1c28;">
    <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">${safeName}</p>
      <h1 style="margin:0 0 16px;font-size:20px;">Tu código de verificación</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4b5563;">Escríbelo en la pantalla de verificación. Caduca en ${minutes} minutos.</p>
      <p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:.3em;font-variant-numeric:tabular-nums;">${code}</p>
      <p style="margin:0;font-size:12.5px;line-height:1.6;color:#6b7280;">Si no has intentado iniciar sesión ni activar la verificación en dos pasos, ignora este correo.</p>
    </div>
  </body>
</html>`;
  return { subject, text, html };
}
