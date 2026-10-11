"use client";

import dynamic from "next/dynamic";
import { useState, type ComponentType } from "react";

interface DialogProps {
  open: boolean;
}

/** Formulario en diálogo con carga diferida: su chunk (HeroUI Modal/Drawer,
 *  react-hook-form, zod y el propio formulario) no se descarga hasta que
 *  alguien abre el diálogo por primera vez, y después queda montado para que
 *  la animación de cierre siga funcionando. Sustituye al import estático del
 *  formulario en las listas del admin. */
export function lazyDialog<P extends DialogProps>(
  load: () => Promise<ComponentType<P>>
): ComponentType<P> {
  const Lazy = dynamic(load);
  return function LazyDialog(props: P) {
    const [mounted, setMounted] = useState(props.open);
    // Derivado del prop en render: patrón de React para "recordar" un valor.
    if (props.open && !mounted) setMounted(true);
    return mounted ? <Lazy {...props} /> : null;
  };
}
