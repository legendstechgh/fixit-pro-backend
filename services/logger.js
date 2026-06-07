import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── RESOLVE LOG PATH ─────────────────────────────────────────
// Use __dirname equivalent for ES modules to get an absolute path.
// This avoids confusion about what "." means depending on where
// the process was started from — a common cause of ENOENT on Render.
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const LOG_DIR    = path.resolve(__dirname, "..", "logs");
const LOG_FILE   = path.join(LOG_DIR, "fixit-events.log");

// ─── ENSURE LOG DIRECTORY EXISTS (Bug 4 fix) ─────────────────
// On Render's ephemeral filesystem the logs/ directory is never
// pre-created. fs.appendFileSync throws ENOENT if it doesn't exist.
// We create it once at module load time so every subsequent write
// is guaranteed to have a valid target directory.
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    console.log(`📁 Created log directory: ${LOG_DIR}`);
  }
} catch (err) {
  // If we genuinely cannot create the directory (e.g. read-only FS),
  // log to console only — do not crash the server.
  console.warn(`⚠️  Could not create log directory: ${err.message}. Logs will be console-only.`);
}

// ─── LOG EVENT ────────────────────────────────────────────────
export function logEvent(event) {
  const timestamp = new Date().toISOString();
  const payload   = { timestamp, ...event };

  // Always log to console — works everywhere including Render
  console.log("📊 EVENT:", JSON.stringify(payload));

  // Attempt file log — gracefully skip if directory unavailable
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(payload) + "\n");
  } catch (err) {
    // Non-fatal: console log already captured the event above.
    // We log the failure so it appears in Render's log stream
    // without crashing the diagnosis endpoint.
    console.warn(`⚠️  File log failed (${err.code}): ${err.message}`);
  }
}

// ─── READ RECENT LOGS (utility for /stats or admin) ──────────
// Returns the last N lines of the log file as parsed objects.
// Safe to call even if the file does not yet exist.
export function getRecentLogs(limit = 50) {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const lines = fs.readFileSync(LOG_FILE, "utf8")
      .split("\n")
      .filter(Boolean)
      .slice(-limit);
    return lines.map(line => {
      try { return JSON.parse(line); }
      catch { return { raw: line }; }
    });
  } catch (err) {
    console.warn(`⚠️  Could not read log file: ${err.message}`);
    return [];
  }
}