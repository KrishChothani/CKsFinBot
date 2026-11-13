/** @format */

import React, { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Inbox,
  CheckSquare,
  BookOpen,
  Scale,
  ShieldAlert,
  Layers,
  Calendar,
  FileQuestion,
  Bot,
  ShieldCheck,
  Building2,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useTenant } from "../../JSX/Contexts/TenantContext";
import { Tooltip } from "../ui/Tooltip";
import { Sheet, SheetContent } from "../ui/Sheet";

const navigationGroups = [
  {
    label: "Overview",
    items: [
      {
        name: "Dashboard",
        to: "/app/dashboard",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Documents",
    items: [
      {
        name: "Document Inbox",
        to: "/app/inbox",
        icon: Inbox,
        badgeKey: "inboxCount",
      },
      {
        name: "Review Queue",
        to: "/app/review",
        icon: CheckSquare,
        badgeKey: "pendingReviewCount",
        badgeVariant: "warning",
      },
      {
        name: "Vouchers & Ledgers",
        to: "/app/vouchers",
        icon: BookOpen,
      },
    ],
  },
  {
    label: "Accounting",
    items: [
      {
        name: "Financials",
        to: "/app/financials",
        icon: Scale,
      },
      {
        name: "Reconciliation",
        to: "/app/reconciliation",
        icon: Layers,
      },
    ],
  },
  {
    label: "Compliance & Tax",
    items: [
      {
        name: "Tax Advisory",
        to: "/app/tax-advisory",
        icon: ShieldAlert,
      },
      {
        name: "Compliance Calendar",
        to: "/app/compliance",
        icon: Calendar,
        badgeKey: "complianceDeadlineCount",
      },
      {
        name: "Document Requests",
        to: "/app/requests",
        icon: FileQuestion,
      },
    ],
  },
  {
    label: "Workspace & AI",
    items: [
      {
        name: "AI Assistant & Drafting",
        to: "/app/assistant",
        icon: Bot,
      },
      {
        name: "Enterprise Hub",
        to: "/app/enterprise",
        icon: ShieldCheck,
      },
      {
        name: "Rules Registry",
        to: "/app/rules",
        icon: Scale,
      },
      {
        name: "Clients",
        to: "/app/clients",
        icon: Building2,
      },
      {
        name: "Settings",
        to: "/app/settings",
        icon: Settings,
      },
    ],
  },
];

export const AppSidebar = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { clients, activeClient } = useTenant();

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  }, [location.pathname]);

  // Aggregate document badges
  const pendingReviewTotal = clients.reduce(
    (sum, c) => sum + (c.pendingReviewCount || 0),
    0
  );

  const renderNavLinks = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div className="flex flex-col h-full justify-between">
        <div className="space-y-5 py-2">
          {navigationGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] select-none">
                  {group.label}
                </div>
              )}

              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  let badgeValue = null;
                  if (item.badgeKey === "pendingReviewCount" && pendingReviewTotal > 0) {
                    badgeValue = pendingReviewTotal;
                  }

                  const navContent = (
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors select-none",
                          isActive
                            ? "bg-[var(--primary-light)] text-[var(--primary)] font-semibold border-l-2 border-[var(--primary)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]",
                          isCollapsed && "justify-center px-0 py-2.5"
                        )
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!isCollapsed && (
                        <span className="flex-1 truncate">{item.name}</span>
                      )}
                      {!isCollapsed && badgeValue && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] font-bold rounded-full font-tabular",
                            item.badgeVariant === "warning"
                              ? "bg-[var(--warning-light)] text-[var(--warning)] border border-[var(--warning-border)]"
                              : "bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border)]"
                          )}
                        >
                          {badgeValue}
                        </span>
                      )}
                    </NavLink>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.to} content={item.name} side="right">
                        {navContent}
                      </Tooltip>
                    );
                  }

                  return <div key={item.to}>{navContent}</div>;
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom Section: Plan usage card & collapse toggle */}
        <div className="pt-3 border-t border-[var(--border)] mt-auto space-y-3">
          {!isCollapsed && (
            <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
                  Starter Plan
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-tabular">
                  128 / 500 docs
                </span>
              </div>
              <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--primary)] rounded-full w-[25%]" />
              </div>
            </div>
          )}

          {/* Desktop collapse / expand toggle */}
          {!isMobile && (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "w-full flex items-center gap-2 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer",
                isCollapsed ? "justify-center" : "px-3"
              )}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse Sidebar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed left-0 top-16 bottom-0 z-30 flex-col bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-200 select-none overflow-hidden p-3",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
          {renderNavLinks(false)}
        </div>
      </aside>

      {/* Mobile Drawer (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={onCloseMobile}>
        <SheetContent side="left" title="CKsFinBot Workspace" className="w-[280px]">
          {renderNavLinks(true)}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AppSidebar;

