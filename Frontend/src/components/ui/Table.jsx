/** @format */

import React from "react";
import { cn } from "../../lib/utils";

export const Table = ({ children, className, ...props }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
    <table className={cn("w-full caption-bottom text-xs text-left", className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ children, className, ...props }) => (
  <thead className={cn("bg-[var(--surface-raised)] border-b border-[var(--border)]", className)} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ children, className, ...props }) => (
  <tbody className={cn("divide-y divide-[var(--border)]", className)} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className, ...props }) => (
  <tr
    className={cn(
      "transition-colors hover:bg-[var(--surface-raised)]/60 data-[state=selected]:bg-[var(--surface-raised)]",
      className
    )}
    {...props}
  >
    {children}
  </tr>
);

export const TableHead = ({ children, className, ...props }) => (
  <th
    className={cn(
      "h-10 px-4 text-left font-semibold text-[var(--text-muted)] tracking-wider uppercase text-[11px] align-middle",
      className
    )}
    {...props}
  >
    {children}
  </th>
);

export const TableCell = ({ children, className, ...props }) => (
  <td className={cn("px-4 py-3 align-middle text-[var(--text-primary)]", className)} {...props}>
    {children}
  </td>
);

export default Table;

