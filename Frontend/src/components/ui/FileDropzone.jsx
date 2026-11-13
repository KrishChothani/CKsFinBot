/** @format */

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Copy, Check, Mail, FileText } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

export const FileDropzone = ({
  onDropFiles,
  clientIntakeEmail,
  isUploading = false,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles?.length > 0 && onDropFiles) {
        onDropFiles(acceptedFiles);
      }
    },
    [onDropFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
  });

  const handleCopyEmail = (e) => {
    e.stopPropagation();
    if (!clientIntakeEmail) return;
    navigator.clipboard.writeText(clientIntakeEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden transition-all",
        isDragActive && "border-[var(--primary)] ring-2 ring-[var(--primary-light)]",
        className
      )}
    >
      <div
        {...getRootProps()}
        className="p-5 md:p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[var(--surface-raised)]/50 transition-colors"
      >
        <input {...getInputProps()} />
        <div className="w-12 h-12 rounded-xl bg-[var(--primary-light)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)] mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {isDragActive
            ? "Drop the financial documents here..."
            : "Click to upload or drag & drop"}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          PDF, Images (JPG, PNG), Excel (.xlsx, .csv) up to 25MB
        </p>
      </div>

      {clientIntakeEmail && (
        <div className="px-5 py-2.5 bg-[var(--surface-raised)]/70 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Mail className="w-4 h-4 text-[var(--primary)]" />
            <span>Forward email intake:</span>
            <span className="font-mono text-[var(--text-primary)] font-semibold select-all">
              {clientIntakeEmail}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyEmail}
            icon={copied ? Check : Copy}
            className="h-7 px-2 text-xs"
          >
            {copied ? "Copied" : "Copy Email"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;

