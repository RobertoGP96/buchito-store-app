"use client";

import { Toast } from "@heroui/react";

/** HeroUI (react-aria) es solo cliente: el layout raíz es servidor y no puede
 *  importar el barrel de `@heroui/react` sin romper `next build`. */
export function ToastHost() {
  return (
    <Toast.Provider
      placement="bottom"
      className="bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-8"
    />
  );
}
