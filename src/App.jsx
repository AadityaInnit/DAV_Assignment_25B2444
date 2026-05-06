import { useState } from "react";

// ── Pre-trained Linear Regression Model (R² = 0.83 on held-out test set) ──────
const MODEL = {
  intercept: 5.808625,
  coef: {
    Gender: 0.011286051971738867,
    Department: -0.0005765164431763004,
    Year_of_Study: 0.024799756009374813,
    Living_Situation: 0.026801214283927805,
    StudyHoursPerDay: 0.7537508479743208,
    SleepHoursPerNight: 0.1958434294713204,
    InternetUsageHours: -0.2744753097119696,
    AttendanceRate: 0.301737763303538,
    ExtracurricularHoursPerWeek: 0.02886019493505189,
    PhysicalActivityHoursPerWeek: -0.12526912540758584,
    PartTimeJobHoursPerWeek: 0.003792471412343195,
    StressLevel: 0.002002859037635515,
    Diet_Quality: -0.006799322534362627,
  },
  scalerMean: {
    Gender: 0.6125, Department: 4.61375, Year_of_Study: 2.375,
    Living_Situation: 0.4475, StudyHoursPerDay: 4.2910052733875,
    SleepHoursPerNight: 6.374925, InternetUsageHours: 3.9979812364500003,
    AttendanceRate: 77.65825, ExtracurricularHoursPerWeek: 3.3663125,
    PhysicalActivityHoursPerWeek: 2.633575, PartTimeJobHoursPerWeek: 4.5306625,
    StressLevel: 6.26025, Diet_Quality: 1.34625,
  },
  scalerScale: {
    Gender: 0.5566361019553079, Department: 2.9042315571420954,
    Year_of_Study: 1.1288821904875637, Living_Situation: 0.49723611091713765,
    StudyHoursPerDay: 2.0635570142912174, SleepHoursPerNight: 1.1347626379005435,
    InternetUsageHours: 2.1715131273519415, AttendanceRate: 12.737109442000568,
    ExtracurricularHoursPerWeek: 1.9992374239553816,
    PhysicalActivityHoursPerWeek: 1.2601190298440064,
    PartTimeJobHoursPerWeek: 3.342606084493617,
    StressLevel: 1.4913483622212484, Diet_Quality: 1.0518369348430392,
  },
};

const FEATURE_IMPORTANCES = {
  StudyHoursPerDay: 0.7543,
  InternetUsageHours: 0.1035,
  AttendanceRate: 0.0551,
  SleepHoursPerNight: 0.0197,
  StressLevel: 0.0154,
  ExtracurricularHoursPerWeek: 0.0126,
  PhysicalActivityHoursPerWeek: 0.0124,
  PartTimeJobHoursPerWeek: 0.0101,
};

// [NEW] Global dataset averages — injected into the LLM prompt so it can make
// specific comparisons like "you're studying 1.7 hrs less than the campus average"
const GLOBAL_AVERAGES = {
  StudyHoursPerDay:   { mean: 4.30, unit: "hrs/day"   },
  InternetUsageHours: { mean: 4.00, unit: "hrs/day"   },
  AttendanceRate:     { mean: 77.7, unit: "%"          },
  SleepHoursPerNight: { mean: 6.36, unit: "hrs/night" },
  StressLevel:        { mean: 6.24, unit: "/ 10"       },
};

// [NEW] Blocklist — if any of these phrases appear in the LLM output we discard
// it entirely and fall back to the safe tier-based message instead.
const BLOCKLIST = [
  "drop out", "dropout", "quit", "suicide", "self-harm", "self harm",
  "therapist", "psychiatrist", "medication", "antidepressant",
  "withdraw", "medical leave", "hospitali",
];

// [NEW] Tier-based fallback messages — shown when LLM API is down OR the
// blocklist is triggered. Each message references the student's actual numbers
// so it remains useful and specific even without the LLM.
function getFallbackMessage(grade, formData) {
  const study    = Number(formData.StudyHoursPerDay);
  const internet = Number(formData.InternetUsageHours);
  const attendance = Number(formData.AttendanceRate);
  const diff     = (study - 4.30).toFixed(1);
  const sign     = diff >= 0 ? "+" : "";

  if (grade >= 7.5) {
    return `Your predicted grade of ${grade.toFixed(2)} puts you in the top tier. Your study hours (${study.toFixed(1)} hrs/day, ${sign}${diff} vs campus average) are a key driver — keep that consistency, and watch that internet usage (${internet.toFixed(1)} hrs/day) doesn't creep up during exam season.`;
  }
  if (grade >= 6.0) {
    return `Your predicted grade of ${grade.toFixed(2)} is solid but there is clear room to grow. You are studying ${study.toFixed(1)} hrs/day (${sign}${diff} vs the 4.3 hr campus average) — try adding just 45 focused minutes daily and aim to push attendance above ${Math.min(100, Math.round(attendance + 8))}%.`;
  }
  return `Your predicted grade of ${grade.toFixed(2)} suggests your current habits need adjustment. Your study hours (${study.toFixed(1)} hrs/day) are below the 4.3 hr campus average — consider replacing ${Math.min(internet, 1.5).toFixed(1)} of your ${internet.toFixed(1)} daily internet hours with structured revision this week.`;
}

const STATS = {
  StudyHoursPerDay:            { p25: 2.70, p50: 4.15, p75: 5.90 },
  InternetUsageHours:          { p25: 2.16, p50: 3.66, p75: 5.69 },
  AttendanceRate:              { p25: 67.8, p50: 78.7, p75: 88.2 },
  SleepHoursPerNight:          { p25: 5.62, p50: 6.46, p75: 7.23 },
  StressLevel:                 { p25: 5.2,  p50: 6.3,  p75: 7.3  },
  ExtracurricularHoursPerWeek: { p25: 1.44, p50: 3.33, p75: 4.82 },
};

const ENCODERS = {
  Gender: ["Female", "Male", "Non-binary"],
  Department: ["Aerospace Engineering","Biology","Chemical Engineering","Civil Engineering","Computer Science","Economics","Electrical Engineering","Mathematics","Mechanical Engineering","Physics"],
  Living_Situation: ["Off-campus", "On-campus"],
  Diet_Quality: ["Average", "Excellent", "Good", "Poor"],
};

function predict(formData) {
  const features = {
    Gender: ENCODERS.Gender.indexOf(formData.Gender),
    Department: ENCODERS.Department.indexOf(formData.Department),
    Year_of_Study: Number(formData.Year_of_Study),
    Living_Situation: ENCODERS.Living_Situation.indexOf(formData.Living_Situation),
    StudyHoursPerDay: Number(formData.StudyHoursPerDay),
    SleepHoursPerNight: Number(formData.SleepHoursPerNight),
    InternetUsageHours: Number(formData.InternetUsageHours),
    AttendanceRate: Number(formData.AttendanceRate),
    ExtracurricularHoursPerWeek: Number(formData.ExtracurricularHoursPerWeek),
    PhysicalActivityHoursPerWeek: Number(formData.PhysicalActivityHoursPerWeek),
    PartTimeJobHoursPerWeek: Number(formData.PartTimeJobHoursPerWeek),
    StressLevel: Number(formData.StressLevel),
    Diet_Quality: ENCODERS.Diet_Quality.indexOf(formData.Diet_Quality),
  };
  let score = MODEL.intercept;
  for (const [k, v] of Object.entries(features)) {
    const scaled = (v - MODEL.scalerMean[k]) / MODEL.scalerScale[k];
    score += MODEL.coef[k] * scaled;
  }
  return Math.min(10, Math.max(4.5, Math.round(score * 100) / 100));
}

function getPercentileLabel(feature, value) {
  const s = STATS[feature];
  if (!s) return null;
  if (value < s.p25) return "below the 25th percentile";
  if (value < s.p50) return "between 25th–50th percentile";
  if (value < s.p75) return "between 50th–75th percentile";
  return "above the 75th percentile";
}

function gradeStatus(g) {
  if (g >= 7.5) return { label: "Strong", color: "#16a34a", bg: "#dcfce7", emoji: "▲" };
  if (g >= 6.0) return { label: "Average", color: "#d97706", bg: "#fef3c7", emoji: "●" };
  return { label: "At Risk", color: "#dc2626", bg: "#fee2e2", emoji: "▼" };
}

// [NEW] Run LLM output through the blocklist before showing it to the student
function isOutputSafe(text) {
  const lower = text.toLowerCase();
  return !BLOCKLIST.some(word => lower.includes(word));
}

async function fetchRecommendation(formData, predictedGrade) {
  const sleep = Number(formData.SleepHoursPerNight);
  const study = Number(formData.StudyHoursPerDay);

  const top3 = Object.entries(FEATURE_IMPORTANCES)
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => f);

  // [NEW] Build feature context WITH campus averages so LLM can be specific
  const top3Context = top3.map(f => {
    const val = Number(formData[f]);
    const pct = getPercentileLabel(f, val);
    const avg = GLOBAL_AVERAGES[f];
    const diff = avg ? (val - avg.mean).toFixed(1) : null;
    const diffStr = diff !== null
      ? ` (campus avg: ${avg.mean} ${avg.unit}, you are ${diff >= 0 ? "+" : ""}${diff})`
      : "";
    return `- ${f.replace(/_/g, " ")}: ${val}${avg?.unit || ""}${diffStr} — ${pct || "N/A"}`;
  }).join("\n");

  // [NEW] Max-out fallacy detection: study > 9 hrs AND sleep < 4 hrs
  // The model would predict a high grade (study hours dominate 75%) but this is
  // a statistical artefact. We must override the prompt so the LLM never praises it.
  const isMaxOutCase = study > 9 && sleep < 4;

  // [NEW] Sleep critical override: any sleep below 4 hrs triggers health-first prompt
  const isSleepCritical = sleep < 4;

  // [NEW] Conditionally swap the system prompt based on health flags
  const systemPrompt = isSleepCritical
    ? `You are a caring academic advisor at IIT Bombay. This student is sleeping fewer than 4 hours per night, which is a serious health and cognitive risk. Regardless of their predicted grade or study hours, you MUST open by clearly flagging sleep as the most urgent priority. Do not praise their study discipline under any circumstance. Keep your response to 2–3 warm, direct sentences. End with one concrete action for this week.`
    : `You are a supportive, data-driven academic advisor at IIT Bombay. Your advice must feel like a real conversation with a mentor who knows the student's numbers — not a generic motivational poster. Reference the student's specific values and how they compare to the campus average (e.g. "You're studying 1.7 hrs less than the average student here"). Keep your response to exactly 2–3 sentences. End with one concrete, measurable action the student can take this week. Never prescribe specific daily schedules or suggest medical attention.`;

  // [NEW] Inject a hard warning into the user prompt when max-out is detected
  const maxOutNote = isMaxOutCase
    ? `\nWARNING: This student is studying ${study} hrs/day on only ${sleep} hrs of sleep. The high predicted grade is a statistical artefact — the model rewards study hours but cannot model sleep-deprivation-induced cognitive decline. Do NOT praise the study hours. Prioritise sleep above all else.\n`
    : "";

  const userPrompt = `${maxOutNote}Student's predicted Cumulative Grade: ${predictedGrade.toFixed(2)} / 10.0
Grade context: 4.5–5.9 = at risk, 6.0–7.4 = average, 7.5–10.0 = strong performer.

Top 3 most influential habit features:
${top3Context}

Write a personalised, conversational 2–3 sentence recommendation that references the student's specific numbers and how they compare to campus averages. Be a mentor, not a chatbot.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  const data = await resp.json();
  const text = data.content.find(b => b.type === "text")?.text || "";

  // [NEW] Discard and return null if blocklist is triggered — caller uses fallback
  if (!isOutputSafe(text)) return null;

  return text;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      {children}{required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
    </label>
  );
}

function SelectField({ label, name, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label required={required}>{label}</Label>
      <select name={name} value={value} onChange={onChange} required={required}
        style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SliderField({ label, name, value, onChange, min, max, step, unit }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <Label>{label}</Label>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
          {Number(value).toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <input type="range" name={name} min={min} max={max} step={step} value={value} onChange={onChange}
        style={{ width: "100%", accentColor: "#2563eb" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 2 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function GaugeDisplay({ grade }) {
  const pct = ((grade - 4.5) / (10 - 4.5)) * 100;
  const status = gradeStatus(grade);
  const cx = 100, cy = 90, r = 72;
  const angle = -Math.PI + (pct / 100) * Math.PI;
  const nx = cx + r * Math.cos(angle), ny = cy + r * Math.sin(angle);
  function arc(fr, to, rad) {
    const x1 = cx + rad * Math.cos(fr), y1 = cy + rad * Math.sin(fr);
    const x2 = cx + rad * Math.cos(to), y2 = cy + rad * Math.sin(to);
    return `M ${x1} ${y1} A ${rad} ${rad} 0 ${to - fr > Math.PI ? 1 : 0} 1 ${x2} ${y2}`;
  }
  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 200 110" style={{ width: "100%", maxWidth: 240, display: "block", margin: "0 auto" }}>
        <path d={arc(-Math.PI, 0, 72)} fill="none" stroke="var(--color-border-tertiary)" strokeWidth="14" strokeLinecap="round"/>
        <path d={arc(-Math.PI, angle, 72)} fill="none" stroke={status.color} strokeWidth="14" strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={status.color} strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="5" fill={status.color}/>
        <text x={cx} y={cy - 10} textAnchor="middle" style={{ fontSize: 22, fontWeight: 500, fill: "var(--color-text-primary)" }}>{grade.toFixed(2)}</text>
        <text x={cx} y={cy + 5} textAnchor="middle" style={{ fontSize: 9, fill: "var(--color-text-secondary)" }}>/ 10.0</text>
      </svg>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 20, background: status.bg, color: status.color, fontSize: 13, fontWeight: 500, marginTop: 4 }}>
        {status.emoji} {status.label}
      </div>
    </div>
  );
}

const DEFAULTS = {
  Gender: "Male", Department: "Computer Science", Year_of_Study: "2",
  Living_Situation: "On-campus", StudyHoursPerDay: "4",
  SleepHoursPerNight: "6.5", InternetUsageHours: "4",
  AttendanceRate: "75", ExtracurricularHoursPerWeek: "3",
  PhysicalActivityHoursPerWeek: "2.5", PartTimeJobHoursPerWeek: "4",
  StressLevel: "6", Diet_Quality: "Good",
};

const FIELD_LABELS = {
  StudyHoursPerDay: "Study Hours / Day",
  SleepHoursPerNight: "Sleep Hours / Night",
  InternetUsageHours: "Internet Usage Hours / Day",
  AttendanceRate: "Attendance Rate (%)",
  ExtracurricularHoursPerWeek: "Extracurricular Hours / Week",
  PhysicalActivityHoursPerWeek: "Physical Activity Hours / Week",
  PartTimeJobHoursPerWeek: "Part-time Job Hours / Week",
  StressLevel: "Stress Level (1–10)",
};

const FIELD_RANGES = {
  StudyHoursPerDay:            { min: 0,  max: 12,  step: 0.1 },
  SleepHoursPerNight:          { min: 3,  max: 10,  step: 0.1 },
  InternetUsageHours:          { min: 0,  max: 12,  step: 0.1 },
  AttendanceRate:              { min: 0,  max: 100, step: 0.1 },
  ExtracurricularHoursPerWeek: { min: 0,  max: 15,  step: 0.1 },
  PhysicalActivityHoursPerWeek:{ min: 0,  max: 10,  step: 0.1 },
  PartTimeJobHoursPerWeek:     { min: 0,  max: 20,  step: 0.1 },
  StressLevel:                 { min: 1,  max: 10,  step: 0.1 },
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function StudentAdvisor() {
  const [form, setForm] = useState(DEFAULTS);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("form");
  const [result, setResult] = useState(null);
  const [llmError, setLlmError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(err => { const e = { ...err }; delete e[name]; return e; });
  };

  const validate = () => {
    const e = {};
    Object.keys(FIELD_RANGES).forEach(f => {
      const v = Number(form[f]);
      const r = FIELD_RANGES[f];
      if (isNaN(v)) e[f] = "Must be a number";
      else if (v < r.min || v > r.max) e[f] = `Must be between ${r.min} and ${r.max}`;
    });
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setPhase("loading");
    const grade = predict(form);
    try {
      const recommendation = await fetchRecommendation(form, grade);
      setResult({
        grade,
        // [NEW] If blocklist triggered (null returned), use safe fallback
        recommendation: recommendation ?? getFallbackMessage(grade, form),
        usedFallback: recommendation === null,
      });
      setPhase("result");
    } catch (err) {
      // [NEW] On full API failure, use tier-based fallback with real numbers
      setResult({
        grade,
        recommendation: getFallbackMessage(grade, form),
        usedFallback: true,
      });
      setLlmError(err.message);
      setPhase("result");
    }
  };

  const top3 = Object.entries(FEATURE_IMPORTANCES).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => f);
  const sleep = Number(form.SleepHoursPerNight);
  const study = Number(form.StudyHoursPerDay);
  const isSleepCritical = sleep < 4;
  const isMaxOut = study > 9 && sleep < 4;

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 680, margin: "0 auto", padding: "0 0 2rem" }}>
      <h2 className="sr-only">IIT Bombay Student Performance Advisor</h2>

      <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "var(--border-radius-md)", background: "var(--color-background-info)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-info)" strokeWidth="2" strokeLinecap="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>Student Performance Advisor</h1>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>IIT Bombay · AI-powered grade prediction + personalised guidance</p>
          </div>
        </div>
      </div>

      {phase === "form" && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Demographics</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <SelectField label="Gender" name="Gender" value={form.Gender} onChange={handleChange} options={ENCODERS.Gender} required />
            <SelectField label="Department" name="Department" value={form.Department} onChange={handleChange} options={ENCODERS.Department} required />
            <SelectField label="Year of study" name="Year_of_Study" value={form.Year_of_Study} onChange={handleChange} options={["1","2","3","4"]} required />
            <SelectField label="Living situation" name="Living_Situation" value={form.Living_Situation} onChange={handleChange} options={ENCODERS.Living_Situation} required />
            <SelectField label="Diet quality" name="Diet_Quality" value={form.Diet_Quality} onChange={handleChange} options={ENCODERS.Diet_Quality} required />
          </div>

          <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", marginTop: 8, paddingTop: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>Daily habits & engagement</p>
            {Object.entries(FIELD_RANGES).map(([name, range]) => (
              <div key={name}>
                <SliderField label={FIELD_LABELS[name]} name={name} value={form[name]}
                  onChange={handleChange} min={range.min} max={range.max} step={range.step}
                  unit={name === "AttendanceRate" ? "%" : name === "StressLevel" ? "" : " hrs"} />
                {errors[name] && <p style={{ color: "#dc2626", fontSize: 11, marginTop: -10, marginBottom: 8 }}>{errors[name]}</p>}
              </div>
            ))}
          </div>

          <button onClick={handleSubmit}
            style={{ width: "100%", marginTop: 8, padding: "11px 0", borderRadius: "var(--border-radius-md)", background: "#2563eb", color: "#fff", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            Predict my grade &amp; get advice →
          </button>
          <p style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 10 }}>
            Model: Linear Regression (R² = 0.83) · LLM: Claude Sonnet 4
          </p>
        </div>
      )}

      {phase === "loading" && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--color-border-tertiary)", borderTopColor: "#2563eb", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Running model · generating recommendation…</p>
        </div>
      )}

      {phase === "result" && result && (
        <div>
          {/* [NEW] Max-out fallacy banner — study > 9 AND sleep < 4 */}
          {isMaxOut && (
            <div style={{ background: "#fff7ed", border: "0.5px solid #fed7aa", borderRadius: "var(--border-radius-md)", padding: "12px 16px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 15 }}>⚠</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#c2410c" }}>Max-out fallacy detected</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9a3412", lineHeight: 1.6 }}>
                  Your predicted grade may be inflated. Studying {study.toFixed(1)} hrs/day on only {sleep.toFixed(1)} hrs of sleep causes cognitive decline that the statistical model cannot capture. Sleep deprivation actively undermines the study hours driving this prediction.
                </p>
              </div>
            </div>
          )}

          {/* [NEW] Sleep critical banner — sleep < 4, non-max-out case */}
          {isSleepCritical && !isMaxOut && (
            <div style={{ background: "#fef2f2", border: "0.5px solid #fecaca", borderRadius: "var(--border-radius-md)", padding: "12px 16px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 15 }}>●</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#dc2626" }}>Critical: fewer than 4 hours of sleep</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#991b1b", lineHeight: 1.6 }}>
                  Sleep below 4 hrs/night severely impairs memory consolidation and exam performance regardless of study time. Please treat this as your top priority this week.
                </p>
              </div>
            </div>
          )}

          {/* Grade gauge */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "20px 24px", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>Predicted cumulative grade</p>
            <GaugeDisplay grade={result.grade} />
          </div>

          {/* Key features with delta vs average */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "20px 24px", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Key factors in this prediction</p>
            {top3.map(f => {
              const val = Number(form[f]);
              const pct = getPercentileLabel(f, val);
              const avg = GLOBAL_AVERAGES[f];
              const diff = avg ? val - avg.mean : null;
              // [NEW] Colour-code delta: for internet, higher is worse; for others, higher is better
              const diffColor = diff === null ? "var(--color-text-tertiary)"
                : f === "InternetUsageHours"
                  ? diff > 0 ? "#dc2626" : "#16a34a"
                  : diff >= 0 ? "#16a34a" : "#dc2626";
              const diffStr = diff !== null
                ? `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} vs avg`
                : null;
              const imp = FEATURE_IMPORTANCES[f];
              return (
                <div key={f} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{FIELD_LABELS[f] || f}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {diffStr && <span style={{ fontSize: 11, color: diffColor, fontWeight: 500 }}>{diffStr}</span>}
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{val.toFixed(1)} — <em>{pct}</em></span>
                    </div>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round(imp * 100)}%`, background: "#2563eb", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{Math.round(imp * 100)}% importance</span>
                </div>
              );
            })}
          </div>

          {/* Recommendation card */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Personalised recommendation</p>
              {/* [NEW] Badge shows when fallback was used and why */}
              {result.usedFallback && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                  {llmError ? "API unavailable · fallback used" : "Safety filter active · fallback used"}
                </span>
              )}
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--color-text-primary)", margin: 0 }}>
              {result.recommendation}
            </p>
            {llmError && (
              <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 8, marginBottom: 0 }}>
                Technical detail: {llmError}
              </p>
            )}
          </div>

          <button onClick={() => { setPhase("form"); setResult(null); setLlmError(null); }}
            style={{ width: "100%", padding: "10px 0", borderRadius: "var(--border-radius-md)", background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 14, cursor: "pointer" }}>
            ← Try different inputs
          </button>
        </div>
      )}
    </div>
  );
}
