/** @format */

import React, { useState } from "react";
import { Building2, PlusCircle } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { useTenant } from "../JSX/Contexts/TenantContext";
import FinancialReportsView from "../JSX/Components/FinancialReportsView";
import EmptyState from "../components/ui/EmptyState";
import CreateClientModal from "../JSX/Components/CreateClientModal";

export default function FinancialsPage() {
  const { activeClient } = useTenant();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!activeClient) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Building2}
          title="Select a Client Workspace"
          description="Schedule III Balance Sheet, Profit & Loss statements, and Debtors/Creditors ageing reports require an active client selection."
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
        title="Schedule III Financial Reports"
        description={`Balance Sheet, Profit & Loss, and Ageing Statements for ${activeClient.businessName}.`}
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: "Financials" },
        ]}
      />
      <FinancialReportsView />
    </div>
  );
}

