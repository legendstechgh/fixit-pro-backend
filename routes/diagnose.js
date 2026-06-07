import fs from "fs";
import path from "path";
import { enhanceDiagnosis } from "../services/aiEnhancer.js";

// ─── LOAD KNOWLEDGE BASE ──────────────────────────────────────
const issuesPath = path.join(process.cwd(), "data", "issues.json");
const issues = JSON.parse(fs.readFileSync(issuesPath, "utf8"));

// ─── FALLBACK COST DERIVATION (Bug 3 fix) ────────────────────
// Used only when an issues.json entry is missing costRange.
// Maps difficulty + severity to a realistic cost bracket.
function deriveCost(difficulty, severity) {
  const matrix = {
    easy: {
      low:      "$0 – $20",
      medium:   "$0 – $50",
      high:     "$10 – $80",
      critical: "$20 – $100"
    },
    medium: {
      low:      "$20 – $80",
      medium:   "$30 – $120",
      high:     "$50 – $200",
      critical: "$100 – $350"
    },
    hard: {
      low:      "$50 – $150",
      medium:   "$80 – $250",
      high:     "$100 – $400",
      critical: "$200 – $600"
    }
  };
  return matrix[difficulty]?.[severity] ?? "$30 – $150";
}

// ─── FALLBACK SUCCESS RATE DERIVATION (Bug 3 fix) ────────────
// Used only when an issues.json entry is missing successRate.
// Higher difficulty and severity = lower DIY success probability.
function deriveSuccessRate(difficulty, severity, technicianRequired) {
  if (technicianRequired) return "70%";
  const base = { easy: 90, medium: 78, hard: 62 };
  const severityPenalty = { low: 0, medium: -5, high: -10, critical: -18 };
  const score = (base[difficulty] ?? 75) + (severityPenalty[severity] ?? -5);
  return `${Math.max(40, Math.min(95, score))}%`;
}

// ─── FALLBACK TECHNICIAN DERIVATION ──────────────────────────
// If the entry doesn't specify, infer from difficulty + severity.
function deriveTechnicianRequired(difficulty, severity) {
  if (difficulty === "hard" && (severity === "high" || severity === "critical")) return true;
  if (severity === "critical") return true;
  return false;
}

// ─── CONFIDENCE SCORING ───────────────────────────────────────
// Confidence reflects how specifically the symptom text matched.
// Multiple keyword hits = higher confidence.
function deriveConfidence(matched, text) {
  if (!matched || matched._isFallback) return "low";
  const hits = matched.keywords.filter(kw => text.includes(kw.toLowerCase())).length;
  if (hits >= 3) return "high";
  if (hits === 2) return "medium";
  return "low";
}

// ─── DEFAULT DO-NOT LIST ──────────────────────────────────────
const DEFAULT_DO_NOT = [
  "Do not force damaged or stuck components",
  "Do not use the device if it poses a safety risk",
  "Do not attempt advanced repairs without the correct tools"
];

// ─── MAIN DIAGNOSE FUNCTION ───────────────────────────────────
async function diagnose(device, symptom) {

  // Validate inputs
  if (!device || typeof device !== "string") throw new Error("Invalid device");
  if (!symptom || typeof symptom !== "string") throw new Error("Invalid symptom");

  // Sanitise — truncate to 500 chars max to prevent abuse (Gap 4 fix)
  const sanitisedDevice  = device.trim().substring(0, 100).toLowerCase();
  const sanitisedSymptom = symptom.trim().substring(0, 500);
  const text = `${sanitisedDevice} ${sanitisedSymptom}`.toLowerCase();

  // ── Match against knowledge base ──────────────────────────
  // Score each issue by how many keywords match, pick the best score.
  // This replaces the old first-match logic that ignored symptom specificity.
  let bestMatch = null;
  let bestScore = 0;

  for (const issue of issues) {
    // Only consider entries for the requested device (or device-agnostic entries)
    const deviceMatch =
      !issue.device ||
      issue.device.toLowerCase() === sanitisedDevice ||
      sanitisedDevice.includes(issue.device.toLowerCase());

    if (!deviceMatch) continue;

    const score = issue.keywords.filter(kw =>
      text.includes(kw.toLowerCase())
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = issue;
    }
  }

  // ── Fallback when nothing matched ────────────────────────
  const isFallback = !bestMatch || bestScore === 0;
  if (isFallback) {
    bestMatch = {
      _isFallback: true,
      diagnosis: "General device issue detected",
      causes: [
        "The specific symptom could not be matched to a known issue pattern",
        "This may be an uncommon fault or the description may need more detail"
      ],
      beginner_fixes: [
        "Restart or power-cycle the device completely",
        "Check all physical connections, cables, and power sources"
      ],
      intermediate_fixes: [
        "Inspect the device carefully for visible damage, loose parts, or unusual sounds",
        "Check the manufacturer's support page for your specific model"
      ],
      advanced_fixes: [
        "Run any available built-in diagnostics for your device",
        "Contact a qualified technician with a detailed description of the symptoms"
      ],
      doNot: DEFAULT_DO_NOT,
      severity: "medium",
      difficulty: "medium",
      technicianRequired: false,
      costRange: null,
      successRate: null,
      lifespanNotes: "A technician assessment will give you accurate cost and repair timeline information."
    };
  }

  // ── Resolve all fields with priority: issues.json → derived → default ──
  const severity           = bestMatch.severity   || "medium";
  const difficulty         = bestMatch.difficulty || "medium";
  const technicianRequired = bestMatch.technicianRequired !== undefined
    ? bestMatch.technicianRequired
    : deriveTechnicianRequired(difficulty, severity);

  const costEstimate       = bestMatch.costRange
    || deriveCost(difficulty, severity);

  const probabilityOfSuccess = bestMatch.successRate
    || deriveSuccessRate(difficulty, severity, technicianRequired);

  const confidence         = deriveConfidence(bestMatch, text);

  const lifespanNotes      = bestMatch.lifespanNotes
    || "Device lifespan depends on repair success and ongoing maintenance.";

  const doNot              = Array.isArray(bestMatch.doNot) && bestMatch.doNot.length
    ? bestMatch.doNot
    : DEFAULT_DO_NOT;

  // ── Build tiered repair steps ──────────────────────────────
  // Supports both new schema (beginner_fixes / intermediate_fixes / advanced_fixes)
  // and old schema (fixes array that gets sliced) — backward compatible.
  let beginnerSteps, intermediateSteps, advancedSteps;

  if (bestMatch.beginner_fixes) {
    // New schema from expanded issues.json
    beginnerSteps     = bestMatch.beginner_fixes     || [];
    intermediateSteps = bestMatch.intermediate_fixes || [];
    advancedSteps     = bestMatch.advanced_fixes     || [];
  } else if (Array.isArray(bestMatch.fixes)) {
    // Legacy schema — slice into thirds
    const f = bestMatch.fixes;
    const third = Math.ceil(f.length / 3);
    beginnerSteps     = f.slice(0, third);
    intermediateSteps = f.slice(third, third * 2);
    advancedSteps     = f.slice(third * 2);
  } else {
    beginnerSteps = intermediateSteps = advancedSteps = [];
  }

  // ── Assemble final result ─────────────────────────────────
  const result = {
    device: device.trim(),
    diagnosis: bestMatch.diagnosis,
    causes: Array.isArray(bestMatch.causes) && bestMatch.causes.length
      ? bestMatch.causes
      : ["General hardware or software issue"],

    steps: {
      beginner:     beginnerSteps,
      intermediate: intermediateSteps,
      advanced:     advancedSteps
    },

    doNot,

    severity,
    difficulty,
    confidence,

    costEstimate,           // ← Now derived per-issue (Bug 3 fixed)
    technicianRequired,     // ← Now derived per-issue (Bug 3 fixed)
    probabilityOfSuccess,   // ← Now derived per-issue (Bug 3 fixed)

    lifespanNotes,
    timestamp: Date.now()
  };

  // ── AI enhancement ────────────────────────────────────────
  const aiData = await enhanceDiagnosis(result);
  result.aiEnhanced = aiData;

  return result;
}

export { diagnose };