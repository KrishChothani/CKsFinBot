/** @format */

import React, { useState } from "react";
import { Building2, PlusCircle } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { useTenant } from "../JSX/Contexts/TenantContext";
import ReconciliationView from "../JSX/Components/ReconciliationView";
import EmptyState from "../components/ui/EmptyState";
import CreateClientModal from "../JSX/Components/CreateClientModal";

export default function ReconciliationPage() {
  const { activeClient } = useTenant();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!activeClient) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Building2}
          title="Select a Client Workspace"
          description="Automated Bank BRS and GSTR-2B vs Books reconciliation engines run against the active client's ledgers."
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
        title="Reconciliation Engine"
        description="Automated Bank BRS matching and GSTR-2B vs Books tax credit audit."
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: "Reconciliation" },
        ]}
      />
      <ReconciliationView />
    </div>
  );
}

