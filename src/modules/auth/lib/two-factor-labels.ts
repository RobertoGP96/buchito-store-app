// Unión propia (no el enum de Prisma) para que viaje a componentes cliente.
export type TwoFactorMethod = "app" | "email";

export const TWO_FACTOR_METHODS = ["app", "email"] as const;

export const TWO_FACTOR_METHOD_LABELS: Record<TwoFactorMethod, string> = {
  app: "App de autenticación",
  email: "Código por correo",
};

export const TWO_FACTOR_METHOD_DESCRIPTIONS: Record<TwoFactorMethod, string> = {
  app: "Google Authenticator, Authy o similar generan el código, incluso sin conexión.",
  email: "Te enviamos un código de 6 dígitos al correo de tu cuenta cada vez que entras.",
};

/** Lo que `loginUser` devuelve cuando la cuenta tiene 2FA: el formulario pasa
 *  al segundo paso con esta información. El ticket nunca viaja al cliente. */
export interface LoginChallenge {
  method: TwoFactorMethod;
  emailMasked?: string;
  resendAfterSeconds?: number;
}

export const TWO_FACTOR_EXPIRED_MESSAGE = "La verificación caducó. Vuelve a iniciar sesión.";

export const RESEND_COOLDOWN_SECONDS = 60;

export const EMAIL_CODE_TTL_MINUTES = 10;

/** Estado que ve el usuario en «Mi perfil». Nunca lleva secreto ni hashes. */
export interface TwoFactorStatus {
  enabled: boolean;
  method: TwoFactorMethod | null;
  enabledAt: string | null;
  recoveryCodesLeft: number;
  /** El método correo solo se ofrece con un proveedor de correo configurado. */
  emailAvailable: boolean;
}

/** Lo que devuelve `startTwoFactorSetup` para el segundo paso del alta. */
export type TwoFactorSetup =
  | { method: "app"; qrDataUrl: string; manualKey: string }
  | { method: "email"; emailMasked: string; resendAfterSeconds: number; sent: boolean };
