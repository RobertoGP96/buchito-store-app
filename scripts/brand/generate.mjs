/**
 * Genera todos los activos de marca a partir de `logo-source.jpg` (el logo
 * original: isotipo taza+carrito sobre fondo blanco) y del wordmark que se
 * compone aquí ("BUCHITO SHOP", sin lema).
 *
 * El JPG no tiene transparencia, así que el fondo se "recorta" por cobertura:
 * el isotipo es plano, y cada píxel se reescribe con el color exacto y un alfa
 * derivado de la luminancia. Eso quita el blanco, limpia los artefactos del
 * JPEG y permite sacar la versión en crema para fondos oscuros sin otro
 * original. El texto se renderiza como SVG con Segoe UI (la geométrica más
 * parecida instalada en Windows; librsvg la encuentra gracias a fonts.conf).
 *
 * Salidas:
 *   public/brand/logo.png, logo-inverse.png            lockup completo (transparente)
 *   public/brand/logo-mark.png, logo-mark-inverse.png  isotipo en cuadrado 512
 *   public/icons/icon-192.png, icon-512.png            PWA (tesela redondeada)
 *   public/icons/icon-maskable-512.png                 PWA maskable (zona segura 80 %)
 *   src/app/icon.png, apple-icon.png, favicon.ico      favicon y icono iOS
 *   src/app/opengraph-image.png                        vista previa al compartir enlaces
 *
 * Uso: pnpm brand:assets
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// Antes de cargar sharp: libvips lee la configuración de fuentes al arrancar.
process.env.FONTCONFIG_FILE = resolve(here, "fonts.conf");
process.env.XDG_CACHE_HOME ??= resolve(tmpdir(), "buchito-brand");
const { default: sharp } = await import("sharp");

const ROOT = resolve(here, "../..");
const SRC = resolve(here, "logo-source.jpg");
const OUT = {
  brand: resolve(ROOT, "public/brand"),
  icons: resolve(ROOT, "public/icons"),
  app: resolve(ROOT, "src/app"),
};

const WORDMARK = "BUCHITO SHOP";

// Colores del logo y de la tesela de marca (mismos que --c-brand-tile en globals.css).
const CARAMEL = [0x9a, 0x6e, 0x41];
const COCOA = [0x4d, 0x30, 0x1e];
const CREAM = [0xf1, 0xe8, 0xde];
const TILE = "#6b3f24";
const PAGE = "#ffffff";

// Caja del isotipo medida sobre el original de 1408×768 (372 × 467).
const MARK_BOX = { left: 561, top: 93, width: 372, height: 467 };

// Dos colores por archivo: con paleta el PNG pesa una fracción sin perder bordes.
const PNG = { palette: true, compressionLevel: 9 };

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const luminance = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Devuelve el original como RGBA: color fijo, alfa por cobertura. */
function knockout(raw, info, color) {
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  const base = luminance(CARAMEL);
  const [r, g, b] = color;
  for (let p = 0; p < width * height; p++) {
    const i = p * channels;
    const o = p * 4;
    let alpha = (255 - luminance([raw[i], raw[i + 1], raw[i + 2]])) / (255 - base);
    // Fuera del logo el ruido del JPEG queda por debajo del 3 %; dentro de las
    // zonas sólidas por encima del 93 %: ambos se aplanan para no arrastrarlo.
    if (alpha < 0.03) alpha = 0;
    if (alpha > 0.93) alpha = 1;
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = Math.round(alpha * 255);
  }
  return { data: out, info: { width, height, channels: 4 } };
}

/** Recorta el isotipo y lo deja listo para reutilizar en varias salidas. */
async function cutMark(layer) {
  const { data, info } = await sharp(layer.data, { raw: layer.info })
    .extract(MARK_BOX)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return () => sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

/** Una línea de texto recortada a su caja de tinta. */
async function textLine(text, { size, weight, spacing, color }) {
  const safeText = text.replace("&", "&amp;");
  const w = Math.ceil(text.length * size);
  const h = Math.ceil(size * 1.4);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="${w / 2}" y="${Math.round(size * 1.05)}" text-anchor="middle" font-family="Segoe UI" font-weight="${weight}" font-size="${size}" letter-spacing="${spacing}" fill="${color}">${safeText}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer().then((buf) => sharp(buf).trim().png().toBuffer());
}

/** Lockup apilado: isotipo y nombre, centrados, con las proporciones del
 *  original (texto algo más ancho que la taza). */
async function lockup(mark, markColor, textColor) {
  const S = 2; // escala respecto al original de 1408×768
  const glyph = await mark().resize({ height: MARK_BOX.height * S }).png().toBuffer();
  const name = await textLine(WORDMARK, { size: 66 * S, weight: 700, spacing: 2 * S, color: hex(textColor) });
  const metas = await Promise.all([glyph, name].map((b) => sharp(b).metadata()));
  const gapName = 30 * S;
  const width = Math.max(...metas.map((m) => m.width));
  const height = metas[0].height + gapName + metas[1].height;
  const center = (m) => Math.round((width - m.width) / 2);
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: glyph, left: center(metas[0]), top: 0 },
      { input: name, left: center(metas[1]), top: metas[0].height + gapName },
    ])
    .png(PNG)
    .toBuffer();
}

/** Tesela cuadrada con el isotipo centrado. `radius` 0 = a sangre (iOS, maskable). */
async function tile(mark, size, { radius, markHeight, background = TILE }) {
  const r = Math.round(size * radius);
  const base = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${background}"/></svg>`
  );
  const glyph = await mark()
    .resize({ height: Math.round(size * markHeight), fit: "inside" })
    .png()
    .toBuffer();
  return sharp(base).composite([{ input: glyph, gravity: "centre" }]).png(PNG).toBuffer();
}

/** Isotipo centrado en un cuadrado transparente. */
async function squared(mark, size, inner) {
  const glyph = await mark().resize({ height: inner, fit: "inside" }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: glyph, gravity: "centre" }])
    .png(PNG)
    .toBuffer();
}

/** ICO con las imágenes en PNG (válido desde Windows Vista y en todos los navegadores). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = Buffer.alloc(16 * images.length);
  let offset = header.length + entries.length;
  images.forEach(({ size, png }, i) => {
    const e = i * 16;
    entries[e] = size >= 256 ? 0 : size;
    entries[e + 1] = size >= 256 ? 0 : size;
    entries.writeUInt16LE(1, e + 4);
    entries.writeUInt16LE(32, e + 6);
    entries.writeUInt32LE(png.length, e + 8);
    entries.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([header, entries, ...images.map((i) => i.png)]);
}

async function main() {
  Object.values(OUT).forEach((dir) => mkdirSync(dir, { recursive: true }));
  const written = [];
  const write = async (dir, name, buf) => {
    writeFileSync(resolve(dir, name), buf);
    const meta = await sharp(buf).metadata().catch(() => null);
    const dims = meta ? `${meta.width}×${meta.height}` : "";
    written.push(`${name.padEnd(26)} ${dims.padStart(10)} ${(buf.length / 1024).toFixed(1).padStart(7)} KB`);
  };

  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mark = await cutMark(knockout(data, info, CARAMEL));
  const markCream = await cutMark(knockout(data, info, CREAM));

  const logo = await lockup(mark, CARAMEL, COCOA);
  await write(OUT.brand, "logo.png", logo);
  await write(OUT.brand, "logo-inverse.png", await lockup(markCream, CREAM, CREAM));
  await write(OUT.brand, "logo-mark.png", await squared(mark, 512, 480));
  await write(OUT.brand, "logo-mark-inverse.png", await squared(markCream, 512, 480));

  // Favicon: tesela redondeada con esquinas transparentes, como se ve en la app.
  const rounded = { radius: 0.22, markHeight: 0.66 };
  await write(OUT.app, "icon.png", await tile(markCream, 192, rounded));
  await write(
    OUT.app,
    "favicon.ico",
    ico(
      await Promise.all(
        [16, 32, 48].map(async (size) => ({
          size,
          // A 16 px la tesela necesita más glifo y menos esquina para leerse.
          png: await tile(markCream, size, size <= 16 ? { radius: 0.2, markHeight: 0.78 } : rounded),
        }))
      )
    )
  );
  // iOS aplica su propia máscara: a sangre y sin transparencia.
  await write(OUT.app, "apple-icon.png", await tile(markCream, 180, { radius: 0, markHeight: 0.62 }));

  await write(OUT.icons, "icon-192.png", await tile(markCream, 192, rounded));
  await write(OUT.icons, "icon-512.png", await tile(markCream, 512, rounded));
  // Maskable: todo el glifo dentro del círculo central del 80 %.
  await write(OUT.icons, "icon-maskable-512.png", await tile(markCream, 512, { radius: 0, markHeight: 0.52 }));

  // Open Graph 1200×630: el lockup centrado sobre blanco.
  const ogLogo = await sharp(logo).resize({ height: 480 }).png().toBuffer();
  await write(
    OUT.app,
    "opengraph-image.png",
    await sharp({ create: { width: 1200, height: 630, channels: 3, background: PAGE } })
      .composite([{ input: ogLogo, gravity: "centre" }])
      .png(PNG)
      .toBuffer()
  );

  console.log(written.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
