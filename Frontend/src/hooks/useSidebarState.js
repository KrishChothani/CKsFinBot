/** @format */

import { useState, useEffect } from "react";

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("ck_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("ck_sidebar_collapsed", String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const toggle = () => setCollapsed((prev) => !prev);
  const closeMobile = () => setMobileOpen(false);
  const toggleMobile = () => setMobileOpen((prev) => !prev);

  return {
    collapsed,
    toggle,
    mobileOpen,
    setMobileOpen,
    closeMobile,
    toggleMobile,
  };
}

export default useSidebarState;

