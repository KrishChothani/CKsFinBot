/** @format */

import React, { useState } from "react";
import { Building2, PlusCircle } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { useTenant } from "../JSX/Contexts/TenantContext";
import ComplianceCalendarView from "../JSX/Components/ComplianceCalendarView";
import EmptyState from "../components/ui/EmptyState";
import CreateClientModal from "../JSX/Components/CreateClientModal";

export default function CompliancePage() {
  const { activeClient } = useTenant();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!activeClient) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Building2}
          title="Select a Client Workspace"
          description="Statutory tax deadlines for GST (GSTR-1, GSTR-3B), Advance Tax, and TDS filings are tracked per client entity."
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
        title="Statutory Compliance Calendar"
        description="Filing deadlines, due date countdowns, and challan tracking for GST, TDS, and MCA."
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: "Compliance Calendar" },
        ]}
      />
      <ComplianceCalendarView />
    </div>
  );
}

