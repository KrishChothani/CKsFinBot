/** @format */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Building,
  Mail,
  Copy,
  Check,
  PlusCircle,
  Building2,
  Trash2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

import { useTenant } from "../JSX/Contexts/TenantContext";
import { listDocuments, uploadDocumentsToInbox } from "../services/apiClient";
import { formatDate } from "../lib/format";
import { PageHeader } from "../components/ui/PageHeader";
import { Button, IconButton } from "../components/ui/Button";
import { Badge, StatusPill } from "../components/ui/Badge";
import { ConfidenceBar } from "../components/ui/ConfidenceBar";
import { EmptyState } from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";
import CreateClientModal from "../JSX/Components/CreateClientModal";
import { cn } from "../lib/utils";

export default function DocumentInbox() {
  const navigate = useNavigate();
  const { activeClient } = useTenant();

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressList, setUploadProgressList] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [docTypeHint, setDocTypeHint] = useState("Auto");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [emailCopied, setEmailCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch documents for the active client
  const fetchInboxDocuments = useCallback(async () => {
    if (!activeClient?._id) return;
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter !== "All") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await listDocuments(params);
      setDocuments(res.data?.data?.documents || []);
    } catch (err) {
      console.error("Failed to load inbox documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeClient, statusFilter, searchQuery]);

  useEffect(() => {
    if (activeClient?._id) {
      fetchInboxDocuments();
    }
  }, [fetchInboxDocuments, activeClient]);

  // Periodic polling for active extractions
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) =>
        d.status === "Processing" ||
        d.status === "Queued" ||
        d.status === "processing"
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchInboxDocuments();
    }, 4000);

    return () => clearInterval(interval);
  }, [documents, fetchInboxDocuments]);

  // File Upload Handlers
  const handleFiles = async (files) => {
    if (!files || files.length === 0 || !activeClient) return;

    const fileList = Array.from(files);
    setIsUploading(true);

    // Set mock upload progress rows
    const initialProgress = fileList.map((f) => ({
      name: f.name,
      size: f.size,
      progress: 45,
      status: "uploading",
    }));
    setUploadProgressList(initialProgress);

    try {
      await uploadDocumentsToInbox(fileList, activeClient._id, docTypeHint);
      setUploadProgressList((prev) =>
        prev.map((item) => ({ ...item, progress: 100, status: "extracted" }))
      );
      setTimeout(() => setUploadProgressList([]), 2500);
      await fetchInboxDocuments();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload documents. Please try again.");
      setUploadProgressList([]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleCopyEmail = () => {
    if (!activeClient?.inboxEmail) return;
    navigator.clipboard.writeText(activeClient.inboxEmail);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedDocIds.size === documents.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(documents.map((d) => d._id)));
    }
  };

  const toggleSelectDoc = (id) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Status Filter Counts calculation
  const statusCounts = {
    All: documents.length,
    Needs_Review: documents.filter((d) => d.status === "Needs_Review").length,
    Processing: documents.filter(
      (d) => d.status === "Processing" || d.status === "Queued"
    ).length,
    Voucher_Created: documents.filter((d) => d.status === "Voucher_Created")
      .length,
    Failed: documents.filter((d) => d.status === "Failed").length,
  };

  // Empty client state check (Fixes infinite loading bug)
  if (!activeClient) {
    return (
      <div className="py-6 space-y-6">
        <PageHeader
          title="Document Inbox"
          description="Central ingestion hub for invoices, bills, and bank statements."
        />
        <EmptyState
          icon={Building2}
          title="Select a Client Workspace to View Inbox"
          description="Documents belong to individual client workspaces. Select a client from the top switcher or create a new client to begin uploading."
          actionLabel="+ Create New Client"
          onAction={() => setShowCreateModal(true)}
          actionIcon={PlusCircle}
        />
        <CreateClientModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Action Button */}
      <PageHeader
        title="Document Inbox"
        description={`Intake pipeline for ${activeClient.businessName} (${activeClient.financialYear?.currentFY || "FY 2024-25"})`}
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: "Document Inbox" },
        ]}
      >
        <Button
          variant="primary"
          icon={UploadCloud}
          onClick={() => fileInputRef.current?.click()}
          isLoading={isUploading}
        >
          Upload Invoices
        </Button>
      </PageHeader>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Dedicated Intake Context & Forward Email Banner */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-bold text-sm shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)]">
              {activeClient.businessName}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              GSTIN: {activeClient.gstin || "Unregistered"} • PAN:{" "}
              {activeClient.panNumber || "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[var(--surface-raised)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs">
          <Mail className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
          <span className="text-[var(--text-muted)]">Forward intake email:</span>
          <code className="font-mono font-semibold text-[var(--text-primary)] select-all">
            {activeClient.inboxEmail || "inbox@cksfinbot.com"}
          </code>
          <IconButton
            icon={emailCopied ? Check : Copy}
            size="sm"
            variant="ghost"
            onClick={handleCopyEmail}
            aria-label="Copy intake email address"
            className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          />
        </div>
      </div>

      {/* Slim Drag & Drop Intake Box with Document Hint Selector */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-5 md:p-6 text-center transition-all bg-[var(--surface)]",
          dragActive
            ? "border-[var(--primary)] bg-[var(--primary-light)]/20"
            : "border-[var(--border)] hover:border-[var(--border-strong)]"
        )}
      >
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] mb-2">
            {isUploading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>
          <h4 className="text-xs font-bold text-[var(--text-primary)]">
            {isUploading
              ? "Uploading and running deterministic OCR extraction..."
              : "Drag & drop financial documents here, or click to browse"}
          </h4>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mb-3">
            Supports PDF, JPG/PNG Scans, Excel & CSV statements up to 50MB.
          </p>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Document Type:
            </span>
            <select
              value={docTypeHint}
              onChange={(e) => setDocTypeHint(e.target.value)}
              className="h-8 text-xs rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] px-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
            >
              <option value="Auto">Auto-Detect Type</option>
              <option value="Purchase_Invoice">Purchase Invoice / Bill</option>
              <option value="Sales_Invoice">Sales Invoice</option>
              <option value="Bank_Statement">Bank Statement</option>
              <option value="Expense_Bill">Expense Bill / Receipt</option>
              <option value="Credit_Note">Credit / Debit Note</option>
            </select>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Browse Files
            </Button>
          </div>
        </div>
      </div>

      {/* Uploading Progress Rows */}
      {uploadProgressList.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--primary-border)] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--primary)]">
            <span>Uploading & Ingesting {uploadProgressList.length} files...</span>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          </div>
          <div className="space-y-1.5">
            {uploadProgressList.map((file, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-raised)] text-xs"
              >
                <div className="flex items-center gap-2 truncate max-w-sm">
                  <FileText className="w-4 h-4 text-[var(--primary)]" />
                  <span className="truncate font-medium text-[var(--text-primary)]">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Badge
                  variant={file.status === "extracted" ? "success" : "primary"}
                  size="sm"
                >
                  {file.status === "extracted" ? "Extraction Complete" : "Ingesting"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs with Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: "All", value: "All" },
            { label: "Needs Review", value: "Needs_Review" },
            { label: "Processing", value: "Processing" },
            { label: "Vouchers Ready", value: "Voucher_Created" },
            { label: "Failed", value: "Failed" },
          ].map((tab) => {
            const count = statusCounts[tab.value] || 0;
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-[var(--primary-light)] text-[var(--primary)] font-bold border border-[var(--primary-border)]"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] border border-[var(--border)]"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-tabular",
                    isActive
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface-raised)] text-[var(--text-muted)]"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search filename or invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedDocIds.size > 0 && (
        <div className="px-4 py-2.5 rounded-lg bg-[var(--primary-light)] border border-[var(--primary-border)] flex items-center justify-between text-xs text-[var(--primary)]">
          <span className="font-semibold">
            {selectedDocIds.size} document(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDocIds(new Set())}
            >
              Clear
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const firstId = Array.from(selectedDocIds)[0];
                navigate("/app/review", { state: { documentId: firstId } });
              }}
            >
              Open in Review Queue
            </Button>
          </div>
        </div>
      )}

      {/* Documents Data Table (Responsive with Desktop Table & Mobile Cards) */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--text-primary)]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] font-semibold uppercase text-[10px] tracking-wider select-none">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      documents.length > 0 &&
                      selectedDocIds.size === documents.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Document Details</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4">Status & AI Confidence</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading && documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <TableSkeleton rows={4} cols={5} />
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--text-muted)]">
                    No documents found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const conf = doc.extractedDataId?.extractionConfidence ?? 0.92;
                  const isReady =
                    doc.status === "Needs_Review" ||
                    doc.status === "Voucher_Created";
                  const isSelected = selectedDocIds.has(doc._id);

                  return (
                    <tr
                      key={doc._id}
                      onClick={() => isReady && navigate("/app/review", { state: { documentId: doc._id } })}
                      className={cn(
                        "hover:bg-[var(--surface-raised)]/60 transition-colors cursor-pointer",
                        isSelected && "bg-[var(--primary-light)]/20"
                      )}
                    >
                      <td
                        className="py-3 px-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectDoc(doc._id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-[var(--text-primary)] block max-w-xs truncate">
                              {doc.fileName}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-tabular">
                              {(doc.fileSize / 1024).toFixed(1)} KB
                              {doc.isDuplicate && (
                                <span className="ml-1.5 text-[var(--danger)] font-bold">
                                  Duplicate
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium capitalize text-[var(--text-secondary)]">
                          {doc.documentType.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[var(--text-muted)] font-tabular">
                        {formatDate(doc.createdAt)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <StatusPill status={doc.status} />
                          {isReady && <ConfidenceBar score={conf} />}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isReady ? (
                          <Button
                            variant={doc.status === "Needs_Review" ? "primary" : "outline"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/app/review", { state: { documentId: doc._id } });
                            }}
                            icon={ArrowRight}
                            iconPosition="right"
                          >
                            {doc.status === "Needs_Review" ? "Review" : "View"}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)] font-medium flex items-center justify-end gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin text-[var(--primary)]" />
                            Processing
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (< md) */}
        <div className="md:hidden divide-y divide-[var(--border)]">
          {isLoading && documents.length === 0 ? (
            <div className="p-4">
              <TableSkeleton rows={3} cols={2} />
            </div>
          ) : documents.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No documents found.
            </div>
          ) : (
            documents.map((doc) => {
              const conf = doc.extractedDataId?.extractionConfidence ?? 0.92;
              const isReady =
                doc.status === "Needs_Review" ||
                doc.status === "Voucher_Created";

              return (
                <div
                  key={doc._id}
                  onClick={() => isReady && navigate("/app/review", { state: { documentId: doc._id } })}
                  className="p-4 space-y-2.5 hover:bg-[var(--surface-raised)]/50 active:bg-[var(--surface-raised)] transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate max-w-[200px]">
                        {doc.fileName}
                      </span>
                    </div>
                    <StatusPill status={doc.status} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="capitalize">{doc.documentType.replace("_", " ")}</span>
                    <span className="font-tabular">{formatDate(doc.createdAt)}</span>
                  </div>

                  {isReady && (
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                      <ConfidenceBar score={conf} />
                      <span className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1">
                        {doc.status === "Needs_Review" ? "Review & Post" : "View Voucher"}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
