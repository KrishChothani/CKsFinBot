/** @format */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
} from "../ui/Dropdown";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { cn } from "../../lib/utils";

export const LandingNavbar = ({ onOpenDemoModal }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("ck_theme_mode") || "system";
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleThemeChange = (mode) => {
    try {
      localStorage.setItem("ck_theme_mode", mode);
      setCurrentTheme(mode);
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

  const navLinks = [
    { label: "Product", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Live Tour", href: "#showcase" },
    { label: "For CAs & SMBs", href: "#audiences" },
    { label: "ROI Estimator", href: "#roi-calculator" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)] shadow-sm py-2.5"
          : "bg-transparent py-4"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center shadow-md shadow-teal-900/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
                CKsFin<span className="text-[var(--primary)]">Bot</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/20">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-medium hidden sm:inline">
              Enterprise CA & SMB Books
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right Actions: Theme Toggle, Sign In, CTA */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Theme Dropdown */}
          <Dropdown>
            <DropdownTrigger asChild>
              <button
                type="button"
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--border)] transition-colors cursor-pointer"
                aria-label="Toggle display theme"
              >
                {currentTheme === "dark" ? (
                  <Moon className="w-4 h-4 text-teal-400" />
                ) : currentTheme === "light" ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Laptop className="w-4 h-4 text-[var(--text-muted)]" />
                )}
              </button>
            </DropdownTrigger>
            <DropdownContent align="end" className="w-36">
              <DropdownLabel>Theme Mode</DropdownLabel>
              <DropdownItem icon={Sun} onSelect={() => handleThemeChange("light")}>
                Light Theme
              </DropdownItem>
              <DropdownItem icon={Moon} onSelect={() => handleThemeChange("dark")}>
                Dark Theme
              </DropdownItem>
              <DropdownItem icon={Laptop} onSelect={() => handleThemeChange("system")}>
                System Default
              </DropdownItem>
            </DropdownContent>
          </Dropdown>

          {/* Sign In Link */}
          <Link
            to="/login"
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 rounded-lg hover:bg-[var(--surface-raised)] transition-colors"
          >
            Sign In
          </Link>

          {/* Primary CTA */}
          <Button
            as={Link}
            to="/signup"
            size="sm"
            className="gap-1.5 shadow-sm font-semibold"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => handleThemeChange(currentTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
            aria-label="Toggle theme"
          >
            {currentTheme === "dark" ? (
              <Moon className="w-4 h-4 text-teal-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-raised)] border border-[var(--border)]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-3 pb-6 border-b border-[var(--border)] bg-[var(--surface)] shadow-xl animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-3 pb-4 border-b border-[var(--border)]">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] px-2 py-1.5 rounded-md hover:bg-[var(--surface-raised)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-4 flex flex-col gap-2.5">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-lg border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
            >
              Sign In to Workspace
            </Link>
            <Button
              as={Link}
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full justify-center gap-2 py-2.5 text-sm"
            >
              <span>Start Free 14-Day Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default LandingNavbar;

