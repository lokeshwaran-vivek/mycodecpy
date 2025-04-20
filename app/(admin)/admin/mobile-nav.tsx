"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Building2, 
  FileText, 
  LayoutDashboard,
  LogOut,
  Settings, 
  Users, 
  Wallet 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface MobileNavProps {
  activePathname?: string;
}

export default function MobileNav({ activePathname }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  
  // Use provided activePathname (from server) or client pathname
  const currentPath = activePathname || pathname;

  const routes = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: currentPath === "/admin",
    },
    {
      href: "/admin/businesses",
      label: "Businesses",
      icon: Building2,
      active: currentPath.startsWith("/admin/businesses"),
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      active: currentPath.startsWith("/admin/users"),
    },
    {
      href: "/admin/templates",
      label: "Templates",
      icon: FileText,
      active: currentPath.startsWith("/admin/templates"),
    },
    {
      href: "/admin/wallet",
      label: "Wallet Management",
      icon: Wallet,
      active: currentPath.startsWith("/admin/wallet"),
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: Settings,
      active: currentPath.startsWith("/admin/settings"),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
        <SheetHeader className="border-b h-16 px-6 flex items-center">
          <SheetTitle className="flex items-center gap-2 font-semibold">
            <Building2 className="h-6 w-6 text-primary" />
            <span>Admin Portal</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="px-2 py-6 flex flex-col gap-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors",
                route.active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <route.icon className={cn("h-5 w-5", route.active && "text-primary-foreground")} />
              {route.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mb-4"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
          <div className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Clarity CS Admin
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 