/** @format */

import React, { useState } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { Download, FileCode, FileSpreadsheet, Building2, PlusCircle } from "lucide-react";
import { useTenant } from "../JSX/Contexts/TenantContext";
import VouchersLedgerView from "../JSX/Components/VouchersLedgerView";
import EmptyState from "../components/ui/EmptyState";
import CreateClientModal from "../JSX/Components/CreateClientModal";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
} from "../components/ui/Dropdown";
import { Button } from "../components/ui/Button";
import {
  exportTallyXmlBlob,
  exportExcelRegisterBlob,
  exportZohoBooksCsvBlob,
} from "../services/apiClient";

export default function VouchersPage() {
  const { activeClient } = useTenant();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleTallyExport = async () => {
    if (!activeClient) return;
    setIsExporting(true);
    try {
      const response = await exportTallyXmlBlob(activeClient._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Tally_Import_${activeClient.businessName.replace(/\s+/g, "_")}.xml`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Tally export error:", err);
      alert("Failed to export Tally XML. Ensure vouchers exist for this client.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExcelExport = async () => {
    if (!activeClient) return;
    setIsExporting(true);
    try {
      const response = await exportExcelRegisterBlob(activeClient._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Purchase_Register_${activeClient.businessName.replace(/\s+/g, "_")}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Failed to export Excel register. Ensure vouchers exist for this client.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleZohoExport = async () => {
    if (!activeClient) return;
    setIsExporting(true);
    try {
      const response = await exportZohoBooksCsvBlob(activeClient._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Zoho_Bills_${activeClient.businessName.replace(/\s+/g, "_")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Zoho export error:", err);
      alert("Failed to export Zoho CSV. Ensure vouchers exist for this client.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!activeClient) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Building2}
          title="Select a Client Workspace"
          description="Vouchers, books of account, and general ledgers are segregated by client entity. Select a client to review accounting records."
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
      <PageHeader
        title="Vouchers & Accounting Ledgers"
        description="Approved purchase, sales, and expense vouchers with double-entry ledgers."
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: "Vouchers & Ledgers" },
        ]}
      >
        {/* In-page Export Dropdown */}
        <Dropdown>
          <DropdownTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              isLoading={isExporting}
            >
              Export Records
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end" className="w-56">
            <DropdownLabel>Accounting Software Exports</DropdownLabel>
            <DropdownItem icon={FileCode} onSelect={handleTallyExport}>
              Export Tally XML (Prime)
            </DropdownItem>
            <DropdownItem icon={FileSpreadsheet} onSelect={handleExcelExport}>
              Export Excel Register (.xlsx)
            </DropdownItem>
            <DropdownItem icon={FileSpreadsheet} onSelect={handleZohoExport}>
              Export Zoho Books CSV
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </PageHeader>

      <VouchersLedgerView />
    </div>
  );
}

