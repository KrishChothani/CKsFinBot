
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

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// app.use(express.static(path.join(__dirname, "..", "Public")));

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
import conversationRouter from "./Routes/conversation.routes.js"; // IMPORT NEW ROUTER
import documentRouter from "./Routes/document.routes.js"; // IMPORT NEW ROUTER
import s3Router from "./Routes/s3Routes.js"; // IMPORT S3 ROUTER

// Route declarations
app.use("/api/v1/users", userRouter);
app.use("/api/v1/conversations", conversationRouter); // USE NEW ROUTER
app.use("/api/v1/documents", documentRouter); // USE NEW ROUTER
app.use("/api/v1/s3", s3Router); // USE S3 ROUTER

// Health check route
app.get("/api/v1/healthcheck", (req, res) => {
  res.status(200).json({ status: "OK", message: "Welcome to CKsFinBot API" });
});


export { app };
