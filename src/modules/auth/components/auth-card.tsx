import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

interface AuthCardProps {
  eyebrow: string;
  title: string;
  description: string;
  footer: { text: string; linkLabel: string; href: string };
  children: React.ReactNode;
}

/** Marco común de login y registro: card centrada, marca arriba, pie con
 *  el enlace a la otra pantalla. */
export function AuthCard({ eyebrow, title, description, footer, children }: AuthCardProps) {
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-5 pt-10 pb-12 md:pt-16">
      <div className="flex justify-center">
        <BrandLogo variant="stacked" />
      </div>
      <div className="mt-8 rounded-card bg-canvas p-6 shadow-card md:p-8">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display mt-2 text-[24px] leading-tight text-navy-900">{title}</h1>
        <p className="mt-2 text-[13.5px] leading-[1.65] text-slate-500">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-center text-[13px] text-slate-500">
        {footer.text}{" "}
        <Link href={footer.href} className="font-semibold text-navy-700 hover:underline">
          {footer.linkLabel}
        </Link>
      </p>
    </div>
  );
}
