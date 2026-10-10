import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("quita acentos, espacios y símbolos", () => {
    expect(slugify("Camisa Básica Hombre")).toBe("camisa-basica-hombre");
    expect(slugify("  Café & Té  ")).toBe("cafe-te");
  });

  it("devuelve vacío para cadenas sin caracteres válidos", () => {
    expect(slugify("¡¡¡")).toBe("");
  });
});
