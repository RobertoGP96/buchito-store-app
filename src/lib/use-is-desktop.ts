import { useEffect, useState } from "react";

/** true a partir de `md` (768px). El primer render (servidor) asume móvil:
 *  los diálogos que dependen de esto solo se montan abiertos en cliente, así
 *  que no hay salto visible. */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return desktop;
}
