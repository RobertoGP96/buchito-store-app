import { describe, expect, it } from "vitest";
import { isValidPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("deja solo dígitos", () => {
    expect(normalizePhone("+53 5 123-4567")).toBe("5351234567");
    expect(normalizePhone("(555) 00 11")).toBe("5550011");
  });
});

describe("isValidPhone", () => {
  it("acepta entre 7 y 15 dígitos", () => {
    expect(isValidPhone("5551234")).toBe(true);
    expect(isValidPhone("+53 5 123 4567")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });
});
