import { describe, expect, it } from "vitest";
import { buildWhatsappLink } from "./whatsapp";

describe("buildWhatsappLink", () => {
  it("deja solo dígitos en el número", () => {
    expect(buildWhatsappLink("+53 5 123-4567")).toBe("https://wa.me/5351234567");
  });

  it("quita el prefijo internacional 00", () => {
    expect(buildWhatsappLink("00 53 5 123 4567")).toBe("https://wa.me/5351234567");
  });

  it("codifica el texto prellenado", () => {
    expect(buildWhatsappLink("5351234567", "Hola\nPedido PED-00001 & más")).toBe(
      "https://wa.me/5351234567?text=Hola%0APedido%20PED-00001%20%26%20m%C3%A1s"
    );
  });

  it("sin texto, o en blanco, no añade query", () => {
    expect(buildWhatsappLink("5351234567")).toBe("https://wa.me/5351234567");
    expect(buildWhatsappLink("5351234567", "   ")).toBe("https://wa.me/5351234567");
  });

  it("devuelve null sin un número válido", () => {
    expect(buildWhatsappLink("")).toBeNull();
    expect(buildWhatsappLink(null)).toBeNull();
    expect(buildWhatsappLink(undefined)).toBeNull();
    expect(buildWhatsappLink("   ")).toBeNull();
    expect(buildWhatsappLink("123")).toBeNull();
    expect(buildWhatsappLink("1234567890123456")).toBeNull();
  });
});
