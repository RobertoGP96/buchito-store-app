import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { ScreenHeader } from "@/components/screen-header";
import { getActiveZones } from "@/modules/deliveries/queries/zone-queries";
import { RecipientList } from "@/modules/recipients/components/recipient-list";
import { getRecipientsForUser } from "@/modules/recipients/queries/recipient-queries";

export const metadata: Metadata = { title: "Mis destinatarios" };
export const dynamic = "force-dynamic";

export default async function MyRecipientsPage() {
  const session = await auth();
  const [recipients, zones] = await Promise.all([getRecipientsForUser(session!.user.userId), getActiveZones()]);

  return (
    <>
      <ScreenHeader
        eyebrow="Tu cuenta"
        title="Mis destinatarios"
        description="A quién y dónde entregamos tus pedidos."
        backHref="/perfil"
      />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        <RecipientList rows={recipients} zones={zones} />
      </div>
    </>
  );
}
