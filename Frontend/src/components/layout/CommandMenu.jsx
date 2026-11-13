/** @format */

import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import {
  Search,
  BarChart3,
  Inbox,
  CheckSquare,
  BookOpen,
  Scale,
  ShieldAlert,
  Layers,
  Calendar,
  FileQuestion,
  ShieldCheck,
  Bot,
  Building2,
  Settings,
  PlusCircle,
  X,
} from "lucide-react";
import { useTenant } from "../../JSX/Contexts/TenantContext";

export const CommandMenu = ({ open, setOpen, onNewClient }) => {
  const navigate = useNavigate();
  const { clients, switchClient } = useTenant();

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  if (!open) return null;

  const runCommand = (command) => {
    setOpen(false);
    command();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="w-full max-w-xl rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
        <Command className="w-full">
          <div className="flex items-center px-4 border-b border-[var(--border)]">
            <Search className="w-4 h-4 text-[var(--text-muted)] mr-2 shrink-0" />
            <Command.Input
              placeholder="Type a command, search pages, or switch clients..."
              className="w-full h-12 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 text-xs">
            <Command.Empty className="py-6 text-center text-[var(--text-muted)]">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-[10px] font-bold uppercase text-[var(--text-muted)] px-2 py-1.5">
              <Command.Item
                onSelect={() => runCommand(() => navigate("/app/dashboard"))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
              >
                <BarChart3 className="w-4 h-4 text-[var(--primary)]" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/app/inbox"))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
              >
                <Inbox className="w-4 h-4 text-[var(--primary)]" />
                <span>Document Inbox</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/app/review"))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
              >
                <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                <span>Review Queue</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/app/vouchers"))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
              >
                <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                <span>Vouchers & Ledgers</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/app/financials"))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
              >
                <Scale className="w-4 h-4 text-[var(--primary)]" />
                <span>Financial Statements</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/app/tax-advisory"))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
              >
                <ShieldAlert className="w-4 h-4 text-[var(--primary)]" />
                <span>Tax Advisory & MSME</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/app/reconciliation"))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
              >
                <Layers className="w-4 h-4 text-[var(--primary)]" />
                <span>Reconciliation (Bank & 2B)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/app/compliance"))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
              >
                <Calendar className="w-4 h-4 text-[var(--primary)]" />
                <span>Compliance Calendar</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/app/assistant"))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
              >
                <Bot className="w-4 h-4 text-[var(--primary)]" />
                <span>AI Assistant & Drafting</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/app/clients"))}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
              >
                <Building2 className="w-4 h-4 text-[var(--primary)]" />
                <span>Manage Clients</span>
              </Command.Item>
            </Command.Group>

            {clients.length > 0 && (
              <Command.Group heading="Switch Client Workspace" className="text-[10px] font-bold uppercase text-[var(--text-muted)] px-2 py-1.5 mt-2">
                {clients.map((c) => (
                  <Command.Item
                    key={c._id}
                    onSelect={() =>
                      runCommand(() => {
                        switchClient(c);
                        navigate("/app/dashboard");
                      })
                    }
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span className="truncate">{c.businessName}</span>
                    </div>
                    {c.gstin && (
                      <span className="font-mono text-[10px] text-[var(--text-muted)] font-tabular shrink-0">
                        {c.gstin}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Quick Actions" className="text-[10px] font-bold uppercase text-[var(--text-muted)] px-2 py-1.5 mt-2">
              <Command.Item
                onSelect={() =>
                  runCommand(() => {
                    if (onNewClient) onNewClient();
                  })
                }
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--primary)] font-semibold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Create New Client</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-raised)]/40 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
            <kbd className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[10px] font-mono">
              Ctrl+K
            </kbd>
          </div>
        </Command>
      </div>
    </div>
  );
};

export default CommandMenu;

