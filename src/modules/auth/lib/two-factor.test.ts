import { describe, expect, it } from "vitest";
import {
  generateEmailCode,
  generateRecoveryCodes,
  generateTotpSecret,
  generateTotpToken,
  maskEmail,
  normalizeRecoveryCode,
  otpauthUri,
  validateTotp,
} from "./two-factor";
import { buildTwoFactorCodeEmail } from "./two-factor-email";

const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const T0 = 1_760_000_010_000; // ms; 1 760 000 010 s es múltiplo de 30 → contador entero

describe("validateTotp", () => {
  it("acepta el código vigente y devuelve su contador", () => {
    const token = generateTotpToken(SECRET, T0);
    expect(validateTotp(SECRET, token, T0)).toEqual({ counter: T0 / 1000 / 30 });
  });

  it("acepta un paso de desfase a cada lado y rechaza más", () => {
    const token = generateTotpToken(SECRET, T0);
    expect(validateTotp(SECRET, token, T0 + 30_000)).toEqual({ counter: T0 / 1000 / 30 });
    expect(validateTotp(SECRET, token, T0 - 30_000)).toEqual({ counter: T0 / 1000 / 30 });
    expect(validateTotp(SECRET, token, T0 + 90_000)).toBeNull();
  });

  it("rechaza formatos que no son 6 dígitos", () => {
    expect(validateTotp(SECRET, "12345", T0)).toBeNull();
    expect(validateTotp(SECRET, "abcdef", T0)).toBeNull();
  });

  it("genera secretos base32 y URIs otpauth", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    const uri = otpauthUri(secret, "ana@x.com", "Buchito");
    expect(uri.startsWith("otpauth://totp/Buchito:ana%40x.com?")).toBe(true);
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain("issuer=Buchito");
  });
});

describe("códigos de respaldo y de correo", () => {
  it("genera 8 códigos únicos con el formato XXXXX-XXXXX", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  });

  it("normaliza lo que teclea el usuario", () => {
    expect(normalizeRecoveryCode(" abcde fghjk ")).toBe("ABCDE-FGHJK");
    expect(normalizeRecoveryCode("ABCDE-FGHJK")).toBe("ABCDE-FGHJK");
    expect(normalizeRecoveryCode("abc")).toBe("ABC");
  });

  it("el código de correo son 6 dígitos", () => {
    expect(generateEmailCode()).toMatch(/^\d{6}$/);
  });
});

describe("maskEmail", () => {
  it("deja la inicial y el dominio", () => {
    expect(maskEmail("ana@x.com")).toBe("a***@x.com");
    expect(maskEmail("sin-arroba")).toBe("sin-arroba");
  });
});

describe("buildTwoFactorCodeEmail", () => {
  it("lleva el código en el asunto y escapa el HTML", () => {
    const mail = buildTwoFactorCodeEmail({ storeName: "Tienda <b>", code: "123456", minutes: 10 });
    expect(mail.subject).toContain("123456");
    expect(mail.text).toContain("123456");
    expect(mail.html).toContain("123456");
    expect(mail.html).toContain("Tienda &lt;b&gt;");
  });
});
