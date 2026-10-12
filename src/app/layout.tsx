import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";
import { STORE_NAME } from "@/lib/config";
import { ToastHost } from "@/components/toast-host";
import { PwaRegister } from "@/components/pwa-register";

// Poppins no es variable: se cargan solo los cuatro pesos que usa el sistema
// (cuerpo 400/500, rótulos 600, titulares 700). Solo `latin`: el español
// cabe entero y `latin-ext` duplicaba los archivos.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
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
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={poppins.variable} suppressHydrationWarning>
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
