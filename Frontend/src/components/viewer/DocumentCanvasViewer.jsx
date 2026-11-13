/** @format */

import React, { useState, useRef, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Target,
  FileText,
  Sparkles,
} from "lucide-react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { cn } from "../../lib/utils";

export const DocumentCanvasViewer = ({
  documentUrl,
  fileName,
  pages = [],
  tokens = [],
  highlightedBox = null, // [x0, y0, x1, y1] normalized to 0-1000
  highlightedPage = 1,
  onBoxClick,
  className = "",
}) => {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef(null);

  const totalPages = Math.max(1, pages.length || 1);

  useEffect(() => {
    if (highlightedPage && highlightedPage !== currentPage) {
      setCurrentPage(highlightedPage);
    }
  }, [highlightedPage]);

  const handleZoomIn = () => setZoom((prev) => Math.min(200, prev + 15));
  const handleZoomOut = () => setZoom((prev) => Math.max(50, prev - 15));
  const handleResetZoom = () => setZoom(100);

  const isPdf = (fileName || "").toLowerCase().endsWith(".pdf");

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[var(--surface-raised)] border-r border-[var(--border)] overflow-hidden select-none",
        className
      )}
    >
      {/* Top Viewer Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)]">
        {/* Left: File metadata */}
        <div className="flex items-center gap-2 truncate max-w-[200px] sm:max-w-xs">
          <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
          <span className="font-semibold text-[var(--text-primary)] truncate" title={fileName}>
            {fileName || "Source Document"}
          </span>
        </div>

        {/* Center: Page Navigation */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded hover:bg-[var(--surface-raised)] disabled:opacity-40"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1 rounded hover:bg-[var(--surface-raised)] disabled:opacity-40"
            aria-label="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Zoom & Open Link */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-[var(--surface-raised)]"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-[var(--surface-raised)]"
            title="Reset Zoom"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-[var(--surface-raised)]"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {documentUrl && (
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded hover:bg-[var(--surface-raised)] text-[var(--primary)] ml-1"
              title="Open Raw File in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Main Canvas / Overlay Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/10 dark:bg-black/40 relative"
      >
        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          className="relative transition-transform duration-150 ease-out bg-white rounded-lg shadow-xl border border-[var(--border)] overflow-hidden min-w-[500px] min-h-[700px] max-w-[800px]"
        >
          {/* Document Preview (iFrame or Image) */}
          {documentUrl ? (
            isPdf ? (
              <iframe
                src={`${documentUrl}#page=${currentPage}&toolbar=0&navpanes=0`}
                title="Document PDF"
                className="w-full h-[700px] pointer-events-auto border-none"
              />
            ) : (
              <img
                src={documentUrl}
                alt={fileName}
                className="w-full h-auto object-contain block select-none"
              />
            )
          ) : (
            <div className="w-full h-[700px] flex items-center justify-center text-xs text-[var(--text-muted)]">
              No document source available
            </div>
          )}

          {/* Interactive Click-to-Source SVG Overlay Layer */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            {/* Pulsing Highlight Box when a field is selected on right */}
            {highlightedBox && (
              <g className="animate-pulse">
                <rect
                  x={highlightedBox[0]}
                  y={highlightedBox[1]}
                  width={Math.max(10, highlightedBox[2] - highlightedBox[0])}
                  height={Math.max(10, highlightedBox[3] - highlightedBox[1])}
                  fill="rgba(15, 118, 110, 0.25)"
                  stroke="#0f766e"
                  strokeWidth="3"
                  rx="4"
                />
              </g>
            )}

            {/* Clickable word bounding boxes */}
            {tokens
              .filter((t) => t.page === currentPage)
              .map((tok, idx) => {
                const b = tok.normBbox || tok.bbox;
                if (!b) return null;
                const isTarget =
                  highlightedBox &&
                  Math.abs(b[0] - highlightedBox[0]) < 20 &&
                  Math.abs(b[1] - highlightedBox[1]) < 20;

                return (
                  <rect
                    key={tok.tokenId || idx}
                    x={b[0]}
                    y={b[1]}
                    width={Math.max(6, b[2] - b[0])}
                    height={Math.max(6, b[3] - b[1])}
                    fill={isTarget ? "rgba(15, 118, 110, 0.3)" : "transparent"}
                    stroke={isTarget ? "#0f766e" : "transparent"}
                    strokeWidth="1.5"
                    className="pointer-events-auto cursor-pointer hover:fill-teal-500/20 hover:stroke-teal-600 transition-colors"
                    onClick={() => onBoxClick && onBoxClick(tok)}
                  >
                    <title>{tok.text}</title>
                  </rect>
                );
              })}
          </svg>
        </div>
      </div>

      {/* Footer Evidence Banner */}
      <div className="px-3 py-1.5 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>Click any word on document to select field • Click crosshair on right to highlight source</span>
        </span>
        <span className="font-mono text-[10px]">Scale: 0-1000 norm</span>
      </div>
    </div>
  );
};

export default DocumentCanvasViewer;

