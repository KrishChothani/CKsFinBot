/** @format */

import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import AppSidebar from "../components/layout/AppSidebar";
import { useSidebarState } from "../hooks/useSidebarState";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/utils";

const PageLoadingFallback = () => (
  <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
    <div className="flex items-center justify-between pb-5 border-b border-[var(--border)]">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-28 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
    <Skeleton className="h-96 rounded-xl" />
  </div>
);

export const AppLayout = () => {
  const { collapsed, toggle, mobileOpen, setMobileOpen, closeMobile } =
    useSidebarState();

  return (
    <div className="min-h-dvh bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* Fixed top Navbar */}
      <Navbar onOpenSidebarDrawer={() => setMobileOpen(true)} />

      {/* Fixed left Sidebar (Desktop) + Mobile Drawer */}
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={toggle}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      {/* Main scrolling region */}
      <main
        className={cn(
          "pt-16 min-h-dvh overflow-y-auto transition-all duration-200",
          collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
        )}
      >
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Suspense fallback={<PageLoadingFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;

