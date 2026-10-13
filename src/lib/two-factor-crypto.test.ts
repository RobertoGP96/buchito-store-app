import { beforeAll, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  hashCode,
  mintLoginTicket,
  safeEqual,
  verifyLoginTicket,
} from "./two-factor-crypto";

beforeAll(() => {
  process.env.AUTH_SECRET = "vitest-auth-secret-solo-para-pruebas";
  delete process.env.TWO_FACTOR_KEY;
});

describe("encryptSecret / decryptSecret", () => {
  it("recupera el texto original", () => {
    const blob = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(blob)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("cifra distinto cada vez (iv aleatorio)", () => {
    expect(encryptSecret("abc")).not.toBe(encryptSecret("abc"));
  });

  it("lanza si el blob fue manipulado", () => {
    const blob = encryptSecret("abc");
    const raw = Buffer.from(blob, "base64");
    raw[raw.length - 1] ^= 0xff;
    expect(() => decryptSecret(raw.toString("base64"))).toThrow();
  });
});

describe("hashCode", () => {
  it("es determinista y cambia con el valor y con el uso", () => {
    expect(hashCode("email-code", "123456")).toBe(hashCode("email-code", "123456"));
    expect(hashCode("email-code", "123456")).not.toBe(hashCode("email-code", "123457"));
    expect(hashCode("email-code", "123456")).not.toBe(hashCode("recovery-code", "123456"));
    expect(hashCode("email-code", "123456")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("safeEqual", () => {
  it("compara sin lanzar con longitudes distintas", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });
});

describe("tickets de login", () => {
  it("acuña y verifica en la misma etapa", async () => {
    const ticket = await mintLoginTicket(42, "pending");
    expect(await verifyLoginTicket(ticket, "pending")).toEqual({ userId: 42 });
  });

  it("rechaza la otra etapa, la manipulación, la caducidad y la ausencia", async () => {
    const ticket = await mintLoginTicket(42, "session");
    expect(await verifyLoginTicket(ticket, "pending")).toBeNull();
    expect(await verifyLoginTicket(`${ticket.slice(0, -4)}AAAA`, "session")).toBeNull();
    expect(await verifyLoginTicket(undefined, "session")).toBeNull();
    const expired = await mintLoginTicket(42, "session", -60);
    expect(await verifyLoginTicket(expired, "session")).toBeNull();
  });
});
