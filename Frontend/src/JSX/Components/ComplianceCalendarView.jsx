/** @format */

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Filter,
  Search,
  FileText,
  Building,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";
import {
  getComplianceCalendar,
  fileComplianceTask,
  createCustomComplianceTask,
  seedComplianceCalendar,
} from "../../services/apiClient";

const ComplianceCalendarView = () => {
  const { activeClient } = useTenant();
  const [calendarData, setCalendarData] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Mark as Filed Modal
  const [selectedTaskForFiling, setSelectedTaskForFiling] = useState(null);
  const [filingForm, setFilingForm] = useState({
    filedDate: new Date().toISOString().slice(0, 10),
    acknowledgementNumber: "",
    challanCin: "",
    taxPaidAmount: 0,
    remarks: "",
  });
  const [isSubmittingFiling, setIsSubmittingFiling] = useState(false);

  // Custom Task Modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTask, setCustomTask] = useState({
    taskName: "",
    category: "GST",
    period: "Monthly",
    statutoryDueDate: "",
  });

  const getFYString = () => {
    if (!activeClient) return "2026-2027";
    if (typeof activeClient.financialYear === "string") return activeClient.financialYear;
    return activeClient.financialYear?.currentFY || "2026-2027";
  };

  const fetchCalendar = useCallback(async () => {
    if (!activeClient?._id) return;
    setIsLoading(true);
    try {
      const res = await getComplianceCalendar({
        clientId: activeClient._id,
        financialYear: getFYString(),
        category: categoryFilter,
      });
      setCalendarData(res.data?.data || null);
    } catch (err) {
      console.error("Failed to fetch compliance calendar:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeClient?._id, activeClient?.financialYear, categoryFilter]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handleOpenFilingModal = (task) => {
    setSelectedTaskForFiling(task);
    setFilingForm({
      filedDate: new Date().toISOString().slice(0, 10),
      acknowledgementNumber: task.filingDetails?.acknowledgementNumber || "",
      challanCin: task.filingDetails?.challanCin || "",
      taxPaidAmount: task.filingDetails?.taxPaidAmount || 0,
      remarks: task.filingDetails?.remarks || "",
    });
  };

  const handleSaveFiling = async () => {
    if (!selectedTaskForFiling) return;
    setIsSubmittingFiling(true);
    try {
      await fileComplianceTask(selectedTaskForFiling._id, {
        clientId: activeClient._id,
        ...filingForm,
      });
      setSelectedTaskForFiling(null);
      fetchCalendar();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save filing details.");
    } finally {
      setIsSubmittingFiling(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!customTask.taskName || !customTask.statutoryDueDate) {
      return alert("Please enter task name and due date.");
    }
    try {
      await createCustomComplianceTask({
        clientId: activeClient._id,
        financialYear: getFYString(),
        ...customTask,
      });
      setShowCustomModal(false);
      setCustomTask({ taskName: "", category: "GST", period: "Monthly", statutoryDueDate: "" });
      fetchCalendar();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create custom compliance task.");
    }
  };

  // Filter tasks by search
  const tasks = (calendarData?.tasks || []).filter((t) => {
    if (!searchQuery) return true;
    return (
      t.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.period.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getDaysDiff = (targetDate) => {
    const now = new Date();
    const due = new Date(targetDate);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface)] text-[var(--text-primary)] rounded-2xl border border-[var(--border)] shadow-xs overflow-y-auto p-4 md:p-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--primary)]" />
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Statutory Compliance Calendar
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                FY {getFYString()}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Indian statutory due dates for GST (GSTR-1/3B), TDS, Advance Tax, and Income Tax returns
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg text-xs font-semibold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Deadline</span>
            </button>
          </div>
        </div>

        {/* Compliance Health Scorecards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4">
            <span className="text-xs text-[var(--text-muted)] font-medium">Compliance Score</span>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {calendarData?.metrics?.complianceScore || 0}%
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">FY Health Indicator</span>
          </div>

          <div className="bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 rounded-xl p-4">
            <span className="text-xs text-[var(--text-muted)] font-medium">Total Statutory Events</span>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {calendarData?.metrics?.totalTasks || 0}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Scheduled for this FY</span>
          </div>

          <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4">
            <span className="text-xs text-[var(--text-muted)] font-medium">Returns Filed</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {calendarData?.metrics?.filedCount || 0}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">Filing receipts logged</span>
          </div>

          <div className="bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-xl p-4">
            <span className="text-xs text-[var(--text-muted)] font-medium">Pending Deadlines</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {calendarData?.metrics?.pendingCount || 0}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Upcoming in calendar</span>
          </div>

          <div className="bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 rounded-xl p-4">
            <span className="text-xs text-[var(--text-muted)] font-medium">Overdue Returns</span>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {calendarData?.metrics?.overdueCount || 0}
            </div>
            <span className="text-[10px] text-red-600 dark:text-red-400 mt-1 block">Attention required immediately</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-raised)] p-3 rounded-xl border border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-2 w-full">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search return or period..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {["ALL", "GST", "TDS", "ADVANCE_TAX", "INCOME_TAX"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    categoryFilter === cat
                      ? "bg-[var(--primary)] text-white shadow-xs"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                  }`}
                >
                  {cat === "ALL" ? "All Taxes" : cat.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Events List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-[var(--text-muted)] bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
              <RefreshCw className="w-5 h-5 text-[var(--primary)] animate-spin mx-auto mb-2" />
              <span>Loading compliance deadlines...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-muted)] bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
              <Calendar className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="font-semibold text-[var(--text-primary)]">No compliance tasks found</p>
            </div>
          ) : (
            tasks.map((task) => {
              const daysDiff = getDaysDiff(task.statutoryDueDate);
              const isOverdue = task.status === "Overdue" || (task.status === "Pending" && daysDiff < 0);
              const isDueSoon = task.status === "Pending" && daysDiff >= 0 && daysDiff <= 7;

              return (
                <div
                  key={task._id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    task.status === "Filed"
                      ? "bg-[var(--surface-raised)] border-[var(--border)] opacity-85"
                      : isOverdue
                      ? "bg-red-500/5 dark:bg-red-950/20 border-red-500/30"
                      : isDueSoon
                      ? "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30"
                      : "bg-[var(--surface-raised)] border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        task.status === "Filed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : isOverdue
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {task.status === "Filed" ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isOverdue ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[var(--text-primary)] text-sm">{task.taskName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] font-mono">
                          {task.period}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
                          {task.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mt-1.5 flex-wrap">
                        <span>
                          Statutory Due Date:{" "}
                          <strong className="text-[var(--text-primary)] font-mono">
                            {new Date(task.statutoryDueDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </strong>
                        </span>

                        {task.status === "Filed" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Filed on{" "}
                            {task.filingDetails?.filedDate
                              ? new Date(task.filingDetails.filedDate).toLocaleDateString("en-IN")
                              : "Record"}
                            {task.filingDetails?.acknowledgementNumber && (
                              <span className="ml-1 text-[var(--text-muted)] font-mono">
                                (ACK: {task.filingDetails.acknowledgementNumber})
                              </span>
                            )}
                            {task.filingDetails?.challanCin && (
                              <span className="ml-1 text-[var(--text-muted)] font-mono">
                                (CIN: {task.filingDetails.challanCin})
                              </span>
                            )}
                          </span>
                        ) : isOverdue ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            Overdue by {Math.abs(daysDiff)} day(s)
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Due in {daysDiff} day(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleOpenFilingModal(task)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        task.status === "Filed"
                          ? "bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)]"
                          : "bg-[var(--primary)] hover:opacity-95 text-white shadow-xs"
                      }`}
                    >
                      {task.status === "Filed" ? "View / Edit Filing" : "Mark as Filed"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL: RECORD STATUTORY FILING
           ══════════════════════════════════════════════════════════════════════ */}
        {selectedTaskForFiling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Record Statutory Filing</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {selectedTaskForFiling.taskName} ({selectedTaskForFiling.period})
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">Date of Filing</label>
                  <input
                    type="date"
                    value={filingForm.filedDate}
                    onChange={(e) => setFilingForm({ ...filingForm, filedDate: e.target.value })}
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                    Acknowledgement Number (ITR / GST Return ARN)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AA2704260019284"
                    value={filingForm.acknowledgementNumber}
                    onChange={(e) =>
                      setFilingForm({ ...filingForm, acknowledgementNumber: e.target.value })
                    }
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                    Challan CIN / BSR Code (For TDS & Advance Tax)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 00021452812026..."
                    value={filingForm.challanCin}
                    onChange={(e) => setFilingForm({ ...filingForm, challanCin: e.target.value })}
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">Tax Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={filingForm.taxPaidAmount}
                    onChange={(e) =>
                      setFilingForm({ ...filingForm, taxPaidAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">Remarks / Notes</label>
                  <textarea
                    rows="2"
                    value={filingForm.remarks}
                    onChange={(e) => setFilingForm({ ...filingForm, remarks: e.target.value })}
                    placeholder="e.g. Filed via official portal, tax debited from HDFC..."
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  onClick={() => setSelectedTaskForFiling(null)}
                  className="px-4 py-2 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text-primary)] text-xs rounded-lg font-semibold border border-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFiling}
                  disabled={isSubmittingFiling}
                  className="px-4 py-2 bg-[var(--primary)] hover:opacity-95 disabled:opacity-50 text-white text-xs rounded-lg font-semibold shadow-xs"
                >
                  {isSubmittingFiling ? "Saving..." : "Save Filing Record"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL: ADD CUSTOM COMPLIANCE TASK
           ══════════════════════════════════════════════════════════════════════ */}
        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Add Custom Compliance Event</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Schedule specific state taxes, MCA filings, or internal deadlines.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">Task Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Gujarat Professional Tax Return"
                    value={customTask.taskName}
                    onChange={(e) => setCustomTask({ ...customTask, taskName: e.target.value })}
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">Tax Category</label>
                    <select
                      value={customTask.category}
                      onChange={(e) => setCustomTask({ ...customTask, category: e.target.value })}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                    >
                      <option value="GST">GST</option>
                      <option value="TDS">TDS</option>
                      <option value="ADVANCE_TAX">Advance Tax</option>
                      <option value="INCOME_TAX">Income Tax</option>
                      <option value="ROC">ROC / MCA</option>
                      <option value="OTHER">Other Statutory</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">Period</label>
                    <input
                      type="text"
                      placeholder="e.g. Monthly / Q1"
                      value={customTask.period}
                      onChange={(e) => setCustomTask({ ...customTask, period: e.target.value })}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">Statutory Due Date</label>
                  <input
                    type="date"
                    value={customTask.statutoryDueDate}
                    onChange={(e) => setCustomTask({ ...customTask, statutoryDueDate: e.target.value })}
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text-primary)] text-xs rounded-lg font-semibold border border-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustom}
                  className="px-4 py-2 bg-[var(--primary)] hover:opacity-95 text-white text-xs rounded-lg font-semibold shadow-xs"
                >
                  Create Deadline
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceCalendarView;
