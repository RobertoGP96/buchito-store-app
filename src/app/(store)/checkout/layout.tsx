import { requireAuth } from "@/lib/auth-guard";

/** Comprar exige cuenta: sin sesión se va al login y se vuelve aquí (el
 *  carrito vive en el navegador, así que no se pierde). */
export default async function CheckoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAuth("/checkout");
  return <>{children}</>;
}
