import { auth } from "@/lib/auth";
import { CartProvider } from "@/modules/cart/store";
import { CurrencyProvider } from "@/modules/currency/store/currency-provider";
import { getCurrencyContext } from "@/modules/currency/queries/currency-queries";
import { getStoreSettingsSafe } from "@/modules/settings/queries/settings-queries";
import { BottomNav } from "@/components/layout/store/bottom-nav";
import { SiteFooter } from "@/components/layout/store/site-footer";
import { TopNav } from "@/components/layout/store/top-nav";
import type { NavUser } from "@/components/layout/store/user-menu";

export default async function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, currency, settings] = await Promise.all([
    auth(),
    getCurrencyContext(),
    getStoreSettingsSafe(),
  ]);

  const user: NavUser | null = session?.user
    ? {
        fullName: session.user.fullName,
        email: session.user.email ?? "",
        role: session.user.role,
      }
    : null;

  return (
    <CurrencyProvider data={currency}>
      <CartProvider>
        <div className="flex min-h-dvh flex-col">
          <TopNav user={user} />
          {/* El hueco para la BottomNav flotante lo reserva el propio
              componente con un espaciador al final del documento. */}
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter
            contact={{
              phone: settings?.phone ?? null,
              email: settings?.email ?? null,
              address: settings?.address ?? null,
            }}
          />
          <BottomNav />
        </div>
      </CartProvider>
    </CurrencyProvider>
  );
}
