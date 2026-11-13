/** @format */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, PlusCircle } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { useTenant } from "../JSX/Contexts/TenantContext";
import DocumentRequestTrackerView from "../JSX/Components/DocumentRequestTrackerView";
import EmptyState from "../components/ui/EmptyState";
import CreateClientModal from "../JSX/Components/CreateClientModal";

export default function RequestsPage() {
  const navigate = useNavigate();
  const { activeClient } = useTenant();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!activeClient) {
    return (
      <div className="py-8">
        <EmptyState
          icon={Building2}
          title="Select a Client Workspace"
          description="Send document intake requests and share magic links with client SMEs for uploading pending statements and bills."
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
        title="Document Requests Tracker"
        description="Request pending statements, invoices, and tax forms with client magic links."
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: "Document Requests" },
        ]}
      />
      <DocumentRequestTrackerView
        onNavigateToReview={(docId) => {
          navigate("/app/review", { state: { documentId: docId } });
        }}
      />
    </div>
  );
}

