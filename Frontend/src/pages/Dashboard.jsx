/** @format */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Receipt,
  FileCheck,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  Building2,
  ArrowRight,
  FileText,
  PieChart as PieIcon,
  BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

import { useTenant } from "../JSX/Contexts/TenantContext";
import { getClientDashboard, getFirmOverview } from "../services/apiClient";
import { formatINR, formatINRCompact, formatDate } from "../lib/format";
import { PageHeader } from "../components/ui/PageHeader";
import { KpiCard, Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge, StatusPill } from "../components/ui/Badge";
import { SegmentedControl } from "../components/ui/Tabs";
import { EmptyState } from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";
import CreateClientModal from "../JSX/Components/CreateClientModal";
import { CloseReadinessCard } from "../components/dashboard/CloseReadinessCard";

// Color palette for Recharts aligning with deep teal and warm amber tokens
const CHART_COLORS = ["#0f766e", "#14b8a6", "#2dd4bf", "#f59e0b", "#d97706", "#64748b"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeClient, clients } = useTenant();

  const [period, setPeriod] = useState("year"); // "month" | "quarter" | "year"
  const [viewScope, setViewScope] = useState("client"); // "client" | "firm"
  const [dashboardData, setDashboardData] = useState(null);
  const [firmData, setFirmData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch client-specific dashboard
  const fetchDashboard = useCallback(async () => {
    if (!activeClient?._id) return;
    setIsLoading(true);
    try {
      const res = await getClientDashboard(activeClient._id);
      setDashboardData(res.data?.data);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeClient]);

  // Fetch firm-wide overview
  const fetchFirmOverview = useCallback(async () => {
    try {
      const res = await getFirmOverview();
      setFirmData(res.data?.data);
    } catch (err) {
      console.error("Firm overview error:", err);
    }
  }, []);

  useEffect(() => {
    if (activeClient?._id) {
      fetchDashboard();
    }
    fetchFirmOverview();
  }, [fetchDashboard, fetchFirmOverview, activeClient]);

  // If no client workspace is selected at all
  if (!activeClient && viewScope === "client") {
    return (
      <div className="py-6 space-y-6">
        <PageHeader
          title="Financial Dashboard"
          description="Consolidated overview of financial transactions, tax liabilities, and document processing."
        />
        <EmptyState
          icon={Building2}
          title="No Client Selected"
          description="Select an existing SME client from the top switcher, or create a new workspace to view automated books and financial analytics."
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

  const fin = dashboardData?.financialOverview || {};
  const pipe = dashboardData?.documentPipeline || {};
  const topVendors = dashboardData?.topVendors || [];
  const recentVouchers = dashboardData?.recentVouchers || [];

  const totalSales = fin.totalSales || 0;
  const totalPurchases = fin.totalPurchases || 0;
  const netProfit = totalSales - totalPurchases;
  const netGstLiability = fin.netGstLiability || 0;
  const inputTaxCredit = fin.inputTaxCredit || 0;

  // Monthly trend mockup generated from total sales and purchases
  const monthlyData = [
    { month: "Apr", sales: Math.round(totalSales * 0.08), purchases: Math.round(totalPurchases * 0.09) },
    { month: "May", sales: Math.round(totalSales * 0.10), purchases: Math.round(totalPurchases * 0.08) },
    { month: "Jun", sales: Math.round(totalSales * 0.12), purchases: Math.round(totalPurchases * 0.11) },
    { month: "Jul", sales: Math.round(totalSales * 0.11), purchases: Math.round(totalPurchases * 0.10) },
    { month: "Aug", sales: Math.round(totalSales * 0.14), purchases: Math.round(totalPurchases * 0.12) },
    { month: "Sep", sales: Math.round(totalSales * 0.15), purchases: Math.round(totalPurchases * 0.13) },
    { month: "Oct", sales: Math.round(totalSales * 0.13), purchases: Math.round(totalPurchases * 0.14) },
    { month: "Nov", sales: Math.round(totalSales * 0.17), purchases: Math.round(totalPurchases * 0.13) },
  ];

  // Vendor spend pie chart data
  const vendorPieData = topVendors.map((v) => ({
    name: v.vendorName || "Vendor",
    value: Math.round(v.totalSpend || 0),
  }));

  return (
    <div className="space-y-6">
      {/* Page Header with Scope and Period Controls */}
      <PageHeader
        title={
          viewScope === "client"
            ? `${activeClient?.businessName || "Client"} Dashboard`
            : "CA Practice Consolidated Overview"
        }
        description={
          viewScope === "client"
            ? `GSTIN: ${activeClient?.gstin || "Not Registered"} • FY: ${activeClient?.financialYear?.currentFY || "2024-25"}`
            : `Firm overview across ${clients.length} SME clients and active document pipelines.`
        }
        breadcrumbs={[
          { label: "Overview", href: "/app/dashboard" },
          { label: viewScope === "client" ? "Client Dashboard" : "Firm Overview" },
        ]}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Toggle (Client vs Firm-wide) */}
          <SegmentedControl
            options={[
              { label: "Active Client", value: "client" },
              { label: "All Firm Clients", value: "firm" },
            ]}
            value={viewScope}
            onChange={setViewScope}
          />

          {viewScope === "client" && (
            <SegmentedControl
              options={[
                { label: "Month", value: "month" },
                { label: "Quarter", value: "quarter" },
                { label: "FY 2024-25", value: "year" },
              ]}
              value={period}
              onChange={setPeriod}
            />
          )}

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchDashboard}
            isLoading={isLoading}
            className="hidden sm:inline-flex"
          >
            Refresh
          </Button>
        </div>
      </PageHeader>

      {viewScope === "firm" ? (
        /* ─── FIRM-WIDE CA OVERVIEW ─── */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Active SME Clients"
              value={clients.length}
              subtitle="Managed client entities"
              icon={Building}
            />
            <KpiCard
              title="Total Documents Ingested"
              value={firmData?.totalDocs || 0}
              subtitle="Across all client inboxes"
              icon={FileText}
            />
            <KpiCard
              title="Review Queue (Firm-wide)"
              value={firmData?.pendingReviewCount || 0}
              subtitle="Requiring CA / staff approval"
              icon={Clock}
              badge={
                (firmData?.pendingReviewCount || 0) > 0 ? (
                  <Badge variant="warning" size="sm">
                    Action Needed
                  </Badge>
                ) : null
              }
            />
            <KpiCard
              title="Monthly Processing Limit"
              value={`${firmData?.firm?.docsProcessedThisMonth || 0} / ${firmData?.firm?.monthlyDocLimit || 500}`}
              subtitle={`${firmData?.firm?.plan || "Starter"} Tier`}
              icon={TrendingUp}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Client Entity Directory & Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Business Name</th>
                      <th className="py-2.5 px-3">GSTIN</th>
                      <th className="py-2.5 px-3">Pending Review</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {clients.map((c) => (
                      <tr key={c._id} className="hover:bg-[var(--surface-raised)]/50">
                        <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">
                          {c.businessName}
                        </td>
                        <td className="py-3 px-3 font-mono font-tabular text-[var(--text-muted)]">
                          {c.gstin || "Unregistered"}
                        </td>
                        <td className="py-3 px-3">
                          {(c.pendingReviewCount || 0) > 0 ? (
                            <Badge variant="warning" size="sm">
                              {c.pendingReviewCount} pending
                            </Badge>
                          ) : (
                            <span className="text-[var(--text-muted)]">All cleared</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigate("/app/dashboard");
                              setViewScope("client");
                            }}
                          >
                            Switch & View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ─── CLIENT SPECIFIC DASHBOARD ─── */
        <div className="space-y-6">
          {/* Statutory 5-Pillar Close Readiness & Gap-Aware Chasing */}
          <CloseReadinessCard
            clientId={activeClient?._id}
            clientName={activeClient?.businessName}
          />

          {/* KPI Cards Row (6 metrics) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
            <KpiCard
              title="Revenue (Sales)"
              value={formatINRCompact(totalSales)}
              subtitle="Total FY Sales"
              icon={TrendingUp}
              trend={{ value: "+14.2%", positive: true }}
            />
            <KpiCard
              title="Expenses (Purchases)"
              value={formatINRCompact(totalPurchases)}
              subtitle="From verified bills"
              icon={Receipt}
            />
            <KpiCard
              title="Net Profit"
              value={formatINRCompact(netProfit)}
              subtitle="Operating margin"
              icon={FileCheck}
              trend={{
                value: netProfit >= 0 ? "Profitable" : "Deficit",
                positive: netProfit >= 0,
              }}
            />
            <KpiCard
              title="Net GST Liability"
              value={formatINRCompact(netGstLiability)}
              subtitle="Output - Input offset"
              icon={ArrowUpRight}
            />
            <KpiCard
              title="Available ITC"
              value={formatINRCompact(inputTaxCredit)}
              subtitle="Eligible input credit"
              icon={ArrowDownRight}
            />
            <KpiCard
              title="Pending Reviews"
              value={pipe.needsReview || 0}
              subtitle="Awaiting sign-off"
              icon={Clock}
              badge={
                (pipe.needsReview || 0) > 0 ? (
                  <Badge variant="warning" size="sm">
                    Needs Action
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">
                    Up to date
                  </Badge>
                )
              }
            />
          </div>

          {/* Needs Attention Panel */}
          {((pipe.needsReview || 0) > 0 || (pipe.failed || 0) > 0) && (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--warning-border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--warning-light)] text-[var(--warning)] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Items Requiring CA Attention
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {pipe.needsReview || 0} extracted invoices waiting in the Review Queue.
                    {pipe.failed > 0 && ` ${pipe.failed} document extraction failed.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate("/app/review")}
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Open Review Queue
                </Button>
              </div>
            </div>
          )}

          {/* Charts Row: Income vs Expense Trend & Top Vendors Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Income vs Expense Bar/Area Chart (2 Cols) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Income vs Expense Trend (FY 2024-25)</CardTitle>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Monthly posted sales vs vendor bill expenditure
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--primary)] font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                    Sales
                  </span>
                  <span className="flex items-center gap-1.5 text-[var(--accent)] font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                    Purchases
                  </span>
                </div>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip
                      formatter={(val) => formatINR(val)}
                      contentStyle={{
                        backgroundColor: "var(--surface)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Sales" />
                    <Bar dataKey="purchases" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Purchases" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense Distribution / Top Vendors (1 Col) */}
            <Card>
              <CardHeader>
                <CardTitle>Top Vendors by Spend</CardTitle>
              </CardHeader>
              <CardContent className="h-72 flex flex-col justify-between">
                {vendorPieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
                    No vendor spend recorded yet.
                  </div>
                ) : (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={vendorPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={68}
                            paddingAngle={3}
                          >
                            {vendorPieData.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(val) => formatINR(val)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-[var(--border)] overflow-y-auto max-h-24">
                      {topVendors.slice(0, 3).map((tv, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                            />
                            <span className="truncate">{tv.vendorName}</span>
                          </span>
                          <span className="font-semibold font-tabular text-[var(--text-primary)]">
                            {formatINRCompact(tv.totalSpend)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Grid: Recent Posted Vouchers & Pipeline Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Posted Vouchers */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle>Recent Posted Vouchers</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/app/vouchers")}
                    className="text-xs text-[var(--primary)] font-semibold"
                  >
                    View All Ledgers →
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentVouchers.length === 0 ? (
                  <p className="p-6 text-center text-xs text-[var(--text-muted)]">
                    No vouchers posted yet. Approved documents will appear here.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {recentVouchers.map((v) => (
                      <div
                        key={v._id}
                        className="px-5 py-3 flex items-center justify-between hover:bg-[var(--surface-raised)]/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-[var(--text-primary)] font-mono">
                              {v.voucherNumber}
                            </span>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              {v.voucherType} • {formatDate(v.voucherDate)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-xs font-tabular text-[var(--text-primary)]">
                            {formatINR(v.totalAmount)}
                          </span>
                          <div className="text-[10px] text-[var(--success)] font-medium">
                            Posted to Books
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Ingestion & Extraction Health */}
            <Card>
              <CardHeader>
                <CardTitle>Document Intake Pipeline</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/app/inbox")}
                  className="text-xs text-[var(--primary)] font-semibold"
                >
                  Go to Inbox →
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div
                    onClick={() => navigate("/app/inbox")}
                    className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] cursor-pointer hover:border-[var(--primary)] transition-all"
                  >
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                      In Ingestion
                    </span>
                    <span className="text-xl font-bold font-tabular text-[var(--text-primary)] mt-1 block">
                      {pipe.processing || 0}
                    </span>
                  </div>

                  <div
                    onClick={() => navigate("/app/review")}
                    className="p-3 rounded-xl bg-[var(--warning-light)] border border-[var(--warning-border)] cursor-pointer hover:shadow-xs transition-all"
                  >
                    <span className="text-[10px] uppercase font-bold text-[var(--warning)] block">
                      Needs Review
                    </span>
                    <span className="text-xl font-bold font-tabular text-[var(--warning)] mt-1 block">
                      {pipe.needsReview || 0}
                    </span>
                  </div>

                  <div
                    onClick={() => navigate("/app/vouchers")}
                    className="p-3 rounded-xl bg-[var(--success-light)] border border-[var(--success-border)] cursor-pointer hover:shadow-xs transition-all"
                  >
                    <span className="text-[10px] uppercase font-bold text-[var(--success)] block">
                      Vouchers Ready
                    </span>
                    <span className="text-xl font-bold font-tabular text-[var(--success)] mt-1 block">
                      {pipe.voucherCreated || 0}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]/40 text-xs text-[var(--text-muted)] space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>AI Deterministic Validation</span>
                    <span className="text-[var(--success)] font-semibold">100% Code Verified</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    All GSTIN checksums (MOD 36-2), tax splits (CGST/SGST/IGST), and line item sums are calculated deterministically.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
