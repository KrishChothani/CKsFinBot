/** @format */

import React, { useState } from "react";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Edit2,
  Check,
} from "lucide-react";
import Badge from "../ui/Badge";
import { cn } from "../../lib/utils";

export const ReferenceFieldInput = ({
  label,
  value,
  fieldRef = {},
  onChange,
  onHighlight,
  type = "text",
  placeholder = "",
  className = "",
}) => {
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState(fieldRef.overrideReason || "");

  const isLocated = fieldRef.isLocated !== false;
  const isOverridden = fieldRef.isOverridden === true;
  const confidence = fieldRef.confidence || 0.95;
  const hasBox = !!fieldRef.boundingBox;

  const handleLocateClick = () => {
    if (onHighlight && fieldRef.boundingBox) {
      onHighlight(fieldRef.boundingBox, fieldRef.page || 1);
    }
  };

  const handleOverrideSave = () => {
    if (onChange) {
      onChange(value, { isOverridden: true, overrideReason });
    }
    setShowOverrideModal(false);
  };

  return (
    <div className={cn("space-y-1 text-xs", className)}>
      <div className="flex items-center justify-between">
        <label className="font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
          <span>{label}</span>
          {!isLocated && !isOverridden && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded"
              title="This value could not be located verbatim in the document text layer"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Unlocated</span>
            </span>
          )}
          {isOverridden && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded">
              <Check className="w-3 h-3" />
              <span>CA Overridden</span>
            </span>
          )}
        </label>

        {/* Confidence & Locate icon */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            {Math.round(confidence * 100)}%
          </span>
          {hasBox && (
            <button
              type="button"
              onClick={handleLocateClick}
              className="p-1 rounded hover:bg-[var(--surface-raised)] text-[var(--primary)] hover:text-[var(--primary-hover)] cursor-pointer"
              title="Click to highlight exact source box on document"
            >
              <Target className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <input
          type={type}
          value={value !== undefined && value !== null ? value : ""}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 transition-all",
            !isLocated && !isOverridden
              ? "border-amber-500/60 focus:ring-amber-500"
              : "border-[var(--border)] focus:ring-[var(--primary)]"
          )}
        />
      </div>

      {/* Disagreement / Unlocated Alert */}
      {!isLocated && !isOverridden && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
          <span>Not located in document text layer. Must be confirmed before voucher posting.</span>
          <button
            type="button"
            onClick={() => setShowOverrideModal(true)}
            className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0"
          >
            Override
          </button>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] space-y-2 mt-1">
          <span className="font-semibold text-[11px] text-[var(--text-primary)] block">
            Confirm Human Override for {label}
          </span>
          <input
            type="text"
            placeholder="Reason (e.g. Verified handwritten vendor invoice number)"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="w-full text-xs p-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
          />
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setShowOverrideModal(false)}
              className="px-2 py-1 text-[10px] rounded hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOverrideSave}
              className="px-2.5 py-1 text-[10px] font-bold rounded bg-[var(--primary)] text-white"
            >
              Confirm Override
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferenceFieldInput;

