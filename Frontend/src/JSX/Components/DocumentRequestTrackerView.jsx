/** @format */

import React, { useState, useEffect, useCallback } from "react";
import {
  FileQuestion,
  Plus,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  Trash2,
  RefreshCw,
  Send,
  Eye,
} from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";
import {
  getDocumentRequests,
  createDocumentRequest,
  cancelDocumentRequest,
} from "../../services/apiClient";

const DocumentRequestTrackerView = ({ onNavigateToReview }) => {
  const { activeClient } = useTenant();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    documentCategory: "Bank_Statement",
    period: "April 2026",
    urgency: "Normal",
    dueDate: "",
  });

  const fetchRequests = useCallback(async () => {
    if (!activeClient?._id) return;
    setIsLoading(true);
    try {
      const res = await getDocumentRequests({
        clientId: activeClient._id,
        status: statusFilter,
      });
      setRequests(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load document requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeClient?._id, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert("Please enter a title for the document request.");

    setIsSubmitting(true);
    try {
      await createDocumentRequest({
        clientId: activeClient._id,
        ...form,
      });
      setShowCreateModal(false);
      setForm({
        title: "",
        description: "",
        documentCategory: "Bank_Statement",
        period: "April 2026",
        urgency: "Normal",
        dueDate: "",
      });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create document request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = (token) => {
    const portalUrl = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleCancel = async (requestId) => {
    if (!window.confirm("Are you sure you want to cancel this document request?")) return;
    try {
      await cancelDocumentRequest(requestId, { clientId: activeClient._id });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel request.");
    }
  };

  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const fulfilledCount = requests.filter((r) => r.status === "Fulfilled").length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface)] text-[var(--text-primary)] rounded-2xl border border-[var(--border)] shadow-xs overflow-y-auto p-4 md:p-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-[var(--primary)]" />
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Client Document Request Tracker
              </h1>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Request missing bank statements, bills, and tax receipts with 1-click WhatsApp/Email portal upload links
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--primary)] hover:opacity-95 text-white rounded-lg text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Request Missing Document</span>
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4">
            <span className="text-xs text-[var(--text-muted)] font-medium">Pending Client Intake</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</div>
            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Awaiting client upload</span>
          </div>

          <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4">
            <span className="text-xs text-[var(--text-muted)] font-medium">Fulfilled & Received</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fulfilledCount}</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">Ready for verification</span>
          </div>

          <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4">
            <span className="text-xs text-[var(--text-muted)] font-medium">Total Requests Tracked</span>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{requests.length}</div>
            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Audit trail recorded</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-[var(--surface-raised)] p-2 rounded-xl border border-[var(--border)]">
          {["ALL", "Pending", "Fulfilled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {st === "ALL" ? "All Requests" : st}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-[var(--text-muted)] bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
              <RefreshCw className="w-5 h-5 text-[var(--primary)] animate-spin mx-auto mb-2" />
              <span>Loading document requests...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-muted)] bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
              <FileQuestion className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="font-semibold text-[var(--text-primary)]">No document requests found</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Create a request to generate a shareable upload link for your client.
              </p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req._id}
                className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[var(--border-strong)] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[var(--text-primary)] text-sm">{req.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
                      {req.documentCategory.replace("_", " ")}
                    </span>
                    {req.period && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] font-mono">
                        {req.period}
                      </span>
                    )}
                    {req.urgency === "Urgent" && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-500/20">
                        Urgent
                      </span>
                    )}
                  </div>

                  {req.description && (
                    <p className="text-xs text-[var(--text-secondary)]">{req.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-1 flex-wrap">
                    <span>
                      Requested:{" "}
                      <strong className="text-[var(--text-secondary)]">
                        {new Date(req.createdAt).toLocaleDateString("en-IN")}
                      </strong>
                    </span>
                    {req.dueDate && (
                      <span>
                        Due:{" "}
                        <strong className="text-[var(--text-secondary)]">
                          {new Date(req.dueDate).toLocaleDateString("en-IN")}
                        </strong>
                      </span>
                    )}
                    {req.status === "Fulfilled" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Received: {req.fulfilledDocument?.fileName || "File uploaded"}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Awaiting Client Action
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {req.status === "Pending" ? (
                    <button
                      onClick={() => handleCopyLink(req.token)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                        copiedToken === req.token
                          ? "bg-emerald-600 text-white"
                          : "bg-[var(--primary)] hover:opacity-95 text-white"
                      }`}
                    >
                      {copiedToken === req.token ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Client Portal Link</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        onNavigateToReview && req.fulfilledDocument?._id
                          ? onNavigateToReview(req.fulfilledDocument._id)
                          : null
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text-primary)] rounded-lg text-xs font-semibold border border-[var(--border)] transition-colors shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review in Queue</span>
                    </button>
                  )}

                  {req.status === "Pending" && (
                    <button
                      onClick={() => handleCancel(req._id)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-[var(--surface)] rounded-lg transition-colors border border-transparent hover:border-[var(--border)]"
                      title="Cancel Request"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL: CREATE DOCUMENT REQUEST
           ══════════════════════════════════════════════════════════════════════ */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Create Missing Document Request</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Generates a secure client portal upload link for your client.
                </p>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                    Document Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Current Account Statement - April 2026"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">Category</label>
                    <select
                      value={form.documentCategory}
                      onChange={(e) => setForm({ ...form, documentCategory: e.target.value })}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                    >
                      <option value="Bank_Statement">Bank Statement</option>
                      <option value="Purchase_Invoice">Purchase Invoice</option>
                      <option value="Sales_Invoice">Sales Invoice</option>
                      <option value="Expense_Bill">Expense Bill / Receipt</option>
                      <option value="Tax_Challan">Tax Challan</option>
                      <option value="Other">Other Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">Period / Month</label>
                    <input
                      type="text"
                      placeholder="e.g. April 2026 / Q1"
                      value={form.period}
                      onChange={(e) => setForm({ ...form, period: e.target.value })}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">Urgency</label>
                    <select
                      value={form.urgency}
                      onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent (GST/TDS Due)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                    Instructions for Client
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Please upload the complete e-statement PDF directly from net banking..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text-primary)] text-xs rounded-lg font-semibold border border-[var(--border)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[var(--primary)] hover:opacity-95 disabled:opacity-50 text-white text-xs rounded-lg font-semibold shadow-xs"
                  >
                    {isSubmitting ? "Generating..." : "Generate Portal Link"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentRequestTrackerView;
