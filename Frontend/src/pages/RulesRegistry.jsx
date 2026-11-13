/** @format */

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  FileText,
  Clock,
  Filter,
  Check,
  Building,
  RefreshCw,
  Search,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Modal, ModalContent } from "../components/ui/Modal";
import Input from "../components/ui/Input";
import { cn } from "../lib/utils";

export default function RulesRegistryPage() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [verifyModalRule, setVerifyModalRule] = useState(null);
  const [reviewerName, setReviewerName] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState(null);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get("http://localhost:8080/api/v1/rules", {
        withCredentials: true,
      });
      setRules(res.data?.data || []);
    } catch (err) {
      console.error("Rules fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyModalRule || !reviewerName) return;
    setIsVerifying(true);
    try {
      await axios.patch(
        `http://localhost:8080/api/v1/rules/${verifyModalRule.rule_id}/verify`,
        { reviewerName },
        { withCredentials: true }
      );
      setVerifyModalRule(null);
      setReviewerName("");
      await fetchRules();
    } catch (err) {
      console.error("Verification error:", err);
      alert(err.response?.data?.message || "Verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredRules = rules.filter((r) => {
    if (selectedJurisdiction !== "ALL" && r.jurisdiction !== selectedJurisdiction) return false;
    if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = r.rule_id?.toLowerCase().includes(q);
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const verifiedCount = rules.filter((r) => r.status === "verified").length;
  const draftCount = rules.filter((r) => r.status === "draft").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statutory Rules Registry"
        description="Versioned accounting and tax validation rules. Unverified rules produce review warnings only and never auto-block or auto-post."
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: "Rules Registry" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRules}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            <span>Refresh Rules</span>
          </Button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Total Active Rules</span>
            <FileText className="w-4 h-4 text-teal-600" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
            {rules.length}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Indian GST, IT Act & Invariant Rules
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-semibold">
            <span>CA Verified Rules</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {verifiedCount}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Authorized to drive deterministic flags
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 mb-1 font-semibold">
            <span>Pending CA Review (Draft)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
            {draftCount}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Emits human review warnings only
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, title, or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-app)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          <select
            value={selectedJurisdiction}
            onChange={(e) => setSelectedJurisdiction(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-app)] text-[var(--text-primary)] focus:outline-none"
          >
            <option value="ALL">All Jurisdictions</option>
            <option value="IN-GST">IN-GST</option>
            <option value="IN-INCOME-TAX">IN-INCOME-TAX</option>
            <option value="IN-COMMERCIAL">IN-COMMERCIAL</option>
            <option value="FINTECH-CORE">FINTECH-CORE</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-app)] text-[var(--text-primary)] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="verified">Verified Only</option>
            <option value="draft">Draft Only</option>
          </select>
        </div>

        <span className="text-xs text-[var(--text-muted)]">
          Showing {filteredRules.length} of {rules.length} rules
        </span>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {filteredRules.map((rule) => {
          const isVerified = rule.status === "verified";
          const isExpanded = expandedRuleId === rule.rule_id;

          return (
            <div
              key={rule.rule_id}
              className={cn(
                "rounded-2xl border p-5 bg-[var(--surface)] transition-all shadow-sm",
                isVerified
                  ? "border-[var(--border)]"
                  : "border-amber-500/30 bg-amber-500/[0.02]"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--primary)] border border-[var(--border)]">
                      {rule.rule_id}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      v{rule.version}
                    </span>
                    <Badge
                      variant={isVerified ? "success" : "warning"}
                      size="sm"
                      className="gap-1"
                    >
                      {isVerified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified Rule</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" />
                          <span>Draft (VERIFY WITH CA)</span>
                        </>
                      )}
                    </Badge>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-secondary)]">
                      {rule.jurisdiction}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[var(--text-primary)] pt-1">
                    {rule.title}
                  </h3>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-0.5">
                    {rule.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isVerified && (
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => setVerifyModalRule(rule)}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify as CA</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      setExpandedRuleId(isExpanded ? null : rule.rule_id)
                    }
                  >
                    <span>{isExpanded ? "Hide Details" : "Inspect Metadata"}</span>
                  </Button>
                </div>
              </div>

              {/* Attribution and Source Link */}
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
                <div className="flex flex-wrap items-center gap-4">
                  <span>
                    Effective: <strong>{rule.effective_from ? new Date(rule.effective_from).toLocaleDateString("en-IN") : "2017-07-01"}</strong>
                  </span>
                  <span>
                    Reviewer: <strong>{rule.reviewer_name}</strong>
                  </span>
                  {rule.reviewed_on && (
                    <span>
                      Reviewed on: <strong>{new Date(rule.reviewed_on).toLocaleDateString("en-IN")}</strong>
                    </span>
                  )}
                </div>

                {rule.source_url && (
                  <a
                    href={rule.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[var(--primary)] hover:underline font-semibold text-[11px]"
                  >
                    <span>Official Gazette / Circular Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Expandable Changelog & Test Vectors */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3 bg-[var(--surface-raised)]/50 p-4 rounded-xl text-xs font-mono">
                  <div>
                    <span className="font-sans font-bold text-[11px] text-[var(--text-primary)] uppercase tracking-wider block mb-1">
                      Audit Changelog
                    </span>
                    <div className="space-y-1">
                      {rule.changelog?.map((c, i) => (
                        <div key={i} className="text-[11px] text-[var(--text-secondary)]">
                          v{c.version} ({c.date}) by {c.author}: {c.changeReason}
                        </div>
                      ))}
                    </div>
                  </div>

                  {rule.test_vectors && rule.test_vectors.length > 0 && (
                    <div className="pt-2">
                      <span className="font-sans font-bold text-[11px] text-[var(--text-primary)] uppercase tracking-wider block mb-1">
                        Verified Test Vectors
                      </span>
                      <pre className="p-2 rounded bg-[var(--surface)] border border-[var(--border)] overflow-x-auto text-[11px]">
                        {JSON.stringify(rule.test_vectors, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for CA Rule Verification */}
      <Modal open={!!verifyModalRule} onOpenChange={() => setVerifyModalRule(null)}>
        <ModalContent
          maxWidth="max-w-md"
          title={`Verify Statutory Rule: ${verifyModalRule?.rule_id}`}
          description="By formally verifying this rule, you confirm it has been reviewed against the official gazette/circular and is safe to drive active validation flags."
        >
          <form onSubmit={handleVerifySubmit} className="space-y-4 pt-2">
            <Input
              label="CA Practitioner / Auditor Name & Membership #"
              required
              placeholder="e.g. CA Rajesh Sharma (ICAI #402918)"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
            />

            <div className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1">
              <span className="font-semibold text-[var(--text-primary)]">Rule Summary:</span>
              <p>{verifyModalRule?.title}</p>
              <a
                href={verifyModalRule?.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--primary)] flex items-center gap-1 font-semibold"
              >
                <span>Verify Source URL</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setVerifyModalRule(null)}
              >
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={isVerifying} className="gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Sign Rule</span>
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}

