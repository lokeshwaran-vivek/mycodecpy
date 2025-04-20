"use client";

import { SidebarNav } from "@/components/shared/sidebar-nav";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/shared/user-nav";
import { useQuery } from "@tanstack/react-query";
import { getUserAndBusiness } from "./dashboard/actions";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: userAndBusinessData } = useQuery({
    queryKey: ["user"],
    queryFn: () => getUserAndBusiness(),
  });

  return (
    <div className="flex min-h-screen bg-[#F7F9FC] relative">
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 rounded-full bg-white shadow-md"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar - Desktop */}
      <div
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-0 z-40 transition-all duration-300",
          collapsed ? "md:w-16" : "md:w-72"
        )}
      >
        <div className="flex flex-col h-full bg-gray-50">
          {/* Logo/Brand */}
          <div
            className={cn(
              "p-6 flex items-center",
              collapsed && "justify-center p-4"
            )}
          >
            {!collapsed && (
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Claritycs
              </span>
            )}
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 px-3 py-6 overflow-y-auto">
            <SidebarNav
              disabled={
                !userAndBusinessData?.user?.isProfileComplete ||
                !userAndBusinessData?.business?.verified
              }
              collapsed={collapsed}
              className="space-y-1.5"
            />
          </div>

          {/* Collapse Button */}
          <div className="px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full flex items-center gap-2 justify-center rounded-lg px-2 py-1.5",
                "hover:bg-primary/10 hover:text-primary",
                !collapsed && "justify-between"
              )}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* User Profile Section */}
          <div className="border-t bg-gray-50/80 p-6">
            <UserNav collapsed={collapsed} />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-30 bg-black/50 transition-opacity",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 w-72 bg-gray-50 transform transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 flex items-center">
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Claritycs
            </span>
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 px-3 py-6 overflow-y-auto">
            <SidebarNav
              disabled={
                // !userAndBusinessData?.user?.isProfileComplete ||
                // !userAndBusinessData?.business?.verified||
                false
              }
              collapsed={false}
              className="space-y-1.5"
            />
          </div>

          {/* User Profile Section */}
          <div className="border-t bg-gray-50/80 p-6">
            <UserNav collapsed={false} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 bg-gray-50 transition-all duration-300 w-full",
          collapsed ? "md:pl-16" : "md:pl-72"
        )}
      >
        <main
          className={cn(
            "min-h-screen md:min-h-[calc(100vh-2rem)] bg-white",
            "m-0 md:m-4 mt-14 md:mt-4" /* Added top margin for mobile to account for menu button */,
            "rounded-none md:rounded-2xl",
            "shadow-none md:shadow-xl",
            "transition-all duration-300 ease-in-out",
            "overflow-auto",
            "p-4 md:p-6"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
