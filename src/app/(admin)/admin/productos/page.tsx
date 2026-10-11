import type { Metadata } from "next";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getActiveCurrencies } from "@/modules/currency/queries/currency-queries";
import { ProductList } from "@/modules/products/components/product-list";
import { getAdminProducts } from "@/modules/products/queries/product-queries";
import { getStoreSettings } from "@/modules/settings/queries/settings-queries";

export const metadata: Metadata = { title: "Productos" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [rows, currencies, settings] = await Promise.all([getAdminProducts(), getActiveCurrencies(), getStoreSettings()]);
  return (
    <>
      <PageHeader
        icon={Package}
        title="Productos"
        description="Catálogo con variantes, precios (convertidos a la moneda base) y stock. Despliega un producto para ver y editar sus variantes."
      />
      <ProductList rows={rows} currencies={currencies} lowStockThreshold={settings.lowStockThreshold} />
    </>
  );
}
