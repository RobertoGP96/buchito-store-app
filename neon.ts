import { defineConfig } from "@neon/config/v1";

// Los buckets ya son GA: el CLI avisa de que no hace falta el bloque `preview`.
export default defineConfig({
  auth: true,
  buckets: {
    products: { access: "private" },
    users: { access: "private" },
    objects: { access: "private" },
  },
});
