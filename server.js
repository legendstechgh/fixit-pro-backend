import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import { diagnose } from "./routes/diagnose.js";
import { logToSplunk } from "./services/splunk.js";
import { saveHistory, getStats } from "./services/memory.js";
import { logEvent } from "./services/logger.js";

dotenv.config();

const app  = express();

// ─── PORT (Bug 6 fix) ─────────────────────────────────────────
// Render assigns a dynamic port via process.env.PORT.
// Hardcoding 8000 causes the deployment health check to fail
// because Render probes the assigned port, not 8000.
const PORT = process.env.PORT || 8000;

// ─── CORS (Gap 2 fix) ─────────────────────────────────────────
// Locked to the deployed frontend URL in production.
// Falls back to localhost origins for local development.
const allowedOrigins = [
  process.env.FRONTEND_URL,          // Set this in Render dashboard → e.g. https://fixit-pro.vercel.app
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8080"
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development (no FRONTEND_URL set), allow all — lock down in production
    if (!process.env.FRONTEND_URL) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "10kb" })); // Reject oversized bodies

// ─── REQUEST LOGGER ───────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "FixIt Pro Backend",
    version: "2.1.0",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

app.get("/test", (req, res) => {
  res.json({
    status: "connected",
    message: "Backend working",
    time: new Date().toISOString()
  });
});

// ─── STATS ────────────────────────────────────────────────────
app.get("/stats", (req, res) => {
  const stats = getStats();
  res.json(stats);
});

// ─── DIAGNOSE TEST (dev only) ─────────────────────────────────
app.post("/diagnose/test", (req, res) => {
  res.json({
    device: "test-device",
    diagnosis: "Backend connectivity verified",
    causes: ["Frontend/backend communication confirmed"],
    steps: {
      beginner:     ["Backend connected successfully", "JSON response working"],
      intermediate: ["Frontend rendering verified"],
      advanced:     ["Full system operational"]
    },
    doNot: ["Do not shut down the backend during a live demo"],
    severity: "low",
    difficulty: "easy",
    confidence: "high",
    costEstimate: "$0",
    technicianRequired: false,
    probabilityOfSuccess: "100%",
    lifespanNotes: "System is stable and fully operational.",
    timestamp: Date.now()
  });
});

// ─── DIAGNOSE ─────────────────────────────────────────────────
app.post("/diagnose", async (req, res) => {
  try {
    const { device, symptom } = req.body;

    // ── Input validation (Gap 4 fix) ──────────────────────
    if (!device || typeof device !== "string" || device.trim().length === 0) {
      return res.status(400).json({ error: "A valid device type is required." });
    }
    if (!symptom || typeof symptom !== "string" || symptom.trim().length === 0) {
      return res.status(400).json({ error: "A symptom description is required." });
    }
    if (symptom.trim().length > 500) {
      return res.status(400).json({ error: "Symptom description must be under 500 characters." });
    }

    const result = await diagnose(device, symptom);

    // Log to internal event log
    logEvent({
      type: "diagnosis",
      device,
      symptom: symptom.substring(0, 100), // Truncate for log readability
      diagnosis: result.diagnosis,
      severity: result.severity,
      confidence: result.confidence,
      technicianRequired: result.technicianRequired,
      costEstimate: result.costEstimate,
      probabilityOfSuccess: result.probabilityOfSuccess
    });

    // Persist to history
    saveHistory({
      device,
      symptom,
      diagnosis: result.diagnosis,
      severity: result.severity,
      confidence: result.confidence,
      timestamp: result.timestamp
    });

    // Splunk-style log
    logToSplunk({
      device,
      symptom,
      diagnosis: result.diagnosis,
      severity: result.severity
    });

    res.json(result);

  } catch (err) {
    console.error("❌ DIAGNOSE ERROR:", err);
    res.status(500).json({
      error: "Diagnosis failed. Please try again.",
      // Only expose detail in development to avoid leaking internals
      ...(process.env.NODE_ENV !== "production" && { detail: err.message })
    });
  }
});

// ─── FEEDBACK ─────────────────────────────────────────────────
app.post("/feedback", (req, res) => {
  try {
    const { timestamp, success } = req.body;

    if (timestamp === undefined || success === undefined) {
      return res.status(400).json({ error: "timestamp and success are required." });
    }

    const filePath = path.join(process.cwd(), "data", "history.json");

    let history = [];
    if (fs.existsSync(filePath)) {
      history = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    const item = history.find(h => String(h.timestamp) === String(timestamp));
    if (!item) {
      return res.status(404).json({ error: "Diagnosis entry not found." });
    }

    item.success = success;
    item.feedbackAt = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(history, null, 2));

    logEvent({ type: "feedback", timestamp, success });

    res.json({ message: "Feedback saved", success });

  } catch (err) {
    console.error("❌ FEEDBACK ERROR:", err);
    res.status(500).json({ error: "Feedback could not be saved." });
  }
});

// ─── START SERVER ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 FixIt Pro backend running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || "(all origins — set FRONTEND_URL to lock down)"}`);

  // ── Render keep-alive ping (Bug 6 fix) ──────────────────
  // Render free tier spins down services after 15 minutes of inactivity.
  // Cold starts take 30–60 seconds, far longer than the frontend timeout.
  // This self-ping fires every 14 minutes to keep the instance warm.
  // RENDER_EXTERNAL_URL is automatically set by Render on every deployment.
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes
    setInterval(async () => {
      try {
        const res = await fetch(`${renderUrl}/`);
        console.log(`🏓 Keep-alive ping → ${res.status}`);
      } catch (err) {
        console.warn(`⚠️  Keep-alive ping failed: ${err.message}`);
      }
    }, PING_INTERVAL_MS);
    console.log(`🏓 Keep-alive ping scheduled every 14 min → ${renderUrl}`);
  }
});