import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";
import { STORE_NAME } from "@/lib/config";
import { ToastHost } from "@/components/toast-host";
import { PwaRegister } from "@/components/pwa-register";

// Figtree es variable (un solo archivo para todos los pesos) y trae cifras
// tabulares: con Poppins `tabular-nums` no hacía nada y los importes no
// alineaban. Solo `latin`: el español cabe entero.
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

// Solo titulares (`font-display`). Variable con tamaño óptico: el mismo archivo
// afina el trazo en un h1 de 46px y lo engrosa en un título de card.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: {
    default: STORE_NAME,
    template: `%s · ${STORE_NAME}`,
  },
  description: "Tienda en línea con entrega a domicilio.",
  applicationName: STORE_NAME,
  // Instalada en iOS abre sin barra del navegador (el manifest cubre el resto).
  appleWebApp: { capable: true, title: STORE_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#16100c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${figtree.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-page font-sans text-ink antialiased">
        <ThemeProvider>
          {children}
          <ToastHost />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
