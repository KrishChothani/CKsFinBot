
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://cksfinbot.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed for this origin"));
      }
    },
    // origin: "*",
    credentials: true, // only if you're using cookies
  })
);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "..", "Public")));

app.use(cookieParser());
// app.use((req, res, next) => {
//   if (req.body && Buffer.isBuffer(req.body)) {
//     try {
//       req.body = JSON.parse(req.body.toString("utf-8"));
//     } catch (err) {
//       return res.status(400).json({ message: "Invalid JSON" });
//     }
//   } else if (req.body && typeof req.body === "string") {
//     try {
//       req.body = JSON.parse(req.body);
//     } catch (err) {
//       return res.status(400).json({ message: "Invalid JSON" });
//     }
//   }
//   next();
// });

// --- Routes ---
import userRouter from "./Routes/user.routes.js";
import conversationRouter from "./Routes/conversation.routes.js";
import documentRouter from "./Routes/document.routes.js";
import s3Router from "./Routes/s3Routes.js";
import firmRouter from "./Routes/firm.routes.js";
import clientRouter from "./Routes/client.routes.js";
import reviewRouter from "./Routes/review.routes.js";
import voucherRouter from "./Routes/voucher.routes.js";
import exportRouter from "./Routes/export.routes.js";
import dashboardRouter from "./Routes/dashboard.routes.js";
import bankReconRouter from "./Routes/bankRecon.routes.js";
import gstReconRouter from "./Routes/gstRecon.routes.js";
import complianceRouter from "./Routes/compliance.routes.js";
import documentRequestRouter from "./Routes/documentRequest.routes.js";
import publicPortalRouter from "./Routes/publicPortal.routes.js";
import taxAdvisoryRouter from "./Routes/taxAdvisory.routes.js";
import financialReportsRouter from "./Routes/financialReports.routes.js";
import whatsappRouter from "./Routes/whatsapp.routes.js";
import gspRouter from "./Routes/gsp.routes.js";
import approvalRouter from "./Routes/approval.routes.js";
import firmAnalyticsRouter from "./Routes/firmAnalytics.routes.js";
import rulesRouter from "./Routes/rules.routes.js";
import closeReadinessRouter from "./Routes/closeReadiness.routes.js";
import clientSummaryRouter from "./Routes/clientSummary.routes.js";
import marketplaceSettlementRouter from "./Routes/marketplaceSettlement.routes.js";

// Route declarations
app.use("/api/v1/users", userRouter);
app.use("/api/v1/conversations", conversationRouter);
app.use("/api/v1/documents", documentRouter);
app.use("/api/v1/s3", s3Router);
app.use("/api/v1/firms", firmRouter);
app.use("/api/v1/clients", clientRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/vouchers", voucherRouter);
app.use("/api/v1/exports", exportRouter);
app.use("/api/v1/dashboards", dashboardRouter);
app.use("/api/v1/bank-reconciliation", bankReconRouter);
app.use("/api/v1/gst-reconciliation", gstReconRouter);
app.use("/api/v1/compliance", complianceRouter);
app.use("/api/v1/document-requests", documentRequestRouter);
app.use("/api/v1/public/portal", publicPortalRouter);
app.use("/api/v1/tax-advisory", taxAdvisoryRouter);
app.use("/api/v1/reports", financialReportsRouter);
app.use("/api/v1/whatsapp", whatsappRouter);
app.use("/api/v1/gsp", gspRouter);
app.use("/api/v1/approvals", approvalRouter);
app.use("/api/v1/analytics", firmAnalyticsRouter);
app.use("/api/v1/rules", rulesRouter);
app.use("/api/v1/close-readiness", closeReadinessRouter);
app.use("/api/v1/client-summaries", clientSummaryRouter);
app.use("/api/v1/marketplace-settlements", marketplaceSettlementRouter);

// Health check route
app.get("/api/v1/healthcheck", (req, res) => {
  res.status(200).json({ status: "OK", message: "Welcome to CKsFinBot API" });
});


export { app };
