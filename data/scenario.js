window.ZTT_SCENARIO = {
  initialState: {
    trustAuthorityScore: 40,
    securityForcesFatigue: 20,
    missionContinuityImpact: 42,
    elapsedHours: 0,
    currentPhase: 0,
    decisions: [],
    flags: {
      assumedBreach: false,
      attemptedUnsafePatch: false,
      manualVerificationDefined: false,
      evidenceBaselineEstablished: false,
      recoveryAuthorized: false
    }
  },
  constraints: [
    "Lenel-style PACS telemetry is suspect until independently validated.",
    "Badge readers, identity assertions, and access logs cannot be treated as authoritative.",
    "Security Forces can sustain manual surge operations for only 72 hours.",
    "Immediate OT patching or configuration changes require validation and mission-risk review.",
    "Recovery requires evidence-based reconstitution criteria, not convenience."
  ],
  trustVectors: [
    { label: "PACS Authority", status: "UNTRUSTED", detail: "Controllers and server-side assertions may be compromised." },
    { label: "Access Logs", status: "POISONED", detail: "Useful as leads, not proof." },
    { label: "Badge Readers", status: "DEGRADED", detail: "Reader decisions require independent human verification." },
    { label: "Manual Checkpoints", status: "AVAILABLE", detail: "Effective only with specific procedures and fatigue management." }
  ],
  commandResponses: {
    HELP: "SUPPORTED COMMANDS: HELP, STATUS, QUERY PACS, QUERY ACCESS LOGS, DECLARE BREACH ASSUMED, DEPLOY MANUAL CHECKPOINTS, WRITE VERIFICATION SOP, ADVANCE CLOCK, ANALYZE CSV, AUTHORIZE RECOVERY, RESET",
    "QUERY PACS": "PACS STATUS: DEGRADED\nController heartbeat is inconsistent. Reader decisions may be replayed or forged.\nTraining note: PACS output is an input to investigation, not an authority.",
    "QUERY ACCESS LOGS": "ACCESS LOG STATUS: DEGRADED\nIntegrity confidence: LOW\nPotential manipulation detected.\nTraining note: Logs may inform the investigation, but they are not authoritative while the trust boundary is compromised.",
    "ANALYZE CSV": "CSV ANALYSIS: SAMPLE ANOMALIES DETECTED\n- Badge IDs appearing at conflicting gates within impossible travel windows\n- After-hours entries tied to stale credentials\n- Reader events missing corroborating guard observations\nTraining note: Anomaly analysis helps build evidence, but recovery still requires verified system state and credential integrity."
  },
  positiveSignals: [
    "assume breach",
    "untrusted",
    "manual verification",
    "independent verification",
    "guard",
    "checkpoint",
    "evidence",
    "baseline",
    "validate",
    "reconstitution",
    "phased recovery",
    "fatigue",
    "72 hour",
    "mission continuity",
    "least privilege",
    "verify explicitly",
    "credential integrity"
  ],
  negativeSignals: [
    "immediate patch",
    "hotfix",
    "trust logs",
    "logs are authoritative",
    "restore automation",
    "turn it back on",
    "ignore fatigue",
    "skip validation",
    "business as usual",
    "auto approve",
    "declare recovered",
    "it playbook"
  ],
  referenceCards: [
    { title: "Assume Breach", body: "Operate as though the PACS trust boundary has failed until independent evidence proves otherwise." },
    { title: "Least Privilege", body: "Limit access paths and exception handling to the minimum needed for mission continuity." },
    { title: "Verify Explicitly", body: "Require corroborating identity, device, role, and mission need before permitting access." },
    { title: "Device Trust", body: "Readers and controllers must be checked for integrity before automated decisions resume." },
    { title: "Identity Trust", body: "Badge possession alone is not enough when credentials may be stale, copied, or replayed." },
    { title: "Log Integrity", body: "Logs become investigative evidence only after provenance and completeness are established." },
    { title: "OT Boundary Constraints", body: "Patch and restore decisions must respect availability, safety, testing, and mission dependencies." },
    { title: "Manual Verification", body: "Human fallback requires precise steps, escalation paths, and fatigue-aware staffing." },
    { title: "Recovery Criteria", body: "Recovery is authorized by verified trust, not pressure to reduce inconvenience." },
    { title: "72-Hour Fatigue Limit", body: "Manual surge operations degrade quickly and must be managed as a security risk." }
  ],
  traps: [
    "Treating a partial log query as proof.",
    "Replacing broken automation with vague guard instructions.",
    "Letting convenience define recovery.",
    "Ignoring the throughput impact of manual checks.",
    "Applying IT remediation habits without OT validation."
  ]
};
