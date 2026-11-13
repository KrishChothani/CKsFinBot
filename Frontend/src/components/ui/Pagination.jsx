/** @format */

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]",
        className
      )}
    >
      <span>
        Page <span className="font-semibold text-[var(--text-primary)] font-tabular">{currentPage}</span> of{" "}
        <span className="font-semibold text-[var(--text-primary)] font-tabular">{totalPages}</span>
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          icon={ChevronLeft}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          icon={ChevronRight}
          iconPosition="right"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Pagination;

