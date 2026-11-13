/** @format */

import React from "react";
import { Link } from "react-router-dom";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Page Not Found</h1>
      <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1 mb-6">
        The financial report, review queue, or workspace module you requested does not exist or has been moved.
      </p>
      <Link to="/app/dashboard">
        <Button variant="primary" icon={ArrowLeft}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}

