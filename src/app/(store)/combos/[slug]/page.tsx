import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ComboDetail } from "@/modules/combos/components/combo-detail";
import { getComboBySlug } from "@/modules/combos/queries/combo-catalog-queries";

export const dynamic = "force-dynamic";

// generateMetadata y la página piden el mismo combo en el mismo request.
const loadCombo = cache((slug: string) => getComboBySlug(slug));

interface ComboPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ComboPageProps): Promise<Metadata> {
  const { slug } = await params;
  const combo = await loadCombo(decodeURIComponent(slug));
  return { title: combo?.name ?? "Combo" };
}

export default async function ComboPage({ params }: ComboPageProps) {
  const { slug } = await params;
  const combo = await loadCombo(decodeURIComponent(slug));
  if (!combo) notFound();
  return <ComboDetail combo={combo} />;
}
