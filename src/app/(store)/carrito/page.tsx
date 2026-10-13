import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { ScreenHeader } from "@/components/screen-header";
import { CartView } from "@/modules/cart/components/cart-view";
import { getStoreSettingsSafe } from "@/modules/settings/queries/settings-queries";

export const metadata: Metadata = { title: "Carrito de compra" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [settings, session] = await Promise.all([getStoreSettingsSafe(), auth()]);
  return (
    <>
      <ScreenHeader eyebrow="Tu compra" title="Carrito" />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        <CartView
          defaultShippingFee={settings?.defaultShippingFee ?? 0}
          freeShippingThreshold={settings?.freeShippingThreshold ?? null}
          isLoggedIn={Boolean(session?.user)}
        />
      </div>
    </>
  );
}
