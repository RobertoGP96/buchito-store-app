"use client";

import { Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Inbox,
  LayoutDashboard,
  LogOut,
  Package,
  Settings2,
  Store,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ROLE_LABELS, isRole } from "@/lib/roles";
import { logoutUser } from "@/modules/auth/actions/auth-actions";
import { cn } from "@/lib/utils";

interface AdminUserMenuProps {
  userName: string;
  role: string;
  className?: string;
}

interface MenuLink {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

const QUICK_LINKS: MenuLink[] = [
  { id: "home", href: "/admin", label: "Panel", icon: LayoutDashboard },
  { id: "orders", href: "/admin/pedidos", label: "Pedidos", icon: Inbox },
  { id: "products", href: "/admin/productos", label: "Productos", icon: Package },
  { id: "deliveries", href: "/admin/entregas", label: "Entregas", icon: Truck },
];

const ACCOUNT_LINKS: MenuLink[] = [
  { id: "settings", href: "/admin/configuracion", label: "Configuración", icon: Settings2 },
  { id: "profile", href: "/perfil", label: "Mi perfil", icon: UserRound },
  { id: "store", href: "/", label: "Ver la tienda", icon: Store },
];

const ITEM = "flex items-center gap-3 text-[13px] font-medium";

/** Avatar con menú: atajos a las secciones principales, cuenta y salir. */
export function AdminUserMenu({ userName, role, className }: AdminUserMenuProps) {
  const router = useRouter();
  const initials = userName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const roleLabel = isRole(role) ? ROLE_LABELS[role] : role;

  const handleAction = (key: React.Key) => {
    if (key === "logout") {
      void logoutUser();
      return;
    }
    const link = [...QUICK_LINKS, ...ACCOUNT_LINKS].find((l) => l.id === key);
    if (link) router.push(link.href);
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`Cuenta de ${userName}`}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full pr-2 pl-1 text-slate-500 transition-colors duration-150 hover:bg-hover data-[pressed]:bg-tint",
          className
        )}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-[11px] font-bold text-on-brand">
          {initials || "U"}
        </span>
        <span className="hidden max-w-[120px] truncate text-[13px] font-semibold text-ink lg:inline">{userName}</span>
        <ChevronDown className="h-3.5 w-3.5 flex-none" strokeWidth={2} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="w-[248px]">
        {/* Fuera del Menu: React Aria solo admite ítems dentro de una sección
            y descartaba la cabecera junto con los atajos. */}
        <div className="border-b border-line px-4 pt-3.5 pb-3">
          <p className="truncate text-[14px] font-semibold text-ink">{userName}</p>
          <p className="mt-0.5 text-[12px] text-slate-400">{roleLabel}</p>
        </div>
        {/* El foco lo marca el ítem resaltado; el anillo global del contenedor
            solo asomaba como una línea bajo la cabecera. */}
        <Dropdown.Menu
          aria-label="Cuenta"
          className="focus-visible:outline-none!"
          onAction={handleAction}
        >
          <Dropdown.Section>
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Dropdown.Item key={link.id} id={link.id} textValue={link.label}>
                  <span className={ITEM}>
                    <Icon className="h-4 w-4 flex-none" strokeWidth={1.9} />
                    {link.label}
                  </span>
                </Dropdown.Item>
              );
            })}
          </Dropdown.Section>
          <Dropdown.Section>
            {ACCOUNT_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Dropdown.Item key={link.id} id={link.id} textValue={link.label}>
                  <span className={ITEM}>
                    <Icon className="h-4 w-4 flex-none" strokeWidth={1.9} />
                    {link.label}
                  </span>
                </Dropdown.Item>
              );
            })}
          </Dropdown.Section>
          <Dropdown.Section>
            <Dropdown.Item id="logout" textValue="Cerrar sesión">
              <span className={cn(ITEM, "text-danger")}>
                <LogOut className="h-4 w-4 flex-none" strokeWidth={1.9} />
                Cerrar sesión
              </span>
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
