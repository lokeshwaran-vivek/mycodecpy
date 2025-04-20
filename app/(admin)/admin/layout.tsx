"use client";
import Link from "next/link";
import { Building2, FileText, LayoutDashboard, LogOut } from "lucide-react";
import MobileNav from "./mobile-nav";
import { UserButton } from "@/components/admin/user-button";
import { signOut } from "next-auth/react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Define navigation items
  const navItems = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/admin/businesses",
      label: "Businesses",
      icon: Building2,
    },
    {
      href: "/admin/templates",
      label: "Templates",
      icon: FileText,
    },
  ];

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <div className="hidden border-r bg-card shadow-sm lg:block">
        <div className="flex h-full flex-col gap-2">
          <div className="flex h-16 items-center border-b px-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 font-semibold"
            >
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Admin Portal</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-4">
            <nav className="grid items-start px-4 text-sm font-medium gap-1">
              <NavigationLinks items={navItems} />
            </nav>
          </div>
          <div className="p-4 border-t">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-all mb-4"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
            <div className="text-xs text-muted-foreground mt-2">
              &copy; {new Date().getFullYear()} Clarity CS Admin
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6 sticky top-0 z-10 shadow-sm">
          {/* Mobile menu button */}
          <MobileNav />

          <div className="w-full flex justify-between items-center">
            <PageTitle />
            <UserButton />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-muted/10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

// Client component for dynamic page title based on current path
import { usePathname } from "next/navigation";
import NavigationLinks from "./navigation-links";

function PageTitle() {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/businesses")) return "Businesses";
    if (pathname.startsWith("/admin/templates")) return "Templates";
    if (pathname.startsWith("/admin/wallet")) return "Wallet Management";
    if (pathname.startsWith("/admin/settings")) return "Settings";
    return "Admin";
  };

  return <h1 className="text-lg font-semibold">{getTitle()}</h1>;
}
