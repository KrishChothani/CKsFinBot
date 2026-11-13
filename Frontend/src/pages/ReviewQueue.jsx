/** @format */

import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, PlusCircle } from "lucide-react";
import { useTenant } from "../JSX/Contexts/TenantContext";
import ReviewQueueView from "../JSX/Components/ReviewQueueView";
import EmptyState from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import CreateClientModal from "../JSX/Components/CreateClientModal";

export default function ReviewQueuePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeClient } = useTenant();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const initialDocId = location.state?.documentId || null;

  if (!activeClient) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Building2}
          title="Select a Client Workspace"
          description="Review queues are scoped per client entity. Please select an active client workspace to inspect extracted invoices and generate vouchers."
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
    <div className="space-y-4">
      <PageHeader
        title="Review & Validation Queue"
        description={`Inspect OCR extraction confidence, verify tax calculations, and approve double-entry vouchers for ${activeClient.businessName}.`}
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: "Review Queue" },
        ]}
      />
      <ReviewQueueView
        initialDocumentId={initialDocId}
        onVoucherCreated={() => navigate("/app/vouchers")}
        onBackToInbox={() => navigate("/app/inbox")}
      />
    </div>
  );
}

