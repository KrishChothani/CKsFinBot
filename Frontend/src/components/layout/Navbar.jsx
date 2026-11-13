/** @format */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Building2,
  ChevronDown,
  Search,
  UploadCloud,
  Bell,
  Sun,
  Moon,
  Laptop,
  PlusCircle,
  FolderOpen,
  LogOut,
  User as UserIcon,
  Settings,
  CreditCard,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useTenant } from "../../JSX/Contexts/TenantContext";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
} from "../ui/Dropdown";
import { Button, IconButton } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Tooltip } from "../ui/Tooltip";
import CreateClientModal from "../../JSX/Components/CreateClientModal";
import CommandMenu from "./CommandMenu";

export const Navbar = ({ onOpenSidebarDrawer }) => {
  const navigate = useNavigate();
  const { firm, clients, activeClient, switchClient } = useTenant();

  const [clientSearch, setClientSearch] = useState("");
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [financialYear, setFinancialYear] = useState("FY 2024-25");

  // Calculate pending items for notification badge
  const pendingReviewTotal = clients.reduce(
    (sum, c) => sum + (c.pendingReviewCount || 0),
    0
  );

  // Theme switcher handler
  const handleThemeChange = (mode) => {
    try {
      localStorage.setItem("ck_theme_mode", mode);
      const isDark =
        mode === "dark" ||
        (mode === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);

      if (isDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      }
    } catch (e) {
      console.error("Theme toggle error:", e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("activeFirmId");
    localStorage.removeItem("activeClientId");
    window.location.href = "/login";
  };

  const filteredClients = clients.filter(
    (c) =>
      c.businessName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.gstin?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <>
      <header className="fixed top-0 inset-x-0 h-16 z-40 bg-[var(--surface)] border-b border-[var(--border)] px-3 md:px-4 flex items-center justify-between gap-2 select-none">
        {/* Left Section: Mobile Menu + Brand + Client Switcher */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Hamburger below lg */}
          <IconButton
            icon={Menu}
            size="sm"
            variant="ghost"
            onClick={onOpenSidebarDrawer}
            aria-label="Open navigation menu"
            className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          />

          {/* Logo & Product Brand */}
          <div
            onClick={() => navigate("/app/dashboard")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-bold text-xs tracking-wider shadow-xs transition-transform group-hover:scale-105">
              CK
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                  {firm?.name || "CKsFinBot"}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary-border)]">
                  {firm?.subscription?.plan || "CA Firm"}
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                Document-to-Books
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-[var(--border)] hidden md:block" />

          {/* Client Switcher Dropdown */}
          <Dropdown>
            <DropdownTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all max-w-[200px] sm:max-w-[260px] text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <Building2 className="w-4 h-4 text-[var(--primary)] shrink-0" />
                <div className="flex-1 min-w-0">
                  {activeClient ? (
                    <>
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
                        {activeClient.businessName}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                        {activeClient.gstin || "Unregistered GST"}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 text-[var(--warning)] text-xs font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Select a client</span>
                    </div>
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              </button>
            </DropdownTrigger>

            <DropdownContent align="start" className="w-72 p-2">
              <div className="px-1 pb-2">
                <input
                  type="text"
                  placeholder="Search clients or GSTIN..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  autoFocus
                />
              </div>

              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {filteredClients.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[var(--text-muted)]">
                    No matching clients found
                  </div>
                ) : (
                  filteredClients.map((client) => {
                    const isSelected = activeClient?._id === client._id;
                    return (
                      <button
                        key={client._id}
                        onClick={() => switchClient(client)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[var(--primary-light)] text-[var(--primary)] font-semibold"
                            : "text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-medium">{client.businessName}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono font-tabular">
                            {client.gstin || "No GSTIN"}
                          </p>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              <DropdownSeparator />

              <DropdownItem
                icon={PlusCircle}
                onSelect={() => setShowCreateClientModal(true)}
                className="text-[var(--primary)] font-semibold"
              >
                + New Client Workspace
              </DropdownItem>
              <DropdownItem
                icon={FolderOpen}
                onSelect={() => navigate("/app/clients")}
              >
                Manage All Clients ({clients.length})
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>

        {/* Center / Global Search Button */}
        <div className="hidden lg:flex items-center flex-1 max-w-sm mx-4">
          <button
            onClick={() => setShowCommandMenu(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all text-xs cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Search documents, clients, vouchers...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Section: FY Selector, Upload, Notifications, Theme, User */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Command Trigger for smaller screens */}
          <IconButton
            icon={Search}
            size="sm"
            variant="ghost"
            onClick={() => setShowCommandMenu(true)}
            aria-label="Global search"
            className="lg:hidden text-[var(--text-secondary)]"
          />

          {/* Financial Year Selector */}
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="hidden sm:block h-8 px-2 text-xs font-medium rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
          >
            <option value="FY 2024-25">FY 2024-25</option>
            <option value="FY 2023-24">FY 2023-24</option>
            <option value="FY 2025-26">FY 2025-26</option>
          </select>

          {/* Quick Upload CTA */}
          <Button
            variant="primary"
            size="sm"
            icon={UploadCloud}
            onClick={() => navigate("/app/inbox")}
            className="hidden sm:inline-flex"
          >
            Upload
          </Button>

          {/* Notifications Bell with Pending Review Badge */}
          <Tooltip content={`Review Queue: ${pendingReviewTotal} pending documents`}>
            <div className="relative">
              <IconButton
                icon={Bell}
                size="sm"
                variant="ghost"
                onClick={() => navigate("/app/review")}
                aria-label="Pending notifications"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              />
              {pendingReviewTotal > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse" />
              )}
            </div>
          </Tooltip>

          {/* Day / Night Theme Toggle */}
          <Dropdown>
            <DropdownTrigger asChild>
              <IconButton
                icon={Sun}
                size="sm"
                variant="ghost"
                aria-label="Toggle display theme"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              />
            </DropdownTrigger>
            <DropdownContent align="end" className="w-36">
              <DropdownLabel>Theme Mode</DropdownLabel>
              <DropdownItem icon={Sun} onSelect={() => handleThemeChange("light")}>
                Light
              </DropdownItem>
              <DropdownItem icon={Moon} onSelect={() => handleThemeChange("dark")}>
                Dark
              </DropdownItem>
              <DropdownItem icon={Laptop} onSelect={() => handleThemeChange("system")}>
                System
              </DropdownItem>
            </DropdownContent>
          </Dropdown>

          {/* User Profile & Workspace Settings Menu */}
          <Dropdown>
            <DropdownTrigger asChild>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] transition-all cursor-pointer focus:outline-none"
              >
                <UserIcon className="w-4 h-4 text-[var(--primary)]" />
              </button>
            </DropdownTrigger>
            <DropdownContent align="end" className="w-52">
              <div className="px-2.5 py-1.5">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Firm Administrator
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">
                  {firm?.name || "CKsFinBot CA"}
                </p>
              </div>
              <DropdownSeparator />
              <DropdownItem
                icon={Building2}
                onSelect={() => navigate("/app/clients")}
              >
                Clients & Workspaces
              </DropdownItem>
              <DropdownItem
                icon={CreditCard}
                onSelect={() => navigate("/app/enterprise")}
              >
                Subscription & Limits
              </DropdownItem>
              <DropdownItem
                icon={Settings}
                onSelect={() => navigate("/app/settings")}
              >
                Firm Settings
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={LogOut}
                destructive
                onSelect={handleLogout}
              >
                Sign Out
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </header>

      {/* New Client Modal */}
      <CreateClientModal
        isOpen={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
      />

      {/* Ctrl+K Command Palette */}
      <CommandMenu
        open={showCommandMenu}
        setOpen={setShowCommandMenu}
        onNewClient={() => setShowCreateClientModal(true)}
      />
    </>
  );
};

export default Navbar;

