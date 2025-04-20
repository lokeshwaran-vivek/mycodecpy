"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface NavigationLinksProps {
  items: NavigationItem[];
}

export default function NavigationLinks({ items }: NavigationLinksProps) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
              isActive
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <item.icon
              className={cn("h-4 w-4", isActive && "text-primary-foreground")}
            />
            {item.label}
          </Link>
        );
      })}
    </>
  );
} 