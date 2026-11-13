/** @format */

import React, { lazy } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import ReactDom from "react-dom/client";
import "./index.css";

// Layout & Contexts
import AppLayout from "./layouts/AppLayout.jsx";
import AuthContextProvider from "./JSX/Contexts/AuthContextProvider.jsx";
import { TenantProvider } from "./JSX/Contexts/TenantContext.jsx";
import ProtectedRoute from "./JSX/Components/Protection/ProtectedRoute.jsx";
import ToastProvider from "./components/ui/Toast.jsx";

// Public Pages
import Landing from "./pages/Landing.jsx";
import LoginPage from "./JSX/Pages/LoginPage.jsx";
import SignupPage from "./JSX/Pages/SignupPage.jsx";
import EmailVerification from "./JSX/Components/EmailVerification.jsx";
import PublicClientPortalView from "./JSX/Components/PublicClientPortalView.jsx";

// Lazy-loaded Authenticated Workspace Pages
const DashboardPage = lazy(() => import("./pages/Dashboard.jsx"));
const DocumentInboxPage = lazy(() => import("./pages/DocumentInbox.jsx"));
const ReviewQueuePage = lazy(() => import("./pages/ReviewQueue.jsx"));
const VouchersPage = lazy(() => import("./pages/Vouchers.jsx"));
const FinancialsPage = lazy(() => import("./pages/Financials.jsx"));
const TaxAdvisoryPage = lazy(() => import("./pages/TaxAdvisory.jsx"));
const ReconciliationPage = lazy(() => import("./pages/Reconciliation.jsx"));
const CompliancePage = lazy(() => import("./pages/Compliance.jsx"));
const RequestsPage = lazy(() => import("./pages/Requests.jsx"));
const EnterprisePage = lazy(() => import("./pages/Enterprise.jsx"));
const AssistantPage = lazy(() => import("./pages/Assistant.jsx"));
const ClientsPage = lazy(() => import("./pages/Clients.jsx"));
const SettingsPage = lazy(() => import("./pages/Settings.jsx"));
const RulesRegistryPage = lazy(() => import("./pages/RulesRegistry.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFound.jsx"));

const router = createBrowserRouter([
  // Public Client Document Upload Magic Link (Vendor Intake)
  {
    path: "/portal/:token",
    element: <PublicClientPortalView />,
  },
  // Public Marketing Landing Page
  {
    path: "/",
    element: <Landing />,
  },
  // Public Auth Pages
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/verify-email",
    element: <EmailVerification />,
  },
  // Authenticated Enterprise Multi-Tenant Workspace
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "inbox",
        element: <DocumentInboxPage />,
      },
      {
        path: "review",
        element: <ReviewQueuePage />,
      },
      {
        path: "vouchers",
        element: <VouchersPage />,
      },
      {
        path: "financials",
        element: <FinancialsPage />,
      },
      {
        path: "tax-advisory",
        element: <TaxAdvisoryPage />,
      },
      {
        path: "reconciliation",
        element: <ReconciliationPage />,
      },
      {
        path: "compliance",
        element: <CompliancePage />,
      },
      {
        path: "requests",
        element: <RequestsPage />,
      },
      {
        path: "enterprise",
        element: <EnterprisePage />,
      },
      {
        path: "assistant",
        element: <AssistantPage />,
      },
      {
        path: "clients",
        element: <ClientsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "rules",
        element: <RulesRegistryPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

ReactDom.createRoot(document.getElementById("root")).render(
  <AuthContextProvider>
    <TenantProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </TenantProvider>
  </AuthContextProvider>
);
