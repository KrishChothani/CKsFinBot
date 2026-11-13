/** @format */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Save,
  Check,
  X,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Building,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  Eye,
  Target,
  Info,
  Calendar,
  Hash,
  MapPin,
} from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";
import {
  getReviewQueue,
  getDocumentReviewDetail,
  updateExtractedFields,
  approveAndGenerateVoucher,
  rejectDocument,
} from "../../services/apiClient";
import { formatINR } from "../../lib/format";
import { Button, IconButton } from "../../components/ui/Button";
import { Badge, StatusPill } from "../../components/ui/Badge";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/Tabs";
import { cn } from "../../lib/utils";
import DocumentCanvasViewer from "../../components/viewer/DocumentCanvasViewer";
import ValidationPanel from "../../components/validation/ValidationPanel";
import ReferenceFieldInput from "../../components/review/ReferenceFieldInput";

const ReviewQueueView = ({ initialDocumentId, onVoucherCreated, onBackToInbox }) => {
  const { activeClient } = useTenant();
  const [selectedDocId, setSelectedDocId] = useState(initialDocumentId || null);
  const [queueDocs, setQueueDocs] = useState([]);
  const [docDetail, setDocDetail] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [mobileTab, setMobileTab] = useState("fields"); // "doc" | "fields" | "validation"

  // Click-to-source interactive state
  const [highlightedBox, setHighlightedBox] = useState(null);
  const [highlightedPage, setHighlightedPage] = useState(1);
  const [activeWordToken, setActiveWordToken] = useState(null);

  // Editable Form State
  const [invoiceDetails, setInvoiceDetails] = useState({});
  const [counterParty, setCounterParty] = useState({});
  const [lineItems, setLineItems] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({});
  const [ruleEvaluations, setRuleEvaluations] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [pages, setPages] = useState([]);

  // Fetch pending review documents list
  const fetchQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const res = await getReviewQueue({ status: "Needs_Review" });
      const docs = res.data?.data?.documents || [];
      setQueueDocs(docs);
      if (!selectedDocId && docs.length > 0) {
        setSelectedDocId(docs[0]._id);
      }
    } catch (err) {
      console.error("Queue fetch error:", err);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [selectedDocId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Load document review detail when selectedDocId changes
  const loadDetail = useCallback(async (docId) => {
    if (!docId) return;
    setIsLoadingDetail(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setHighlightedBox(null);
    setActiveWordToken(null);
    try {
      const res = await getDocumentReviewDetail(docId);
      const data = res.data?.data;
      setDocDetail(data);

      const ext = data?.extractedData || {};
      setInvoiceDetails(ext.invoiceDetails || {});
      setCounterParty(ext.counterParty || {});
      setLineItems(ext.lineItems || []);
      setFinancialSummary(ext.financialSummary || {});
      setRuleEvaluations(ext.ruleEvaluations || []);
      setTokens(ext.tokens || []);
      setPages(ext.pages || []);
    } catch (err) {
      console.error("Detail load error:", err);
      setErrorMessage("Failed to load document review data.");
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      loadDetail(selectedDocId);
    }
  }, [selectedDocId, loadDetail]);

  // Click-to-source highlight handler
  const handleHighlight = (boundingBox, page = 1) => {
    if (boundingBox) {
      setHighlightedBox(boundingBox);
      setHighlightedPage(page || 1);
    }
  };

  // Click on word token on the canvas
  const handleBoxClick = (tok) => {
    const box = tok.normBbox || tok.bbox;
    setHighlightedBox(box);
    setHighlightedPage(tok.page || 1);
    setActiveWordToken(tok);
  };

  // Safe reference field updater
  const handleReferenceChange = (section, fieldKey, newVal, overrideMeta) => {
    if (section === "invoiceDetails") {
      setInvoiceDetails((prev) => {
        const cur = prev[fieldKey];
        const isObj = typeof cur === "object" && cur !== null;
        return {
          ...prev,
          [fieldKey]: isObj
            ? { ...cur, value: newVal, ...(overrideMeta || {}) }
            : { value: newVal, ...(overrideMeta || {}) },
        };
      });
    } else if (section === "counterParty") {
      setCounterParty((prev) => {
        const cur = prev[fieldKey];
        const isObj = typeof cur === "object" && cur !== null;
        return {
          ...prev,
          [fieldKey]: isObj
            ? { ...cur, value: newVal, ...(overrideMeta || {}) }
            : { value: newVal, ...(overrideMeta || {}) },
        };
      });
    }
  };

  // Line items dynamic calculation
  const recalculateTotals = (items) => {
    let sub = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    items.forEach((item) => {
      const taxable = Number(item.taxableAmount) || 0;
      sub += taxable;
      cgst += Number(item.cgstAmount) || 0;
      sgst += Number(item.sgstAmount) || 0;
      igst += Number(item.igstAmount) || 0;
    });

    sub = Math.round(sub * 100) / 100;
    cgst = Math.round(cgst * 100) / 100;
    sgst = Math.round(sgst * 100) / 100;
    igst = Math.round(igst * 100) / 100;

    const roundOff = Number(financialSummary.roundOff) || 0;
    const grand = Math.round((sub + cgst + sgst + igst + roundOff) * 100) / 100;

    setFinancialSummary((prev) => ({
      ...prev,
      subTotal: sub,
      totalCgst: cgst,
      totalSgst: sgst,
      totalIgst: igst,
      grandTotal: grand,
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate taxable amount if qty or rate changes
    if (field === "quantity" || field === "rate") {
      const q = field === "quantity" ? Number(value) : Number(updated[index].quantity || 1);
      const r = field === "rate" ? Number(value) : Number(updated[index].rate || 0);
      const taxable = Math.round(q * r * 100) / 100;
      updated[index].taxableAmount = taxable;

      // Recalculate tax amounts based on gstRate
      const rate = Number(updated[index].gstRate || 18);
      const taxAmt = Math.round(taxable * (rate / 100) * 100) / 100;
      if (updated[index].igstAmount > 0) {
        updated[index].igstAmount = taxAmt;
      } else {
        const half = Math.round((taxAmt / 2) * 100) / 100;
        updated[index].cgstAmount = half;
        updated[index].sgstAmount = half;
      }
      updated[index].totalAmount = Math.round((taxable + taxAmt) * 100) / 100;
    }

    setLineItems(updated);
    recalculateTotals(updated);
  };

  // Detect unlocated critical fields that gate voucher posting
  const unlocatedFields = useMemo(() => {
    const list = [];
    const check = (refObj, label) => {
      if (refObj && typeof refObj === "object") {
        if (refObj.isLocated === false && !refObj.isOverridden) {
          list.push(label);
        }
      }
    };
    check(invoiceDetails.invoiceNumber, "Invoice Number");
    check(invoiceDetails.invoiceDate, "Invoice Date");
    check(counterParty.gstin || counterParty.supplierGstin, "Supplier GSTIN");
    return list;
  }, [invoiceDetails, counterParty]);

  const handleSaveFields = async () => {
    if (!selectedDocId) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await updateExtractedFields(selectedDocId, {
        invoiceDetails,
        counterParty,
        lineItems,
        financialSummary,
      });
      if (res.data?.data?.ruleEvaluations) {
        setRuleEvaluations(res.data.data.ruleEvaluations);
      }
      setSuccessMessage("Extracted fields & statutory checks saved successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setErrorMessage(err.response?.data?.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDocId) return;

    // Strict 100% human review gate: warn if critical unlocated fields remain
    if (unlocatedFields.length > 0) {
      const confirmed = window.confirm(
        `Critical field(s) (${unlocatedFields.join(
          ", "
        )}) could not be located in the original document text layer.\n\nStatutory compliance requires an explicit CA confirmation. Would you like to confirm CA verification for all unlocated fields now?`
      );
      if (!confirmed) return;

      // Automatically apply CA confirmation override
      const updatedInv = { ...invoiceDetails };
      if (updatedInv.invoiceNumber?.isLocated === false) {
        updatedInv.invoiceNumber = {
          ...updatedInv.invoiceNumber,
          isOverridden: true,
          overrideReason: "CA visually confirmed from document",
        };
      }
      if (updatedInv.invoiceDate?.isLocated === false) {
        updatedInv.invoiceDate = {
          ...updatedInv.invoiceDate,
          isOverridden: true,
          overrideReason: "CA visually confirmed from document",
        };
      }
      const updatedCp = { ...counterParty };
      const gstinKey = updatedCp.gstin ? "gstin" : "supplierGstin";
      if (updatedCp[gstinKey]?.isLocated === false) {
        updatedCp[gstinKey] = {
          ...updatedCp[gstinKey],
          isOverridden: true,
          overrideReason: "CA visually confirmed from document",
        };
      }
      setInvoiceDetails(updatedInv);
      setCounterParty(updatedCp);

      await updateExtractedFields(selectedDocId, {
        invoiceDetails: updatedInv,
        counterParty: updatedCp,
        lineItems,
        financialSummary,
      });
    }

    setIsApproving(true);
    setErrorMessage(null);
    try {
      await updateExtractedFields(selectedDocId, {
        invoiceDetails,
        counterParty,
        lineItems,
        financialSummary,
      });

      const res = await approveAndGenerateVoucher(selectedDocId);
      const voucher = res.data?.data?.voucher;

      alert(`Double-entry voucher ${voucher?.voucherNumber || ""} posted successfully to books!`);
      if (onVoucherCreated) {
        onVoucherCreated(voucher);
      } else {
        fetchQueue();
      }
    } catch (err) {
      console.error("Approval error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to post voucher.";
      setErrorMessage(msg);
      alert(msg);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDocId) return;
    const reason = prompt("Enter reason for rejection (e.g. Blurry scan, illegible GSTIN, duplicate bill):");
    if (!reason) return;

    try {
      await rejectDocument(selectedDocId, reason);
      alert("Document rejected and archived.");
      fetchQueue();
    } catch (err) {
      console.error("Reject error:", err);
      alert(err.response?.data?.message || "Failed to reject document.");
    }
  };

  // Keyboard Shortcuts: Alt+A (Approve), Alt+R (Reject), Alt+S (Save), Escape (Clear highlight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveFields();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleApprove();
      }
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        handleApprove();
      }
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        handleReject();
      }
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSaveFields();
      }
      if (e.key === "Escape") {
        setHighlightedBox(null);
        setActiveWordToken(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDocId, invoiceDetails, counterParty, lineItems, financialSummary, unlocatedFields]);

  if (!selectedDocId && queueDocs.length === 0 && !isLoadingQueue) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--surface)] border border-[var(--border)] rounded-xl my-4">
        <CheckCircle2 className="w-12 h-12 text-[var(--success)] mb-3" />
        <h2 className="text-base font-bold text-[var(--text-primary)]">Review Queue is Clear!</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
          All uploaded documents have been verified against GSTIN checksums, matched to line items, and converted to accounting vouchers.
        </p>
        {onBackToInbox && (
          <Button
            variant="primary"
            size="sm"
            onClick={onBackToInbox}
            className="mt-4"
          >
            Upload More Documents
          </Button>
        )}
      </div>
    );
  }

  const document = docDetail?.document;

  // Extract plain values & field refs safely
  const invNumVal = typeof invoiceDetails.invoiceNumber === "object" ? invoiceDetails.invoiceNumber?.value : invoiceDetails.invoiceNumber || "";
  const invDateVal = typeof invoiceDetails.invoiceDate === "object" ? invoiceDetails.invoiceDate?.value : invoiceDetails.invoiceDate || "";
  const posVal = typeof invoiceDetails.placeOfSupply === "object" ? invoiceDetails.placeOfSupply?.value : invoiceDetails.placeOfSupply || "";

  const supNameVal = typeof counterParty.name === "object" ? counterParty.name?.value : counterParty.name || "";
  const supGstinObj = counterParty.gstin || counterParty.supplierGstin;
  const supGstinVal = typeof supGstinObj === "object" ? supGstinObj?.value : supGstinObj || "";

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
      {/* Top Review Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[var(--surface-raised)] border-b border-[var(--border)] z-20 gap-2">
        <div className="flex items-center gap-2">
          {onBackToInbox && (
            <IconButton
              icon={ArrowLeft}
              size="sm"
              variant="ghost"
              onClick={onBackToInbox}
              aria-label="Back to Document Inbox"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            />
          )}

          {/* Queue Selector */}
          <select
            value={selectedDocId || ""}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="h-8 bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] max-w-[240px] truncate font-medium cursor-pointer"
          >
            {queueDocs.map((qd) => (
              <option key={qd._id} value={qd._id}>
                {qd.fileName} ({qd.documentType.replace("_", " ")})
              </option>
            ))}
          </select>

          {/* Mobile Tab Switcher (< lg) */}
          <div className="lg:hidden">
            <Tabs value={mobileTab} onValueChange={setMobileTab}>
              <TabsList className="h-8">
                <TabsTrigger value="fields" className="text-xs px-2 py-0.5">
                  Fields
                </TabsTrigger>
                <TabsTrigger value="doc" className="text-xs px-2 py-0.5">
                  Viewer
                </TabsTrigger>
                <TabsTrigger value="validation" className="text-xs px-2 py-0.5">
                  Rules
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {successMessage && (
            <span className="text-xs text-[var(--success)] flex items-center gap-1 font-semibold animate-fade-in">
              <Check className="w-3.5 h-3.5" /> {successMessage}
            </span>
          )}
          {errorMessage && (
            <span className="text-xs text-[var(--danger)] flex items-center gap-1 font-semibold animate-fade-in">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {errorMessage}
            </span>
          )}
        </div>

        {/* Action Buttons with Keyboard Shortcuts */}
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={handleReject}
            className="text-xs"
            title="Reject document (Alt+R)"
          >
            Reject <kbd className="hidden md:inline ml-1 text-[10px] opacity-75 font-mono">Alt+R</kbd>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={Save}
            onClick={handleSaveFields}
            isLoading={isSaving}
            className="text-xs"
            title="Save changes (Ctrl+S or Alt+S)"
          >
            <span className="hidden sm:inline">Save</span>
            <kbd className="hidden md:inline ml-1 text-[10px] text-[var(--text-muted)] font-mono">
              Alt+S
            </kbd>
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={CheckCircle2}
            onClick={handleApprove}
            isLoading={isApproving}
            className="text-xs font-bold shadow-sm"
            title="Approve and post double-entry voucher (Ctrl+Enter or Alt+A)"
          >
            <span>Post Voucher</span>
            <kbd className="hidden md:inline ml-1 text-[10px] opacity-80 font-mono">
              Alt+A
            </kbd>
          </Button>
        </div>
      </div>

      {/* Unlocated Critical Fields Warning Banner */}
      {unlocatedFields.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>100% Human Review Gate:</strong> Field(s){" "}
              <code className="px-1 py-0.5 rounded bg-amber-500/20 font-bold font-mono">
                {unlocatedFields.join(", ")}
              </code>{" "}
              could not be located verbatim in document text. CA override required before posting.
            </span>
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold shrink-0">
            Click &apos;Override&apos; on field or confirm on Post
          </span>
        </div>
      )}

      {/* Main Split Layout: Left PDF/Canvas Viewer | Right Extracted Form & Validation */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Document Preview Canvas with Click-to-Source Overlays */}
        <div
          className={cn(
            "flex-1 bg-[var(--surface-raised)] border-r border-[var(--border)] relative flex flex-col overflow-hidden",
            mobileTab === "fields" || mobileTab === "validation" ? "hidden lg:flex" : "flex"
          )}
        >
          {isLoadingDetail ? (
            <div className="flex-1 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
              <RefreshCw className="w-5 h-5 animate-spin text-[var(--primary)]" />
              <span>Loading source document & bounding boxes...</span>
            </div>
          ) : (
            <DocumentCanvasViewer
              documentUrl={document?.s3Url}
              fileName={document?.fileName}
              pages={pages}
              tokens={tokens}
              highlightedBox={highlightedBox}
              highlightedPage={highlightedPage}
              onBoxClick={handleBoxClick}
            />
          )}
        </div>

        {/* Right Side: Structured Extracted Fields & Validation Panel */}
        <div
          className={cn(
            "w-full lg:w-[560px] xl:w-[640px] bg-[var(--surface)] overflow-y-auto p-4 sm:p-5 space-y-4",
            mobileTab === "doc" ? "hidden lg:block" : "block"
          )}
        >
          {/* Active Canvas Click Hint */}
          {activeWordToken && (
            <div className="p-2.5 rounded-lg bg-[var(--primary-light)]/40 border border-[var(--primary)]/20 text-xs text-[var(--primary)] flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Target className="w-4 h-4 shrink-0" />
                <span>Selected Word on Document: &quot;<strong>{activeWordToken.text}</strong>&quot; (Page {activeWordToken.page})</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveWordToken(null);
                  setHighlightedBox(null);
                }}
                className="text-[11px] font-bold hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          {/* Deterministic Validation Panel */}
          <ValidationPanel evaluations={ruleEvaluations} />

          {/* Counterparty / Vendor Details Card */}
          <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Supplier / Vendor Particulars</span>
              </h4>
              <Badge variant="primary" size="sm">
                Confidence: {Math.round((counterParty.name?.confidence || 0.94) * 100)}%
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ReferenceFieldInput
                label="Supplier / Vendor Name"
                value={supNameVal}
                fieldRef={typeof counterParty.name === "object" ? counterParty.name : { value: supNameVal }}
                onChange={(val, meta) => handleReferenceChange("counterParty", "name", val, meta)}
                onHighlight={handleHighlight}
                placeholder="e.g. Tata Steel BSL Ltd"
              />

              <ReferenceFieldInput
                label="Supplier GSTIN"
                value={supGstinVal}
                fieldRef={typeof supGstinObj === "object" ? supGstinObj : { value: supGstinVal }}
                onChange={(val, meta) =>
                  handleReferenceChange("counterParty", counterParty.gstin ? "gstin" : "supplierGstin", val ? val.toUpperCase() : "", meta)
                }
                onHighlight={handleHighlight}
                placeholder="15-digit GSTIN"
              />
            </div>
          </div>

          {/* Invoice Details Card */}
          <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Invoice Reference & Statutory Dates</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ReferenceFieldInput
                label="Invoice Number"
                value={invNumVal}
                fieldRef={typeof invoiceDetails.invoiceNumber === "object" ? invoiceDetails.invoiceNumber : { value: invNumVal }}
                onChange={(val, meta) => handleReferenceChange("invoiceDetails", "invoiceNumber", val, meta)}
                onHighlight={handleHighlight}
                placeholder="e.g. INV-2026-001"
              />

              <ReferenceFieldInput
                label="Invoice Date"
                type="date"
                value={invDateVal ? (invDateVal.includes("T") ? invDateVal.split("T")[0] : invDateVal) : ""}
                fieldRef={typeof invoiceDetails.invoiceDate === "object" ? invoiceDetails.invoiceDate : { value: invDateVal }}
                onChange={(val, meta) => handleReferenceChange("invoiceDetails", "invoiceDate", val, meta)}
                onHighlight={handleHighlight}
              />

              <ReferenceFieldInput
                label="Place of Supply"
                value={posVal}
                fieldRef={typeof invoiceDetails.placeOfSupply === "object" ? invoiceDetails.placeOfSupply : { value: posVal }}
                onChange={(val, meta) => handleReferenceChange("invoiceDetails", "placeOfSupply", val, meta)}
                onHighlight={handleHighlight}
                placeholder="e.g. 24-Gujarat"
              />
            </div>
          </div>

          {/* Line Items Table with Click-to-Source Targets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Line Items Breakdown ({lineItems.length})</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  const newItem = {
                    description: "Item",
                    hsnCode: "",
                    quantity: 1,
                    unit: "NOS",
                    rate: 0,
                    taxableAmount: 0,
                    gstRate: 18,
                    cgstAmount: 0,
                    sgstAmount: 0,
                    igstAmount: 0,
                    totalAmount: 0,
                  };
                  setLineItems([...lineItems, newItem]);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-[var(--border)] rounded-xl overflow-x-auto bg-[var(--surface-raised)]/30">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--surface-raised)] border-b border-[var(--border)] text-[var(--text-muted)] font-semibold text-[10px] uppercase">
                    <th className="py-2 px-2.5">Description</th>
                    <th className="py-2 px-2">HSN</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-2 text-right">Taxable</th>
                    <th className="py-2 px-2 text-right">GST%</th>
                    <th className="py-2 px-2 text-right">Total</th>
                    <th className="py-2 px-1 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {lineItems.map((item, idx) => {
                    const itemBox = item.boundingBox || (item.fieldRef && item.fieldRef.boundingBox);
                    return (
                      <tr key={idx} className="hover:bg-[var(--surface-raised)]/50 transition-colors">
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1">
                            {itemBox && (
                              <button
                                type="button"
                                onClick={() => handleHighlight(itemBox, item.page || 1)}
                                className="p-0.5 text-[var(--primary)] hover:opacity-80"
                                title="Highlight line item source on document"
                              >
                                <Target className="w-3 h-3" />
                              </button>
                            )}
                            <input
                              type="text"
                              value={item.description || ""}
                              onChange={(e) => handleLineItemChange(idx, "description", e.target.value)}
                              className="w-full bg-transparent border-b border-transparent focus:border-[var(--primary)] text-xs text-[var(--text-primary)] px-1 py-0.5 outline-none font-medium"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={item.hsnCode || ""}
                            onChange={(e) => handleLineItemChange(idx, "hsnCode", e.target.value)}
                            className="w-16 bg-transparent border-b border-transparent focus:border-[var(--primary)] text-xs text-[var(--text-primary)] px-1 py-0.5 outline-none font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(idx, "quantity", e.target.value)}
                            className="w-12 bg-transparent border-b border-transparent focus:border-[var(--primary)] text-xs text-[var(--text-primary)] text-right px-1 py-0.5 outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleLineItemChange(idx, "rate", e.target.value)}
                            className="w-16 bg-transparent border-b border-transparent focus:border-[var(--primary)] text-xs text-[var(--text-primary)] text-right px-1 py-0.5 outline-none font-mono font-tabular"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.taxableAmount}
                            onChange={(e) => handleLineItemChange(idx, "taxableAmount", e.target.value)}
                            className="w-18 bg-transparent border-b border-transparent focus:border-[var(--primary)] text-xs text-[var(--text-primary)] text-right px-1 py-0.5 outline-none font-mono font-tabular"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="number"
                            value={item.gstRate || 18}
                            onChange={(e) => handleLineItemChange(idx, "gstRate", e.target.value)}
                            className="w-10 bg-transparent border-b border-transparent focus:border-[var(--primary)] text-xs text-[var(--text-primary)] text-right px-1 py-0.5 outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold font-tabular text-[var(--text-primary)]">
                          ₹{(item.totalAmount || item.taxableAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-1.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = lineItems.filter((_, i) => i !== idx);
                              setLineItems(updated);
                              recalculateTotals(updated);
                            }}
                            className="text-[var(--text-muted)] hover:text-[var(--danger)] p-0.5 cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary Calculation Card */}
          <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] space-y-2 shadow-xs">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border)] pb-2">
              Financial Summary & Double-Entry Math
            </h4>

            <div className="space-y-1.5 text-xs text-[var(--text-secondary)] font-tabular">
              <div className="flex justify-between py-0.5">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {formatINR(financialSummary.subTotal, { showDecimals: true })}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Total CGST:</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {formatINR(financialSummary.totalCgst, { showDecimals: true })}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Total SGST:</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {formatINR(financialSummary.totalSgst, { showDecimals: true })}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Total IGST:</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {formatINR(financialSummary.totalIgst, { showDecimals: true })}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Round Off Adjustment:</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {formatINR(financialSummary.roundOff, { showDecimals: true })}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--border)] text-sm font-bold text-[var(--text-primary)]">
                <span>Grand Total (Payable):</span>
                <span className="font-mono text-[var(--primary)] font-bold">
                  {formatINR(financialSummary.grandTotal, { showDecimals: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewQueueView;
