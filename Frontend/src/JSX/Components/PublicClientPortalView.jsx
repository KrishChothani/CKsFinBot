/** @format */

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building,
  RefreshCw,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  getPublicPortalDetails,
  uploadPublicPortalFile,
} from "../../services/apiClient";

const PublicClientPortalView = () => {
  const { token } = useParams();
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        const res = await getPublicPortalDetails(token);
        setDetails(res.data?.data);
      } catch (err) {
        setErrorMsg(
          err.response?.data?.message || "Invalid or expired document intake link."
        );
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchRequestDetails();
  }, [token]);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await uploadPublicPortalFile(token, selectedFile);
      setUploadSuccess(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload document. Please retry.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[var(--primary)] animate-spin mx-auto" />
          <p className="text-sm text-[var(--text-muted)]">Verifying secure document portal link...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Invalid or Expired Link</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{errorMsg}</p>
          <div className="pt-2">
            <span className="text-[11px] text-[var(--text-muted)]">
              Please reach out to your Chartered Accountant or finance team for an updated link.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col justify-between text-[var(--text-primary)]">
      {/* Top Navigation / Brand */}
      <header className="px-6 py-4 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs shadow-md">
            CK
          </div>
          <div>
            <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              {details?.firmName || "Chartered Accountants & Financial Advisors"}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verified Secure Client Intake Portal</span>
            </div>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs font-semibold text-[var(--text-primary)] block">
            {details?.clientName}
          </span>
          {details?.clientGstin && (
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              GSTIN: {details?.clientGstin}
            </span>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-xl w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
          {uploadSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Document Received Successfully!</h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                Your file has been safely submitted to <strong className="text-[var(--text-primary)]">{details?.firmName}</strong> for client entity <strong className="text-[var(--text-primary)]">{details?.clientName}</strong>.
              </p>
              <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-3 rounded-xl max-w-sm mx-auto text-left text-xs space-y-1">
                <div className="text-[var(--text-muted)]">Request: <span className="text-[var(--text-primary)] font-medium">{details?.title}</span></div>
                <div className="text-[var(--text-muted)]">Status: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Under CA Review</span></div>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] pt-2">
                You can safely close this browser window.
              </p>
            </div>
          ) : (
            <>
              {/* Request Details Header */}
              <div className="space-y-2 border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                    {details?.documentCategory?.replace("_", " ")}
                  </span>
                  {details?.period && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)] font-mono">
                      {details?.period}
                    </span>
                  )}
                  {details?.urgency === "Urgent" && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-500/20">
                      High Priority Deadline
                    </span>
                  )}
                </div>

                <h1 className="text-lg md:text-xl font-bold text-[var(--text-primary)]">{details?.title}</h1>

                {details?.description ? (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-200">
                    <strong className="text-[var(--text-primary)] block mb-0.5">Note from your accountant:</strong>
                    {details.description}
                  </div>
                ) : null}
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  dragOver
                    ? "border-[var(--primary)] bg-[var(--primary-light)]/20"
                    : "border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]"
                }`}
                onClick={() => document.getElementById("client-portal-file-input").click()}
              >
                <input
                  id="client-portal-file-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
                />

                <UploadCloud className="w-10 h-10 text-[var(--primary)] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {selectedFile ? selectedFile.name : "Drag & drop your document here, or click to browse"}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Supports PDF statements, Scanned Invoices (PNG/JPG), and Excel/CSV registers up to 50MB
                </p>
              </div>

              {/* Selected File Details */}
              {selectedFile && (
                <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate max-w-sm">
                    <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
                    <span className="font-medium text-[var(--text-primary)] truncate">{selectedFile.name}</span>
                    <span className="text-[var(--text-muted)] text-[10px]">
                      ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-[var(--text-muted)] hover:text-red-500 text-xs font-semibold"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleUploadSubmit}
                disabled={!selectedFile || isUploading}
                className="w-full py-3 bg-[var(--primary)] hover:opacity-95 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Uploading and verifying document...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Submit Document to Accountant</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
        Powered by CKsFinBot Enterprise • End-to-End Encrypted Financial Document Intake
      </footer>
    </div>
  );
};

export default PublicClientPortalView;
