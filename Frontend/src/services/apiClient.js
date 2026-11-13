/** @format */

// src/services/apiClient.js
import axios from "axios";
import BACKEND_URL from "../Config/index.js";

const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  withCredentials: true,
});

// --- Interceptor to add Access Token & Tenant IDs to every request ---
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    const activeFirmId = localStorage.getItem("activeFirmId");
    if (activeFirmId) {
      config.headers["x-firm-id"] = activeFirmId;
    }

    const activeClientId = localStorage.getItem("activeClientId");
    if (activeClientId) {
      config.headers["x-client-id"] = activeClientId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Interceptor to handle token refresh on 401 errors & stale client clearance ---
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle stale client workspace ID
    if (
      error.response?.status === 404 &&
      typeof error.response?.data?.message === "string" &&
      error.response.data.message.includes("Client workspace not found")
    ) {
      console.warn("Stale client workspace ID in localStorage. Clearing activeClientId.");
      localStorage.removeItem("activeClientId");
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await apiClient.post("/users/refresh-token");
        const newAccessToken = data.data.accessToken;
        localStorage.setItem("accessToken", newAccessToken);
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Session expired. Please log in again.", refreshError);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// ─── USER & AUTH APIS ────────────────────────────────────────────────────────
export const loginUser = (credentials) => apiClient.post("/users/login", credentials);
export const registerUser = (userData) => apiClient.post("/users/register", userData);
export const logoutUser = () => apiClient.post("/users/logout");
export const getCurrentUser = () => apiClient.get("/users/current-user");

// ─── FIRM APIS (Multi-Tenant Management) ──────────────────────────────────────
export const getCurrentFirm = () => apiClient.get("/firms/current");
export const updateFirm = (data) => apiClient.put("/firms/current", data);
export const listTeamMembers = () => apiClient.get("/firms/team");
export const addTeamMember = (memberData) => apiClient.post("/firms/team", memberData);

// ─── CLIENT APIS (SME Workspace Entities) ────────────────────────────────────
export const listClients = () => apiClient.get("/clients");
export const getClientById = (clientId) => apiClient.get(`/clients/${clientId}`);
export const createClient = (clientData) => apiClient.post("/clients", clientData);
export const updateClient = (clientId, data) => apiClient.put(`/clients/${clientId}`, data);
export const listClientLedgers = (clientId) => apiClient.get(`/clients/${clientId}/ledgers`);
export const createClientLedger = (clientId, ledgerData) =>
  apiClient.post(`/clients/${clientId}/ledgers`, ledgerData);

// ─── DOCUMENT INBOX & EXTRACTION APIS ─────────────────────────────────────────
export const listDocuments = (params = {}) => apiClient.get("/documents", { params });

export const uploadDocumentsToInbox = (files, clientId, documentTypeHint = "Auto") => {
  const formData = new FormData();
  if (clientId) formData.append("clientId", clientId);
  formData.append("documentTypeHint", documentTypeHint);
  files.forEach((file) => {
    formData.append("documents", file);
  });

  return apiClient.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Legacy Chat upload
export const uploadDocuments = (conversationId, files) => {
  const formData = new FormData();
  formData.append("conversationId", conversationId);
  files.forEach((file) => {
    formData.append("documents", file);
  });

  return apiClient.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ─── REVIEW QUEUE APIS (Human in the Loop) ────────────────────────────────────
export const getReviewQueue = (params = {}) => apiClient.get("/reviews/queue", { params });
export const getDocumentReviewDetail = (documentId) => apiClient.get(`/reviews/${documentId}`);
export const updateExtractedFields = (documentId, data) =>
  apiClient.put(`/reviews/${documentId}/update`, data);
export const approveAndGenerateVoucher = (documentId, overrideData = {}) =>
  apiClient.post(`/reviews/${documentId}/approve`, overrideData);
export const rejectDocument = (documentId, reason) =>
  apiClient.post(`/reviews/${documentId}/reject`, { reason });

// ─── VOUCHERS & ACCOUNTING LEDGER APIS ────────────────────────────────────────
export const listVouchers = (params = {}) => apiClient.get("/vouchers", { params });
export const getVoucherById = (voucherId) => apiClient.get(`/vouchers/${voucherId}`);
export const voidVoucher = (voucherId, reason) =>
  apiClient.post(`/vouchers/${voucherId}/void`, { reason });

// ─── EXPORT STUDIO (Tally XML & Excel) ────────────────────────────────────────
export const previewTallyXml = async (clientId, params = {}) => {
  return apiClient.get("/exports/tally/preview", {
    params: { clientId, ...params },
  });
};

export const exportTallyXmlBlob = async (clientId, params = {}) => {
  return apiClient.get("/exports/tally", {
    params: { clientId, ...params },
    responseType: "blob",
  });
};

export const exportExcelRegisterBlob = async (clientId, params = {}) => {
  return apiClient.get("/exports/excel", {
    params: { clientId, ...params },
    responseType: "blob",
  });
};

// ─── DASHBOARDS & CLOSE-READINESS ───────────────────────────────────────────
export const getClientDashboard = (clientId) =>
  apiClient.get("/dashboards/client", { params: { clientId } });
export const getFirmOverview = () => apiClient.get("/dashboards/firm");
export const getCloseReadinessScore = (params = {}) =>
  apiClient.get("/close-readiness/score", { params });
export const getCloseReadinessChasingBundles = (params = {}) =>
  apiClient.get("/close-readiness/chasing-bundles", { params });

// ─── CONVERSATIONS & CHAT (Add-on) ───────────────────────────────────────────
export const getAllConversations = () => apiClient.get("/conversations");
export const getConversationById = (id) => apiClient.get(`/conversations/${id}`);
export const createConversation = (title = "New Chat", featureUsed = "Smart_Chat") =>
  apiClient.post("/conversations", { title, featureUsed });
export const updateConversationFeature = (conversationId, featureUsed) =>
  apiClient.patch(`/conversations/${conversationId}/feature`, { featureUsed });
export const deleteConversation = (id) => apiClient.delete(`/conversations/${id}`);
export const createChatMessage = (conversationId, content) =>
  apiClient.post(`/conversations/${conversationId}/messages`, { content });

// ─── DOCUMENT DRAFTING STUDIO APIS ───────────────────────────────────────────
export const updateDraftContent = (conversationId, content) =>
  apiClient.put(`/conversations/${conversationId}/draft`, { content });
export const suggestImprovement = (selectedText, documentContext, userInstruction = "") =>
  apiClient.post("/conversations/suggest-improvement", {
    selectedText,
    documentContext,
    userInstruction,
  });

// ─── BANK RECONCILIATION APIS ───────────────────────────────────────────────
export const getBankTransactions = (params = {}) =>
  apiClient.get("/bank-reconciliation/transactions", { params });
export const triggerBankAutoReconcile = (data = {}) =>
  apiClient.post("/bank-reconciliation/auto-reconcile", data);
export const confirmBankMatch = (data) =>
  apiClient.post("/bank-reconciliation/confirm-match", data);
export const unreconcileBankTx = (transactionId, params = {}) =>
  apiClient.post(`/bank-reconciliation/unreconcile/${transactionId}`, {}, { params });
export const getBrsSummary = (clientId) =>
  apiClient.get("/bank-reconciliation/brs-summary", { params: { clientId } });

// ─── GST RECONCILIATION (GSTR-2B VS BOOKS) ──────────────────────────────────
export const importGstr2bJson = (data) =>
  apiClient.post("/gst-reconciliation/import", data);
export const importGstr2bFile = (formData) =>
  apiClient.post("/gst-reconciliation/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getGstReconciliationReport = (params = {}) =>
  apiClient.get("/gst-reconciliation/report", { params });
export const createVoucherFrom2b = (gstr2bId, data = {}) =>
  apiClient.post(`/gst-reconciliation/create-voucher/${gstr2bId}`, data);
export const recordImsActionApi = (data) =>
  apiClient.post("/gst-reconciliation/ims-action", data);
export const exportGstMismatchExcelBlob = (clientId, params = {}) =>
  apiClient.get("/gst-reconciliation/export-excel", {
    params: { clientId, ...params },
    responseType: "blob",
  });

// ─── STATUTORY COMPLIANCE CALENDAR APIS ─────────────────────────────────────
export const getComplianceCalendar = (params = {}) =>
  apiClient.get("/compliance/calendar", { params });
export const seedComplianceCalendar = (data = {}) =>
  apiClient.post("/compliance/seed", data);
export const fileComplianceTask = (taskId, data = {}) =>
  apiClient.post(`/compliance/file/${taskId}`, data);
export const createCustomComplianceTask = (data) =>
  apiClient.post("/compliance/custom-task", data);

// ─── CA DOCUMENT REQUEST TRACKER APIS ───────────────────────────────────────
export const createDocumentRequest = (data) =>
  apiClient.post("/document-requests", data);
export const getDocumentRequests = (params = {}) =>
  apiClient.get("/document-requests", { params });
export const cancelDocumentRequest = (requestId, data = {}) =>
  apiClient.post(`/document-requests/cancel/${requestId}`, data);

// ─── PUBLIC CLIENT UPLOAD PORTAL APIS (NO JWT REQUIRED) ─────────────────────
export const getPublicPortalDetails = (token) =>
  axios.get(`${BACKEND_URL}/api/v1/public/portal/${token}`);
export const uploadPublicPortalFile = (token, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axios.post(`${BACKEND_URL}/api/v1/public/portal/${token}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ─── TAX ADVISORY & MSME 45-DAY TRACKER APIS ──────────────────────────────
export const getTaxAdvisorySummary = (clientId) =>
  apiClient.get("/tax-advisory/summary", { params: { clientId } });
export const getMsmePaymentTracker = (clientId) =>
  apiClient.get("/tax-advisory/msme-tracker", { params: { clientId } });
export const getActiveTaxRules = () => apiClient.get("/tax-advisory/rules");

// ─── FINANCIAL STATEMENTS & ADVANCED REPORTS APIS ───────────────────────────
export const getProfitAndLoss = (clientId, financialYear) =>
  apiClient.get("/reports/pnl", { params: { clientId, financialYear } });
export const getBalanceSheet = (clientId, financialYear) =>
  apiClient.get("/reports/balance-sheet", { params: { clientId, financialYear } });
export const getAgeingReport = (clientId) =>
  apiClient.get("/reports/ageing", { params: { clientId } });
export const getFirmConsolidatedOverview = () =>
  apiClient.get("/reports/consolidated");

// ─── ZOHO BOOKS EXPORT APIS ─────────────────────────────────────────────────
export const exportZohoBooksCsvBlob = async (clientId, params = {}) => {
  return apiClient.get("/exports/zoho", {
    params: { clientId, ...params },
    responseType: "blob",
  });
};

// ─── ENTERPRISE APPROVAL WORKFLOW APIS ──────────────────────────────────────
export const getApprovalQueue = (clientId) =>
  apiClient.get("/approvals/queue", { params: { clientId } });
export const approveVoucherInWorkflow = (voucherId, data = {}) =>
  apiClient.post(`/approvals/approve/${voucherId}`, data);
export const rejectVoucherInWorkflow = (voucherId, data = {}) =>
  apiClient.post(`/approvals/reject/${voucherId}`, data);

// ─── GSP PORTAL DIRECT SYNC APIS ────────────────────────────────────────────
export const syncGstr2bFromPortalDirect = (data) =>
  apiClient.post("/gsp/sync-2b", data);
export const saveGstPortalCredentials = (data) =>
  apiClient.post("/gsp/credentials", data);

// ─── WHATSAPP BUSINESS INTAKE APIS ──────────────────────────────────────────
export const simulateWhatsAppIntake = (data) =>
  apiClient.post("/whatsapp/simulate", data);

// ─── FIRM OBSERVABILITY & LLM ANALYTICS APIS ────────────────────────────────
export const getFirmObservabilityAnalytics = () =>
  apiClient.get("/analytics/metrics");

// ─── WHITE-LABEL PRACTICE BRANDING & DETERMINISTIC CLIENT SUMMARIES ──────────
export const getPracticeBranding = () =>
  apiClient.get("/firms/branding");
export const updatePracticeBranding = (data) =>
  apiClient.put("/firms/branding", data);
export const getLatestClientSummary = (params = {}) =>
  apiClient.get("/client-summaries/latest", { params });
export const refreshClientSummary = (data = {}) =>
  apiClient.post("/client-summaries/refresh", data);
export const signOffClientSummaryApi = (id, data = {}) =>
  apiClient.post(`/client-summaries/${id}/sign-off`, data);
export const revokeClientSummarySignOffApi = (id, data = {}) =>
  apiClient.post(`/client-summaries/${id}/revoke`, data);

// ─── E-COMMERCE MARKETPLACE SETTLEMENTS APIS ────────────────────────────────
export const importMarketplaceSettlementFile = (formData) =>
  apiClient.post("/marketplace-settlements/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const importMarketplaceSettlementData = (data) =>
  apiClient.post("/marketplace-settlements/import", data);
export const getMarketplaceSettlements = (params = {}) =>
  apiClient.get("/marketplace-settlements/list", { params });
export const postVoucherForSettlementApi = (settlementId, data = {}) =>
  apiClient.post(`/marketplace-settlements/${settlementId}/voucher`, data);
export const reconcileSettlementWithBankApi = (settlementId, data = {}) =>
  apiClient.post(`/marketplace-settlements/${settlementId}/reconcile`, data);
export const getCandidateBankCredits = (params = {}) =>
  apiClient.get("/marketplace-settlements/candidate-bank-credits", { params });

export default apiClient;
