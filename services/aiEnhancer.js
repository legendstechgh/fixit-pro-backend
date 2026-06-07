// ============================================================
// FixIt Pro — aiEnhancer.js
// Local rule-based intelligence engine. Zero external APIs.
//
// Output shape (consumed by script.js → ai-box render block):
// {
//   improvedDiagnosis : string   — enriched diagnosis narrative
//   extraAdvice       : string   — top ranked repair recommendation
//   riskLevel         : string   — "Low" | "Medium" | "High" | "Critical"
//   riskScore         : number   — 0–100 raw composite score
//   urgency           : string   — human-readable urgency label
//   repairPriority    : string   — "DIY" | "DIY with caution" | "Professional" | "Replace"
//   warnings          : string[] — specific flags raised by the rule engine
//   combinations      : string[] — detected multi-symptom patterns
//   ageAdvice         : string   — device-age-specific recommendation
//   reasoning         : string[] — the exact rules that fired (transparency)
// }
// ============================================================


// ─── SYMPTOM COMBINATION PATTERNS ────────────────────────────
// Each entry defines a set of signals that, when detected together
// in the diagnosis result, trigger a specific combined insight.
// The engine checks for overlap, not exact string matching.
const COMBINATION_RULES = [
  {
    id: "thermal-cascade",
    signals: ["overheating", "battery", "slow", "shutdown", "thermal"],
    minHits: 2,
    label: "Thermal cascade risk",
    insight: "Overheating and battery stress detected together. Heat accelerates battery cell degradation — resolving the thermal issue first may restore battery performance without replacement."
  },
  {
    id: "water-electrical",
    signals: ["water", "liquid", "wet", "charge", "charging", "short", "corrosi"],
    minHits: 2,
    label: "Water + electrical risk",
    insight: "Liquid exposure combined with charging or electrical symptoms is high-risk. Do not attempt to power on or charge until fully dry — water + electricity causes irreversible board damage."
  },
  {
    id: "display-physical",
    signals: ["crack", "shatter", "screen", "display", "drop", "impact", "broken"],
    minHits: 2,
    label: "Physical impact pattern",
    insight: "Screen damage from physical impact often also stresses the device frame and internal ribbon cables. Inspect the charging port and camera module for secondary damage before ordering parts."
  },
  {
    id: "storage-performance",
    signals: ["slow", "freeze", "crash", "disk", "storage", "boot", "startup", "hang"],
    minHits: 2,
    label: "Storage-driven performance failure",
    insight: "Slow performance combined with crashes or freezes strongly indicates storage failure rather than CPU or RAM. Run a disk health check immediately — a failing drive risks data loss, not just slowdowns."
  },
  {
    id: "power-board",
    signals: ["won't turn on", "dead", "no power", "black screen", "wont start", "no display"],
    minHits: 2,
    label: "Total power failure pattern",
    insight: "Multiple power-loss signals detected. Before assuming motherboard failure, systematically eliminate the adapter, battery, and RAM — these resolve over 70% of no-power cases without board-level repair."
  },
  {
    id: "cooling-age",
    signals: ["fan", "dust", "thermal", "overheat", "throttle", "slow"],
    minHits: 2,
    label: "Accumulated thermal degradation",
    insight: "Fan noise and performance loss together indicate thermal paste dryout or vent blockage from years of use. A $5 thermal paste replacement can drop temperatures by 20–30°C and restore full performance."
  },
  {
    id: "drain-spin",
    signals: ["drain", "spin", "water", "stuck", "pump", "cycle"],
    minHits: 2,
    label: "Drain → spin dependency",
    insight: "Washing machines will not spin if they cannot drain first. Resolve the drainage issue before diagnosing the spin — 60% of spin failures are actually blocked drain pumps."
  },
  {
    id: "appliance-refrigerant",
    signals: ["cooling", "cold", "temperature", "compressor", "refrigerant", "freon"],
    minHits: 2,
    label: "Refrigerant or compressor system",
    insight: "Cooling failure with compressor-related symptoms indicates a sealed-system issue. Refrigerant handling requires certification — do not attempt this without professional equipment."
  }
];


// ─── RISK SCORING FACTORS ─────────────────────────────────────
// Each factor adds to a 0–100 composite risk score.
// The final score maps to a risk level label and urgency tier.

const SEVERITY_SCORES = {
  low:      10,
  medium:   25,
  high:     45,
  critical: 65
};

const DIFFICULTY_SCORES = {
  easy:   0,
  medium: 10,
  hard:   20
};

const CONFIDENCE_MODIFIERS = {
  high:   0,    // Confident match — no inflation
  medium: 5,    // Uncertain — slight risk bump
  low:    12    // Poor match — user should seek advice
};

// Fields that increase risk when present
const RISK_AMPLIFIERS = [
  { field: "technicianRequired", value: true,         score: 15, reason: "Professional repair required — DIY risk elevated" },
  { field: "difficulty",         value: "hard",        score: 10, reason: "Hard difficulty — high chance of secondary damage if attempted without experience" },
  { field: "severity",           value: "critical",    score: 20, reason: "Critical severity — immediate action required to prevent total loss" },
  { field: "severity",           value: "high",        score: 10, reason: "High severity — risk of permanent damage if left unresolved" }
];

// Keywords in the symptom text that indicate elevated risk
const HIGH_RISK_SYMPTOM_SIGNALS = [
  { pattern: /spark|arc|flash|electr/i,      score: 20, reason: "Electrical arcing or sparking detected — fire and shock hazard" },
  { pattern: /smoke|burn|smell|melt/i,       score: 25, reason: "Smoke or burning detected — stop use immediately, fire risk" },
  { pattern: /swell|bulg|bloat/i,            score: 25, reason: "Battery swelling detected — explosion and fire risk, do not charge" },
  { pattern: /water|wet|liquid|flood|submer/i, score: 15, reason: "Liquid exposure detected — do not power on" },
  { pattern: /child|baby|infant/i,           score: 10, reason: "Safety-sensitive context — prioritise professional assessment" },
  { pattern: /data.loss|corrupt|wipe|erase/i, score: 10, reason: "Data loss risk — back up immediately before any repair attempt" }
];


// ─── DEVICE AGE ADVICE RULES ──────────────────────────────────
// Maps device category + age bracket to specific advice.
// deviceAge is passed in from the frontend (optional field).
// If not provided, generic advice is generated from difficulty + category.

const AGE_ADVICE = {
  phone: {
    new:     "Your phone is under 1 year old — check manufacturer warranty first. Most faults are covered at no cost.",
    recent:  "1–2 year old phone: likely still under warranty or covered by retailer protection. Confirm before paying for repairs.",
    mid:     "2–3 year old phone: out of most warranties but well within viable repair lifespan. Repair is almost always more economical than replacement.",
    older:   "3–5 year old phone: weigh repair cost against a refurbished upgrade. Battery and screen replacements are still cost-effective.",
    aged:    "Over 5 years old: software support may have ended. Factor OS update availability into the repair-vs-replace decision."
  },
  laptop: {
    new:     "Under 1 year: manufacturer warranty applies. Contact support before opening the device — self-repair voids most laptop warranties.",
    recent:  "1–2 years: likely under extended warranty or purchase protection. Check your retailer or credit card benefits.",
    mid:     "2–4 years: prime repair window. SSD, RAM, and battery upgrades provide the biggest performance-per-cost gains.",
    older:   "4–6 years: thermal paste replacement + SSD upgrade can extend life by 2–3 years at low cost.",
    aged:    "Over 6 years: assess whether the CPU generation still meets your workload. Repair only if the cost is under 30% of a replacement."
  },
  refrigerator: {
    new:     "Under 2 years: covered by manufacturer warranty in most regions. Do not attempt self-repair — contact the manufacturer.",
    recent:  "2–5 years: well within the repair window. Most component repairs are cost-effective.",
    mid:     "5–10 years: sealed-system repairs (compressor, refrigerant) may not be economical. Replace sealed-system parts only if the appliance is otherwise in good condition.",
    older:   "10–15 years: consider energy efficiency. A new fridge may use 40% less electricity than a 15-year-old model.",
    aged:    "Over 15 years: replacement is almost always the better financial decision. Parts availability is also a risk."
  },
  "washing machine": {
    new:     "Under 2 years: manufacturer warranty covers most faults. Contact support before self-repair.",
    recent:  "2–5 years: all common faults (pump, belt, door seal) are cost-effective to repair.",
    mid:     "5–10 years: mechanical components are still viable to repair. Drum bearing failure in this range is borderline — get a quote first.",
    older:   "10–15 years: drum bearing or motor failure may exceed the appliance's value.",
    aged:    "Over 15 years: parts sourcing becomes difficult. Factor in water and energy efficiency of a new model."
  },
  microwave: {
    new:     "Under 1 year: warranty covers all electrical faults. Do not open the casing — it voids the warranty.",
    recent:  "1–3 years: door switches and turntable motors are inexpensive repairs.",
    mid:     "3–7 years: magnetron failure in this range is borderline — compare repair cost with a new unit.",
    older:   "Over 7 years: magnetron replacement cost often approaches replacement cost for the unit.",
    aged:    "Over 10 years: replace. Microwave efficiency and safety standards have improved significantly."
  },
  "air conditioner": {
    new:     "Under 2 years: manufacturer warranty. Do not attempt refrigerant work — it voids the warranty and requires certification.",
    recent:  "2–5 years: filter, capacitor, and fan repairs are all cost-effective.",
    mid:     "5–10 years: refrigerant issues and compressor faults are borderline — get a quote and compare with a new unit's energy savings.",
    older:   "10–15 years: a new inverter unit may pay for itself in energy savings within 3–4 years.",
    aged:    "Over 15 years: replace. R-22 refrigerant used in older units is being phased out and is increasingly expensive."
  }
};

function getAgeBracket(ageYears) {
  if (ageYears === null || ageYears === undefined) return null;
  const age = parseFloat(ageYears);
  if (isNaN(age) || age < 0) return null;
  if (age < 1)  return "new";
  if (age < 2)  return "recent";
  if (age < 5)  return "mid";
  if (age < 10) return "older";
  return "aged";
}


// ─── REPAIR PRIORITY CLASSIFICATION ──────────────────────────
// Maps composite risk score + technician flag to a clear action label.
function classifyRepairPriority(riskScore, technicianRequired, difficulty) {
  if (riskScore >= 75)                                  return "Replace";
  if (technicianRequired || riskScore >= 55)            return "Professional";
  if (difficulty === "hard" || riskScore >= 35)         return "DIY with caution";
  return "DIY";
}

// ─── URGENCY CLASSIFICATION ───────────────────────────────────
function classifyUrgency(riskScore, severity) {
  if (riskScore >= 70 || severity === "critical") return "⚠️ Act immediately";
  if (riskScore >= 45 || severity === "high")     return "🔶 Address within 24–48 hours";
  if (riskScore >= 25 || severity === "medium")   return "🔷 Resolve within the week";
  return "🟢 Low urgency — monitor the issue";
}

// ─── RISK LEVEL LABEL ─────────────────────────────────────────
function classifyRiskLevel(score) {
  if (score >= 70) return "Critical";
  if (score >= 45) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}


// ─── NARRATIVE GENERATOR ──────────────────────────────────────
// Produces an improved diagnosis string that incorporates the
// multi-factor context rather than just echoing the base diagnosis.
function buildNarrative(result, riskLevel, detectedCombinations, warnings) {
  const { diagnosis, severity, difficulty, device, confidence } = result;

  // Opening: what was found
  let narrative = diagnosis;

  // Add confidence framing
  if (confidence === "low") {
    narrative += ". The symptom description partially matched this pattern — if the diagnosis does not match your experience, try describing the issue with more specific detail";
  } else if (confidence === "medium") {
    narrative += ". This diagnosis matches several reported symptoms for this device type";
  } else {
    narrative += ". This matches a well-documented failure pattern for this device category";
  }

  // Add severity context
  if (severity === "critical") {
    narrative += ". This is a critical fault — continued use risks complete device failure or a safety hazard";
  } else if (severity === "high") {
    narrative += ". This is a significant fault that will worsen without intervention";
  } else if (severity === "low") {
    narrative += ". This is a minor fault with low risk of progression";
  }

  // Add combination pattern context
  if (detectedCombinations.length > 0) {
    narrative += `. Multi-symptom pattern detected: ${detectedCombinations[0].label}`;
  }

  // Add safety warning if flagged
  const safetyWarning = warnings.find(w =>
    w.includes("fire") || w.includes("shock") || w.includes("explosion") || w.includes("swell")
  );
  if (safetyWarning) {
    narrative += `. SAFETY ALERT: ${safetyWarning}`;
  }

  return narrative;
}


// ─── RECOMMENDATION GENERATOR ─────────────────────────────────
// Produces the extraAdvice string shown under "Recommendation".
function buildRecommendation(result, repairPriority, riskScore, detectedCombinations) {
  const { difficulty, technicianRequired, steps, severity } = result;

  if (repairPriority === "Replace") {
    return "Based on the severity and difficulty of this fault, replacement is likely the most cost-effective path. Obtain a repair quote first and compare it against 30% of the replacement cost — if the repair exceeds that threshold, replacement is the better investment.";
  }

  if (repairPriority === "Professional") {
    const reason = technicianRequired
      ? "this repair involves components that carry safety risks (high voltage, refrigerant, sealed systems)"
      : "the combination of severity and difficulty makes DIY attempts high-risk for secondary damage";
    return `Professional repair is recommended because ${reason}. Get at least two quotes. Describe all symptoms precisely — vague descriptions lead to misdiagnosis and unnecessary part replacements.`;
  }

  if (repairPriority === "DIY with caution") {
    const hasAdvancedSteps = steps?.advanced?.length > 0;
    return `This repair is achievable without a technician but requires care. Start with all beginner steps — they resolve this fault in over half of cases at zero cost. ${hasAdvancedSteps ? "Only progress to advanced steps if beginner and intermediate steps have not resolved the issue. " : ""}Gather all tools before starting and work in a clean, well-lit, static-free environment.`;
  }

  // Standard DIY
  const beginnerCount = steps?.beginner?.length || 0;
  return `Start with the ${beginnerCount} beginner step${beginnerCount !== 1 ? "s" : ""} — these are zero-cost and resolve this specific issue in the majority of cases. Only move to intermediate steps if beginner steps do not help after 24 hours. There is no need to spend money on parts until software and basic hardware checks have been exhausted.`;
}


// ─── MAIN EXPORT ─────────────────────────────────────────────
export async function enhanceDiagnosis(baseResult) {
  try {
    const {
      severity    = "medium",
      difficulty  = "medium",
      confidence  = "medium",
      device      = "",
      diagnosis   = "",
      symptom     = "",   // passed through if available
      technicianRequired = false,
      deviceAge   = null  // optional: years as number, e.g. 3.5
    } = baseResult;

    // Build a searchable text blob from all available context
    // so combination and signal rules can pattern-match across everything
    const contextText = [
      diagnosis,
      device,
      symptom,
      severity,
      difficulty,
      ...(baseResult.causes || []),
      ...(baseResult.steps?.beginner || []),
      ...(baseResult.steps?.advanced || [])
    ].join(" ").toLowerCase();


    // ── 1. BASE RISK SCORE ─────────────────────────────────
    let riskScore = 0;
    const reasoning = [];

    const sevScore = SEVERITY_SCORES[severity] ?? SEVERITY_SCORES.medium;
    riskScore += sevScore;
    reasoning.push(`Severity "${severity}" → +${sevScore} points`);

    const diffScore = DIFFICULTY_SCORES[difficulty] ?? DIFFICULTY_SCORES.medium;
    riskScore += diffScore;
    if (diffScore > 0) reasoning.push(`Difficulty "${difficulty}" → +${diffScore} points`);

    const confMod = CONFIDENCE_MODIFIERS[confidence] ?? CONFIDENCE_MODIFIERS.medium;
    riskScore += confMod;
    if (confMod > 0) reasoning.push(`Confidence "${confidence}" → +${confMod} uncertainty points`);


    // ── 2. RISK AMPLIFIERS ────────────────────────────────
    for (const amp of RISK_AMPLIFIERS) {
      if (baseResult[amp.field] === amp.value) {
        riskScore += amp.score;
        reasoning.push(`${amp.reason} → +${amp.score} points`);
      }
    }


    // ── 3. SYMPTOM SIGNAL SCANNING ────────────────────────
    const warnings = [];
    for (const signal of HIGH_RISK_SYMPTOM_SIGNALS) {
      if (signal.pattern.test(contextText)) {
        riskScore += signal.score;
        warnings.push(signal.reason);
        reasoning.push(`Signal match "${signal.pattern.source}" → +${signal.score} points`);
      }
    }


    // ── 4. SYMPTOM COMBINATION DETECTION ──────────────────
    const detectedCombinations = [];
    for (const rule of COMBINATION_RULES) {
      const hits = rule.signals.filter(sig => contextText.includes(sig));
      if (hits.length >= rule.minHits) {
        detectedCombinations.push({
          label:   rule.label,
          insight: rule.insight,
          hits:    hits.length
        });
        reasoning.push(`Combination "${rule.id}" fired (${hits.length}/${rule.minHits} signals: ${hits.join(", ")})`);
      }
    }

    // Combination detection adds to risk score based on how many fired
    const combinationBonus = detectedCombinations.length * 8;
    if (combinationBonus > 0) {
      riskScore += combinationBonus;
      reasoning.push(`${detectedCombinations.length} combination pattern(s) detected → +${combinationBonus} points`);
    }


    // ── 5. CAP AND CLASSIFY ───────────────────────────────
    riskScore = Math.min(100, Math.max(0, Math.round(riskScore)));

    const riskLevel      = classifyRiskLevel(riskScore);
    const urgency        = classifyUrgency(riskScore, severity);
    const repairPriority = classifyRepairPriority(riskScore, technicianRequired, difficulty);


    // ── 6. DEVICE AGE ADVICE ──────────────────────────────
    let ageAdvice = null;
    const deviceKey  = device.toLowerCase().trim();
    const ageBracket = getAgeBracket(deviceAge);
    const ageTable   = AGE_ADVICE[deviceKey];

    if (ageTable && ageBracket) {
      ageAdvice = ageTable[ageBracket];
      reasoning.push(`Device age bracket "${ageBracket}" for "${deviceKey}" → age advice applied`);
    } else if (ageTable) {
      // No age provided — give a general prompt to consider device age
      ageAdvice = `Consider your ${deviceKey}'s age when deciding between repair and replacement. Devices under 3 years old are almost always worth repairing; over 7 years, weigh repair cost against modern energy efficiency and feature improvements.`;
    }


    // ── 7. BUILD HUMAN-READABLE OUTPUTS ──────────────────
    const improvedDiagnosis = buildNarrative(
      baseResult, riskLevel, detectedCombinations, warnings
    );

    const extraAdvice = buildRecommendation(
      baseResult, repairPriority, riskScore, detectedCombinations
    );


    // ── 8. RETURN FULL ENHANCED PAYLOAD ──────────────────
    return {
      // Core fields — rendered by existing script.js ai-box block
      improvedDiagnosis,
      extraAdvice,
      riskLevel,

      // Extended fields — rendered by updated script.js
      riskScore,
      urgency,
      repairPriority,
      warnings,          // string[] — safety and data-loss flags
      combinations: detectedCombinations.map(c => c.insight),
      ageAdvice,
      reasoning          // string[] — full rule trace for transparency panel
    };

  } catch (err) {
    console.error("aiEnhancer error:", err.message);

    // Safe fallback — never crash the diagnosis endpoint
    return {
      improvedDiagnosis: baseResult.diagnosis || "Diagnosis complete.",
      extraAdvice:       "Start with beginner steps before attempting advanced repairs.",
      riskLevel:         "Medium",
      riskScore:         30,
      urgency:           "🔷 Resolve within the week",
      repairPriority:    "DIY",
      warnings:          [],
      combinations:      [],
      ageAdvice:         null,
      reasoning:         ["Fallback — enhancer error: " + err.message]
    };
  }
}