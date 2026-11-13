/** @format */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, PlusCircle, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { useTenant } from "../JSX/Contexts/TenantContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import CreateClientModal from "../JSX/Components/CreateClientModal";

export default function ClientsPage() {
  const navigate = useNavigate();
  const { clients, activeClient, switchClient } = useTenant();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = clients.filter(
    (c) =>
      c.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Workspaces"
        description="Manage SME client entities, their GST credentials, chart of accounts, and compliance status."
        breadcrumbs={[{ label: "Overview", href: "/app/dashboard" }, { label: "Clients" }]}
      >
        <Button
          variant="primary"
          icon={PlusCircle}
          onClick={() => setShowCreateModal(true)}
        >
          Add Client
        </Button>
      </PageHeader>

      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search by client name or GSTIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md w-full h-9 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <span className="text-xs text-[var(--text-muted)] font-tabular">
          Total: {clients.length} Clients
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Clients Found"
          description={
            searchTerm
              ? "No client workspace matched your search filter."
              : "Create your first SME client workspace to manage accounting and automate tax filings."
          }
          actionLabel="+ Create New Client"
          onAction={() => setShowCreateModal(true)}
          actionIcon={PlusCircle}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const isSelected = activeClient?._id === client._id;
            return (
              <Card
                key={client._id}
                hover
                className={`p-5 flex flex-col justify-between transition-all ${
                  isSelected ? "ring-2 ring-[var(--primary)] bg-[var(--surface-raised)]/40" : ""
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] font-bold text-sm shrink-0">
                      {client.businessName?.substring(0, 2).toUpperCase() || "CL"}
                    </div>
                    {isSelected ? (
                      <Badge variant="primary" size="sm" className="gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => switchClient(client)}
                        className="text-xs h-7"
                      >
                        Switch To
                      </Button>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                    {client.businessName}
                  </h3>

                  <div className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center justify-between">
                      <span>GSTIN:</span>
                      <span className="font-mono text-[var(--text-primary)] font-semibold font-tabular">
                        {client.gstin || "—"}
                      </span>
                    </div>
                    {client.pan && (
                      <div className="flex items-center justify-between">
                        <span>PAN:</span>
                        <span className="font-mono text-[var(--text-primary)] font-tabular">
                          {client.pan}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Type:</span>
                      <span className="capitalize">{client.businessType || "Private Limited"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">
                    {client.pendingReviewCount || 0} docs pending
                  </span>
                  <button
                    onClick={() => {
                      switchClient(client);
                      navigate("/app/dashboard");
                    }}
                    className="flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}

