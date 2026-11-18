/** Estado de carga para lectores de pantalla. Los esqueletos y los spinners
 *  son solo dibujo: sin esto, quien no ve la pantalla no sabe que algo está
 *  cargando. Un `<progress>` sin `value` es indeterminado y el navegador lo
 *  anuncia como tal; va oculto a la vista porque el dibujo ya lo cuenta. */
export function LoadingStatus({ label = "Cargando contenido" }: { label?: string }) {
  return <progress className="sr-only" aria-label={label} />;
}
