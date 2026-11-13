/** @format */

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  FileSpreadsheet,
  Building,
} from "lucide-react";
import { useTenant } from "../Contexts/TenantContext";
import { listDocuments, uploadDocumentsToInbox } from "../../services/apiClient";

const DocumentInboxView = ({ onSelectForReview }) => {
  const { activeClient } = useTenant();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [docTypeHint, setDocTypeHint] = useState("Auto");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

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
    fetchInboxDocuments();
  }, [fetchInboxDocuments]);

  // Periodic polling for processing documents
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === "Processing" || d.status === "Queued" || d.status === "processing"
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

    setIsUploading(true);
    try {
      const fileList = Array.from(files);
      await uploadDocumentsToInbox(fileList, activeClient._id, docTypeHint);
      await fetchInboxDocuments();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload documents. Please try again.");
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

  const renderStatusBadge = (status, confidence) => {
    if (status === "Needs_Review") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <Clock className="w-3 h-3" />
          <span>Needs Review ({Math.round((confidence || 0.9) * 100)}%)</span>
        </span>
      );
    }
    if (status === "Voucher_Created" || status === "Approved" || status === "processed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3 h-3" />
          <span>Voucher Created</span>
        </span>
      );
    }
    if (status === "Failed" || status === "failed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40">
          <AlertTriangle className="w-3 h-3" />
          <span>Failed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Extracting...</span>
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#070b14] p-4 sm:p-6 space-y-6">
      {/* Top Client Entity Context Banner */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-[#0d1424] border border-gray-800 rounded-xl gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {activeClient ? activeClient.businessName : "Select Client Workspace"}
            </h2>
            <p className="text-xs text-gray-400">
              {activeClient?.gstin ? `GSTIN: ${activeClient.gstin}` : "No GSTIN attached"} • FY:{" "}
              {activeClient?.financialYear?.currentFY || "2024-2025"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Dedicated Intake Email:</span>
          <code className="text-xs font-mono bg-gray-900 border border-gray-700 px-2.5 py-1 rounded-md text-blue-400">
            {activeClient?.inboxEmail || "inbox@cksfinbot.com"}
          </code>
        </div>
      </div>

      {/* Drag & Drop Intake Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-950/20"
            : "border-gray-800 hover:border-gray-700 bg-[#0a0f1d]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
            {isUploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">
              {isUploading ? "Uploading and extracting..." : "Drop Invoices, Bills, or Bank Statements here"}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Supports PDF, Scanned Images (JPG/PNG), Excel / CSV. Max 50MB per file.
            </p>
          </div>

          {/* Document Type Hint Selection */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-xs text-gray-400 font-medium">Document Hint:</span>
            <select
              value={docTypeHint}
              onChange={(e) => setDocTypeHint(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
            >
              <option value="Auto">Auto-Detect Type</option>
              <option value="Purchase_Invoice">Purchase Invoice / Bill</option>
              <option value="Sales_Invoice">Sales Invoice</option>
              <option value="Bank_Statement">Bank Statement</option>
              <option value="Expense_Bill">Expense Bill / Receipt</option>
              <option value="Credit_Note">Credit / Debit Note</option>
            </select>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !activeClient}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              Browse Files
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {["All", "Needs_Review", "Processing", "Voucher_Created", "Failed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-gray-900 text-gray-300 hover:text-white border border-gray-800"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search document name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-[#0a0f1d] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300 border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Detected Type</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4">Status & AI Confidence</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {isLoading && documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Loading inbox documents...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    No documents uploaded yet for this workspace. Upload your first invoice or bill above!
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const conf = doc.extractedDataId?.extractionConfidence || 0.9;
                  const isReadyForReview = doc.status === "Needs_Review" || doc.status === "Voucher_Created";

                  return (
                    <tr
                      key={doc._id}
                      className="hover:bg-gray-900/40 transition-colors cursor-pointer"
                      onClick={() => isReadyForReview && onSelectForReview(doc._id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div>
                            <span className="font-semibold text-white block max-w-xs truncate">
                              {doc.fileName}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {(doc.fileSize / 1024).toFixed(1)} KB {doc.isDuplicate && "• Duplicate"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-300">
                          {doc.documentType.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-gray-400">
                        {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3 px-4">{renderStatusBadge(doc.status, conf)}</td>

                      <td className="py-3 px-4 text-right">
                        {isReadyForReview ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectForReview(doc._id);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors shadow-sm"
                          >
                            <span>{doc.status === "Voucher_Created" ? "View Voucher" : "Review & Post"}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-gray-500 text-xs">Processing...</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocumentInboxView;

