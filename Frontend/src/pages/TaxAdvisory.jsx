/** @format */

import React, { useState } from "react";
import { Building2, PlusCircle } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { useTenant } from "../JSX/Contexts/TenantContext";
import TaxAdvisoryView from "../JSX/Components/TaxAdvisoryView";
import EmptyState from "../components/ui/EmptyState";
import CreateClientModal from "../JSX/Components/CreateClientModal";

export default function TaxAdvisoryPage() {
  const { activeClient } = useTenant();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!activeClient) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Building2}
          title="Select a Client Workspace"
          description="MSME Section 43B(h) overdue tracker, TDS compliance (Sec 194C/J/I/Q), and cash payment thresholds require an active client."
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
        title="Tax Advisory & Compliance Engine"
        description="Section 43B(h) MSME tracker, Section 194 TDS checks, and 40A(3) cash limit analysis."
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: "Tax Advisory" },
        ]}
      />
      <TaxAdvisoryView />
    </div>
  );
}

