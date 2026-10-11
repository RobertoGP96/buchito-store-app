import { afterEach, describe, expect, it } from "vitest";
import { imageSrc, mediaKeyFromUrl, mediaUrl } from "./image-url";

const KEY = "variants/1f0f2d1c-8d8a-4f2b-9f1a-0a4d2b3c4d5e.webp";

describe("image-url", () => {
  const original = process.env.NEXT_PUBLIC_IMAGE_CDN_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_IMAGE_CDN_URL;
    else process.env.NEXT_PUBLIC_IMAGE_CDN_URL = original;
  });

  it("construye y reconoce rutas /media", () => {
    expect(mediaUrl(KEY)).toBe(`/media/${KEY}`);
    expect(mediaKeyFromUrl(`/media/${KEY}`)).toBe(KEY);
  });

  it("rechaza claves con otra forma (no es un proxy abierto)", () => {
    expect(mediaKeyFromUrl("/media/../etc/passwd")).toBeNull();
    expect(mediaKeyFromUrl("/media/a/b/c.jpg")).toBeNull();
    expect(mediaKeyFromUrl("/media/variants/x.exe")).toBeNull();
    expect(mediaKeyFromUrl("https://x.com/variants/x.jpg")).toBeNull();
  });

  it("sin CDN deja la ruta /media tal cual", () => {
    delete process.env.NEXT_PUBLIC_IMAGE_CDN_URL;
    expect(imageSrc(`/media/${KEY}`)).toBe(`/media/${KEY}`);
    expect(imageSrc(null)).toBeNull();
  });

  it("con CDN reescribe /media y respeta URLs externas", () => {
    process.env.NEXT_PUBLIC_IMAGE_CDN_URL = "https://img.example.com/";
    expect(imageSrc(`/media/${KEY}`)).toBe(`https://img.example.com/${KEY}`);
    expect(imageSrc("https://otro.com/foto.jpg")).toBe("https://otro.com/foto.jpg");
  });
});
