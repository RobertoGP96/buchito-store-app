import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Toast } from "@heroui/react";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";
import { STORE_NAME } from "@/lib/config";

// Poppins no es variable: se cargan solo los cuatro pesos que usa el sistema
// (cuerpo 400/500, rótulos 600, titulares 700).
const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
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
};

export const viewport: Viewport = {
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
          {/* Sobre la barra inferior flotante en móvil; en desktop esa barra no existe. */}
          <Toast.Provider
            placement="bottom"
            className="bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-8"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
