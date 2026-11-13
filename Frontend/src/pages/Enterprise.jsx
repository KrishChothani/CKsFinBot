/** @format */

import React, { useState } from "react";
import { Building2, PlusCircle } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { useTenant } from "../JSX/Contexts/TenantContext";
import EnterpriseControlsView from "../JSX/Components/EnterpriseControlsView";
import EmptyState from "../components/ui/EmptyState";
import CreateClientModal from "../JSX/Components/CreateClientModal";

export default function EnterprisePage() {
  const { activeClient } = useTenant();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!activeClient) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Building2}
          title="Select a Client Workspace"
          description="Enterprise controls such as 4-eye approval workflows, direct GSP credentials, and WhatsApp Business intake are configured per client."
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
        title="Enterprise Controls & Automation Hub"
        description="4-eye approval workflows, direct GSTN portal integration, WhatsApp intake, and LLM observability."
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: "Enterprise Hub" },
        ]}
      />
      <EnterpriseControlsView />
    </div>
  );
}

