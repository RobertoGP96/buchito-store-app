/** Id del `<main>` de cada shell: destino del enlace de salto. */
export const MAIN_CONTENT_ID = "contenido";

/** Primer elemento enfocable de la página: con teclado o lector de pantalla
 *  permite saltarse la cabecera y la navegación, que se repiten en todas las
 *  rutas. Solo se ve al recibir el foco. */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-canvas focus:px-4 focus:py-2.5 focus:text-[14px] focus:font-semibold focus:text-ink focus:shadow-float"
    >
      Saltar al contenido
    </a>
  );
}
