/** @format */

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import Badge from "../ui/Badge";
import { cn } from "../../lib/utils";

export const ValidationPanel = ({ evaluations = [], className = "" }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/40 text-xs text-[var(--text-muted)] flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        <span>No deterministic validation checks evaluated yet.</span>
      </div>
    );
  }

  const passCount = evaluations.filter((e) => e.status === "pass").length;
  const failCount = evaluations.filter((e) => e.status === "fail").length;
  const warningCount = evaluations.filter((e) => e.status === "warning").length;
  const notCheckedCount = evaluations.filter((e) => e.status === "not-checked").length;

  const getStatusIcon = (status) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "fail":
        return <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pass":
        return (
          <Badge variant="success" size="sm" className="gap-1 font-bold">
            PASS
          </Badge>
        );
      case "fail":
        return (
          <Badge variant="danger" size="sm" className="gap-1 font-bold">
            FAIL
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="warning" size="sm" className="gap-1 font-bold">
            REVIEW FLAG
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" size="sm" className="gap-1 text-slate-500 font-bold">
            NOT CHECKED
          </Badge>
        );
    }
  };

  return (
    <div className={cn("rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3.5 shadow-sm", className)}>
      {/* Header with KPI Counts */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
            Deterministic Statutory Validation
          </h4>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{passCount} Pass</span>
          <span>•</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">{warningCount} Review</span>
          <span>•</span>
          <span className="text-rose-600 dark:text-rose-400 font-bold">{failCount} Fail</span>
          {notCheckedCount > 0 && (
            <>
              <span>•</span>
              <span className="text-slate-400">{notCheckedCount} Not Checked</span>
            </>
          )}
        </div>
      </div>

      {/* Rules Evaluation List */}
      <div className="space-y-2">
        {evaluations.map((ev, idx) => {
          const isExpanded = expandedId === ev.rule_id;
          return (
            <div
              key={ev.rule_id || idx}
              className={cn(
                "rounded-xl border p-3 text-xs transition-colors",
                ev.status === "fail"
                  ? "border-rose-500/30 bg-rose-500/[0.03]"
                  : ev.status === "warning"
                  ? "border-amber-500/30 bg-amber-500/[0.03]"
                  : "border-[var(--border)] bg-[var(--surface-raised)]/30"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  {getStatusIcon(ev.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-primary)]">
                        {ev.title}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {ev.rule_id} v{ev.version}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {ev.reason}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {getStatusBadge(ev.status)}
                  {ev.evidence && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : ev.rule_id)}
                      className="p-1 rounded hover:bg-[var(--surface-raised)] text-[var(--text-muted)]"
                      title="Inspect Rule Evidence"
                    >
                      <ChevronDown
                        className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")}
                      />
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && ev.evidence && (
                <div className="mt-2.5 pt-2 border-t border-[var(--border)] font-mono text-[10px] text-[var(--text-muted)] bg-[var(--surface)] p-2 rounded-lg">
                  <span className="font-sans font-semibold text-[var(--text-secondary)] block mb-1">
                    Rule Evidence Variables:
                  </span>
                  <pre className="overflow-x-auto">{JSON.stringify(ev.evidence, null, 2)}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ValidationPanel;

