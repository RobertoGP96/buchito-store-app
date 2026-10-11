import { defineConfig } from "@neon/config/v1";

// Los buckets ya son GA: el CLI avisa de que no hace falta el bloque `preview`.
export default defineConfig({
  auth: true,
  buckets: {
    // Las fotos de producto se sirven por URL directa en la tienda.
    products: { access: "public_read" },
    users: { access: "private" },
    objects: { access: "private" },
  },
});
