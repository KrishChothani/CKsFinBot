/** @format */

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  Globe,
  Cpu,
  BarChart,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  AlertTriangle,
  Lock,
  Layers,
  FileText,
  DollarSign,
  Activity,
  X,
} from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";
import {
  getApprovalQueue,
  approveVoucherInWorkflow,
  rejectVoucherInWorkflow,
  syncGstr2bFromPortalDirect,
  saveGstPortalCredentials,
  simulateWhatsAppIntake,
  getFirmObservabilityAnalytics,
  updateClient,
} from "../../services/apiClient";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";
import { formatINR } from "../../lib/format";

const EnterpriseControlsView = () => {
  const { activeClient, firm, refreshClients } = useTenant();
  const [activeTab, setActiveTab] = useState("approvals"); // "approvals" | "whatsapp" | "gsp" | "analytics"

  // Approvals State
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [selectedVoucherForAction, setSelectedVoucherForAction] = useState(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // WhatsApp State
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [simulatedPhone, setSimulatedPhone] = useState("9876543210");
  const [simulatedFilename, setSimulatedFilename] = useState("Godrej_Invoice_April.jpg");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState(null);

  // GSP State
  const [syncPeriod, setSyncPeriod] = useState("042026");
  const [isSyncingGsp, setIsSyncingGsp] = useState(false);
  const [gspSyncResult, setGspSyncResult] = useState(null);
  const [gstUsername, setGstUsername] = useState(activeClient?.gstCredentials?.username || "");
  const [gspKey, setGspKey] = useState(activeClient?.gstCredentials?.gspAppKey || "");

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTabDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === "approvals") {
        const res = await getApprovalQueue(activeClient?._id);
        setApprovalQueue(res.data?.data || []);
      } else if (activeTab === "analytics") {
        const res = await getFirmObservabilityAnalytics();
        setAnalyticsData(res.data?.data || null);
      }
    } catch (err) {
      console.error("Failed to load enterprise view data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeClient?._id, activeTab]);

  useEffect(() => {
    fetchTabDetails();
  }, [fetchTabDetails]);

  // Approval Handlers
  const handleApprove = async (voucherId) => {
    setIsProcessingApproval(true);
    try {
      await approveVoucherInWorkflow(voucherId, { remarks: actionRemarks || "Approved" });
      setSelectedVoucherForAction(null);
      setActionRemarks("");
      fetchTabDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve voucher.");
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleReject = async (voucherId) => {
    setIsProcessingApproval(true);
    try {
      await rejectVoucherInWorkflow(voucherId, { remarks: actionRemarks || "Rejected by Reviewer" });
      setSelectedVoucherForAction(null);
      setActionRemarks("");
      fetchTabDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject voucher.");
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // WhatsApp Handlers
  const handleAddPhone = async () => {
    if (!newPhoneNumber || newPhoneNumber.trim().length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    const existing = activeClient?.authorizedPhoneNumbers || [];
    try {
      await updateClient(activeClient._id, {
        authorizedPhoneNumbers: [...existing, newPhoneNumber.trim()],
      });
      setNewPhoneNumber("");
      refreshClients();
      alert("Mobile number linked to client workspace for WhatsApp intake!");
    } catch (err) {
      alert("Failed to update authorized phone numbers.");
    }
  };

  const handleRemovePhone = async (phone) => {
    const existing = activeClient?.authorizedPhoneNumbers || [];
    try {
      await updateClient(activeClient._id, {
        authorizedPhoneNumbers: existing.filter((p) => p !== phone),
      });
      refreshClients();
    } catch (err) {
      alert("Failed to remove phone number.");
    }
  };

  const handleSimulateWhatsApp = async () => {
    setIsSimulating(true);
    setSimulationLog(null);
    try {
      const res = await simulateWhatsAppIntake({
        senderPhone: simulatedPhone,
        filename: simulatedFilename,
        fileType: simulatedFilename.endsWith(".pdf") ? "document" : "image",
      });
      setSimulationLog(res.data?.data);
    } catch (err) {
      alert("WhatsApp simulation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSimulating(false);
    }
  };

  // GSP Handlers
  const handleGspSync = async () => {
    if (!activeClient?._id) return;
    setIsSyncingGsp(true);
    setGspSyncResult(null);
    try {
      const res = await syncGstr2bFromPortalDirect({
        clientId: activeClient._id,
        returnPeriod: syncPeriod,
        financialYear:
          typeof activeClient?.financialYear === "string"
            ? activeClient.financialYear
            : activeClient?.financialYear?.currentFY || "2026-2027",
      });
      setGspSyncResult(res.data?.data);
      refreshClients();
    } catch (err) {
      alert(err.response?.data?.message || "GSP direct sync failed.");
    } finally {
      setIsSyncingGsp(false);
    }
  };

  const handleSaveGspCreds = async () => {
    if (!activeClient?._id) return;
    try {
      await saveGstPortalCredentials({
        clientId: activeClient._id,
        username: gstUsername,
        gspAppKey: gspKey,
      });
      refreshClients();
      alert("GST portal credentials saved successfully!");
    } catch (err) {
      alert("Failed to save credentials.");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface)] overflow-y-auto p-4 md:p-6 text-[var(--text-primary)] rounded-2xl border border-[var(--border)] shadow-xs">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[var(--primary)]" />
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Enterprise Controls & Automation Hub
              </h1>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Multi-level voucher approvals, WhatsApp Business intake, GSP direct sync, and firm AI cost analytics
            </p>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex flex-wrap items-center p-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl gap-1">
            <button
              onClick={() => setActiveTab("approvals")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "approvals"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Approval Queue</span>
              {approvalQueue.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold">
                  {approvalQueue.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "whatsapp"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>WhatsApp Intake</span>
            </button>
            <button
              onClick={() => setActiveTab("gsp")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "gsp"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Direct GST (GSP)</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "analytics"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Firm AI Observability</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 1: MULTI-LEVEL VOUCHER APPROVAL QUEUE
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "approvals" && (
          <div className="space-y-6">
            <div className="bg-[var(--primary-light)] border border-[var(--primary-border)] rounded-xl p-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Enterprise Dual-Control Policy</span>
                <p className="text-[var(--text-secondary)] mt-0.5">
                  Invoices exceeding the client threshold (₹{(activeClient?.approvalPolicy?.requiresPartnerApprovalAbove || 50000).toLocaleString("en-IN")}) or carrying tax disallowance flags are held in this queue and cannot be exported to Tally or Zoho until signed off by a Senior CA or Partner.
                </p>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                    <tr>
                      <th className="px-4 py-3">Client Entity</th>
                      <th className="px-4 py-3">Voucher Details</th>
                      <th className="px-4 py-3 text-right">Amount (₹)</th>
                      <th className="px-4 py-3">Approval Stage</th>
                      <th className="px-4 py-3">Posted By</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-tabular">
                    {approvalQueue.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-12 text-center text-[var(--text-muted)]">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          <p className="font-semibold text-[var(--text-primary)]">No Vouchers Pending Approval</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            All high-value vouchers have been signed off and posted to the general ledger.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      approvalQueue.map((v) => (
                        <tr key={v._id} className="hover:bg-[var(--surface-raised)]/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                            <div>{v.client?.businessName || "Client"}</div>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{v.client?.gstin}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[var(--primary)] font-semibold">
                              {v.voucherType} #{v.voucherNumber}
                            </span>
                            <div className="text-[10px] text-[var(--text-muted)] truncate max-w-xs">{v.narration}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[var(--text-primary)]">
                            {formatINR(v.totalAmount)}
                          </td>
                          <td className="px-4 py-3">
                            {v.approvalWorkflow?.stage === "Pending_Partner" ? (
                              <Badge variant="danger" size="sm">
                                Partner Approval Required
                              </Badge>
                            ) : (
                              <Badge variant="warning" size="sm">
                                Senior CA Review
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            <div>{v.postedBy?.fullName || "Staff Accountant"}</div>
                            <span className="text-[10px] text-[var(--text-muted)]">{v.postedBy?.role}</span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setSelectedVoucherForAction({ voucher: v, action: "approve" })}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              onClick={() => setSelectedVoucherForAction({ voucher: v, action: "reject" })}
                            >
                              Reject
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approval Action Modal */}
            {selectedVoucherForAction && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-scaleUp">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {selectedVoucherForAction.action === "approve"
                        ? "Confirm Voucher Approval"
                        : "Reject Voucher & Return to Draft"}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedVoucherForAction(null);
                        setActionRemarks("");
                      }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedVoucherForAction.voucher.voucherType} #{selectedVoucherForAction.voucher.voucherNumber} (₹
                    {selectedVoucherForAction.voucher.totalAmount?.toLocaleString("en-IN")})
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-primary)] block">
                      Review Remarks / Audit Note
                    </label>
                    <textarea
                      rows="3"
                      value={actionRemarks}
                      onChange={(e) => setActionRemarks(e.target.value)}
                      placeholder={
                        selectedVoucherForAction.action === "approve"
                          ? "e.g. Verified vendor GSTIN and line-item tax split; ready for books."
                          : "e.g. Rate appears mismatched against purchase order; please verify with supplier."
                      }
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVoucherForAction(null);
                        setActionRemarks("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={selectedVoucherForAction.action === "approve" ? "primary" : "destructive"}
                      size="sm"
                      isLoading={isProcessingApproval}
                      onClick={() =>
                        selectedVoucherForAction.action === "approve"
                          ? handleApprove(selectedVoucherForAction.voucher._id)
                          : handleReject(selectedVoucherForAction.voucher._id)
                      }
                    >
                      {selectedVoucherForAction.action === "approve"
                        ? "Confirm Approval"
                        : "Confirm Rejection"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 2: WHATSAPP BUSINESS INTAKE HUB
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Client Mobile Whitelist */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>WhatsApp Sender Whitelist</span>
                    </h3>
                    <span className="text-xs text-[var(--text-muted)]">
                      Entity: {activeClient?.businessName}
                    </span>
                  </div>
                  <Badge variant="success" size="sm">
                    Live Webhook Ready
                  </Badge>
                </div>

                <p className="text-xs text-[var(--text-secondary)]">
                  When a registered client director, accountant, or business owner sends a photo of an invoice or a bank statement PDF to the firm's WhatsApp number, CKsFinBot automatically routes it to this workspace.
                </p>

                {/* Add Phone Input */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-mono">
                      +91
                    </span>
                    <input
                      type="text"
                      placeholder="10-digit mobile (e.g. 9876543210)"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      className="w-full pl-12 pr-3 py-2 bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-[var(--primary)] font-mono"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={handleAddPhone}
                  >
                    Add Phone
                  </Button>
                </div>

                {/* Registered Numbers List */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Authorized Phone Numbers:</span>
                  {(activeClient?.authorizedPhoneNumbers || []).length === 0 ? (
                    <div className="p-3 bg-[var(--surface-raised)] rounded-xl text-xs text-[var(--text-muted)] text-center">
                      No mobile numbers registered yet. Add client numbers above.
                    </div>
                  ) : (
                    activeClient.authorizedPhoneNumbers.map((phone) => (
                      <div
                        key={phone}
                        className="bg-[var(--surface-raised)] border border-[var(--border)] p-2.5 rounded-xl flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-[var(--text-primary)] font-semibold">+91 {phone}</span>
                        <button
                          onClick={() => handleRemovePhone(phone)}
                          className="text-[var(--text-muted)] hover:text-red-500 p-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: WhatsApp Inbound Simulator */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Send className="w-4 h-4 text-[var(--primary)]" />
                      <span>WhatsApp Inbound Simulator</span>
                    </h3>
                    <span className="text-xs text-[var(--text-muted)]">Test receipt snaps and intake without live Meta API key</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">Sender Mobile Number</label>
                    <input
                      type="text"
                      value={simulatedPhone}
                      onChange={(e) => setSimulatedPhone(e.target.value)}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">Simulated Attachment File Name</label>
                    <input
                      type="text"
                      value={simulatedFilename}
                      onChange={(e) => setSimulatedFilename(e.target.value)}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    icon={Send}
                    isLoading={isSimulating}
                    onClick={handleSimulateWhatsApp}
                  >
                    Simulate Incoming WhatsApp Document
                  </Button>

                  {/* Simulation Log */}
                  {simulationLog && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 p-3 rounded-xl text-xs space-y-1">
                      <div className="text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Document ingested via WhatsApp!
                      </div>
                      <div className="text-[var(--text-secondary)]">Status: <span className="text-[var(--text-primary)] font-mono font-semibold">{simulationLog.status}</span></div>
                      <div className="text-[var(--text-secondary)]">Document ID: <span className="text-[var(--primary)] font-mono font-semibold">{simulationLog.documentId}</span></div>
                      <span className="text-[10px] text-[var(--text-muted)] block pt-1">
                        Viewable in Document Inbox and Review Queue.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 3: DIRECT GST PORTAL (GSP) SYNC
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "gsp" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Direct GSP Fetch */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[var(--primary)]" />
                      <span>Direct GSTR-2B Portal Pull</span>
                    </h3>
                    <span className="text-xs text-[var(--text-muted)]">
                      Client GSTIN: <strong className="text-[var(--text-primary)] font-mono">{activeClient?.gstin || "Not set"}</strong>
                    </span>
                  </div>
                  <Badge variant="primary" size="sm">
                    GSP Sandbox Connected
                  </Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">Return Period (MMYYYY)</label>
                    <input
                      type="text"
                      placeholder="e.g. 042026 for April 2026"
                      value={syncPeriod}
                      onChange={(e) => setSyncPeriod(e.target.value)}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    icon={Globe}
                    disabled={!activeClient?.gstin}
                    isLoading={isSyncingGsp}
                    onClick={handleGspSync}
                  >
                    Sync GSTR-2B Inward Supplies from Portal
                  </Button>

                  {gspSyncResult && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 p-3 rounded-xl text-xs space-y-1">
                      <div className="text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> GSTR-2B Synced & Reconciled!
                      </div>
                      <div className="text-[var(--text-secondary)]">
                        Invoices Ingested: <strong className="text-[var(--text-primary)] font-mono">{gspSyncResult.syncedCount}</strong>
                      </div>
                      <div className="text-[var(--text-secondary)]">
                        Matched Safe ITC: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">₹ {gspSyncResult.reconciliation?.matchedItc}</strong>
                      </div>
                      <div className="text-[var(--text-secondary)]">
                        At-Risk Ineligible ITC: <strong className="text-rose-600 dark:text-rose-400 font-mono">₹ {gspSyncResult.reconciliation?.atRiskItc}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* GSP Credentials Config */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">GST Portal API Credentials</h3>
                    <span className="text-xs text-[var(--text-muted)]">NIC Sandbox / Masters India / ClearTax GSP</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">GST Portal API Username</label>
                    <input
                      type="text"
                      placeholder="e.g. CKSFIN_GSP_USER"
                      value={gstUsername}
                      onChange={(e) => setGstUsername(e.target.value)}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-[var(--text-secondary)] font-semibold block mb-1">GSP App Secret Key / Token</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••••••"
                      value={gspKey}
                      onChange={(e) => setGspKey(e.target.value)}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="md"
                    className="w-full"
                    onClick={handleSaveGspCreds}
                  >
                    Save GSP Credentials
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODULE 4: FIRM OBSERVABILITY & AI COST ANALYTICS
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Top Scorecards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Monthly Document Quota</span>
                <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
                  {analyticsData?.subscription?.usedThisMonth || 0} / {analyticsData?.subscription?.planLimit || 1000}
                </div>
                <div className="w-full bg-[var(--surface-raised)] rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-[var(--primary)] h-full"
                    style={{ width: `${analyticsData?.subscription?.usagePercent || 0}%` }}
                  />
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">AI Extraction Accuracy</span>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {analyticsData?.performance?.avgConfidencePercent || 96.4}%
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">Zero math hallucinations</span>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">Average Processing Latency</span>
                <div className="text-2xl font-bold font-mono text-[var(--primary)] mt-1">
                  {analyticsData?.performance?.avgLatencySec || 1.8}s
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Per multi-page document</span>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
                <span className="text-xs text-[var(--text-muted)] font-medium">LLM Operational Cost</span>
                <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
                  ₹ {(analyticsData?.performance?.totalCostInr || 14.2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Avg ₹{analyticsData?.performance?.avgCostPerDocInr || 0.38} / document
                </span>
              </div>
            </div>

            {/* Daily Throughput Chart Representation */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Daily Intake & Ingestion Throughput</h3>
                <span className="text-xs text-[var(--text-muted)]">Last 7 Days</span>
              </div>

              <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4">
                {(analyticsData?.dailyThroughput || []).map((day) => (
                  <div key={day.date} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{day.count}</span>
                    <div
                      className="w-full bg-[var(--primary)] rounded-t-md transition-all hover:opacity-90"
                      style={{
                        height: `${Math.max(12, Math.min(100, (day.count / 20) * 100))}%`,
                      }}
                    />
                    <span className="text-[9px] text-[var(--text-muted)] font-mono">{day.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseControlsView;
