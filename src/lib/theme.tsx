"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark";

/** Solo guarda una elección que contradice al sistema. Sin valor, la tienda
 *  sigue al sistema (y a su cambio automático de día/noche). */
export const THEME_STORAGE_KEY = "buchito-theme";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

/** Corre antes del primer paint: sin esto la pantalla parpadea en blanco al
 *  recargar en oscuro. Pone la clase (Tailwind), data-theme (HeroUI) y el
 *  `<meta name="color-scheme">`, que pinta el lienzo del navegador en el
 *  esquema correcto antes de que llegue el CSS. El meta lo crea el script y no
 *  React para que la hidratación no lo vea como una discrepancia. */
export const THEME_INIT_SCRIPT = `(function(){try{var s=null;try{s=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}var p=s==="light"||s==="dark";var t=p?s:window.matchMedia("${SYSTEM_DARK_QUERY}").matches?"dark":"light";var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.dataset.theme=t;var m=document.createElement("meta");m.name="color-scheme";m.content=p?t:"light dark";document.head.appendChild(m)}catch(e){}})();`;

interface ThemeApi {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? "dark" : "light";
}

/** La barra del navegador (`theme-color`) y el lienzo (`color-scheme`) siguen
 *  al sistema por sus media queries; con un tema fijado a mano hay que
 *  forzarlos o quedan del color contrario al de la página. */
function syncBrowserChrome(theme: Theme, pinned: boolean) {
  const scheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (scheme) scheme.content = pinned ? theme : "light dark";

  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][media]')
    .forEach((meta) => {
      // El esquema de cada meta se lee una vez de su media query original.
      meta.dataset.scheme ??= meta.media.includes("dark") ? "dark" : "light";
      const own = meta.dataset.scheme;
      meta.media = pinned ? (own === theme ? "all" : "not all") : `(prefers-color-scheme: ${own})`;
    });
}

function applyTheme(theme: Theme, pinned: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  syncBrowserChrome(theme, pinned);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // El script inline ya dejó la clase puesta; leerla evita un repintado y
  // mantiene el primer render del cliente igual al DOM que llegó del servidor.
  const [theme, setThemeState] = useState<Theme>("light");
  const pathname = usePathname();

  useEffect(() => {
    setThemeState(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  // Cada grupo de rutas trae sus propios `theme-color`: al cambiar de ruta
  // llegan sin forzar y hay que volver a alinearlos con el tema fijado.
  useEffect(() => {
    const stored = readStoredTheme();
    syncBrowserChrome(stored ?? systemTheme(), stored !== null);
  }, [pathname]);

  const setTheme = useCallback((next: Theme) => {
    // Elegir lo mismo que el sistema es deshacer el ajuste: se borra la
    // elección y la tienda vuelve a seguir al sistema. Guardarla la dejaría
    // fijada para siempre sin que el usuario lo vea.
    const pinned = next !== systemTheme();
    setThemeState(next);
    applyTheme(next, pinned);
    try {
      if (pinned) localStorage.setItem(THEME_STORAGE_KEY, next);
      else localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // Modo privado / storage lleno: el tema vive solo en esta sesión.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "light" : "dark"
    );
  }, [setTheme]);

  useEffect(() => {
    // Solo mientras el usuario no haya elegido: seguir al sistema. Una
    // elección guardada se conserva aunque el sistema pase a coincidir con ella.
    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    const onSystemChange = (event: MediaQueryListEvent) => {
      if (readStoredTheme()) return;
      const next: Theme = event.matches ? "dark" : "light";
      setThemeState(next);
      applyTheme(next, false);
    };

    // La elección puede cambiar desde otra pestaña.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
      const stored = readStoredTheme();
      const next = stored ?? systemTheme();
      setThemeState(next);
      applyTheme(next, stored !== null);
    };

    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return context;
}
