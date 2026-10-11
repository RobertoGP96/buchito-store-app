import { AdminBottomTabs } from "@/components/layout/admin/admin-bottom-tabs";
import { AdminNavProvider } from "@/components/layout/admin/admin-nav-context";
import { AdminSidebar } from "@/components/layout/admin/admin-sidebar";
import { AdminTopbar } from "@/components/layout/admin/admin-topbar";

interface AdminShellProps {
  userName: string;
  role: string;
  children: React.ReactNode;
}

/** Sidebar colapsable en desktop; cabecera con menú de usuario en todas las
 *  anchuras; panel lateral y tabs inferiores en móvil. El `main` reserva el
 *  alto de las tabs para que nada quede debajo. */
export function AdminShell({ userName, role, children }: AdminShellProps) {
  return (
    <AdminNavProvider>
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar userName={userName} role={role} />
          <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pt-5 pb-[calc(76px+env(safe-area-inset-bottom))] md:px-8 md:pt-6 md:pb-10">
            {children}
          </main>
        </div>
        <AdminBottomTabs userName={userName} />
      </div>
    </AdminNavProvider>
  );
}
