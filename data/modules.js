window.ZTT_MODULES = [
  {
    id: "brief",
    title: "Mission Brief",
    phaseLabel: "Mission Brief",
    objective: "Understand the operational trust collapse before selecting controls.",
    narrative: "A physical access control environment is suspected of compromise. Badge activity, reader events, identity assertions, and access logs may be manipulated. Automated access decisions are no longer trustworthy. Security Forces can sustain manual surge operations for 72 hours before fatigue becomes a primary security risk.",
    prompt: "Frame the problem for an installation commander. What should the team stop trusting, what must remain operational, and what is the first disciplined Zero Trust posture?",
    commandHint: "Try STATUS or QUERY PACS.",
    hint: "Start by naming the trust boundary failure. Avoid jumping directly to patching or full restoration.",
    instructorNotes: "Look for explicit recognition that PACS, logs, and badge assertions are suspect. Strong answers preserve mission continuity while refusing false certainty.",
    focusCards: ["Assume Breach", "OT Boundary Constraints", "Log Integrity"]
  },
  {
    id: "phase-1",
    title: "Phase 1: Zero Trust Triage",
    phaseLabel: "Phase 1",
    objective: "Determine what can and cannot be trusted under PACS compromise.",
    narrative: "The access control server continues to answer queries, but its outputs are inconsistent. Some badge events look normal; others suggest replay, missing context, or impossible movement. The team needs a triage posture that treats telemetry as clues rather than authority.",
    prompt: "Submit a triage action that establishes an assume-breach posture and defines which sources require independent validation.",
    commandHint: "Try QUERY ACCESS LOGS or DECLARE BREACH ASSUMED.",
    hint: "A good triage decision separates useful evidence from authoritative evidence.",
    instructorNotes: "Reward teams that explicitly distrust PACS outputs and require corroboration. Penalize teams that trust logs because they appear complete.",
    focusCards: ["Assume Breach", "Verify Explicitly", "Identity Trust"]
  },
  {
    id: "phase-2",
    title: "Phase 2: Define the Redline",
    phaseLabel: "Phase 2",
    objective: "Draft a manual verification protocol that gate guards can execute under stress.",
    narrative: "Manual checkpoints are now the primary compensating control. The risk shifts from automation failure to ambiguous human instructions, social engineering, and guard fatigue. A vague order to be careful will not hold the line.",
    prompt: "Write the manual verification SOP you would give to Security Forces at the gate. Include identity checks, escalation criteria, exception handling, and documentation requirements.",
    commandHint: "Try DEPLOY MANUAL CHECKPOINTS or WRITE VERIFICATION SOP.",
    hint: "Specificity matters: who checks what, against which source, and what happens on mismatch?",
    instructorNotes: "Strong protocols include two-person checks, out-of-band confirmation, exception logging, escalation, and fatigue rotation. Weak protocols rely on judgment alone.",
    focusCards: ["Manual Verification", "Least Privilege", "72-Hour Fatigue Limit"]
  },
  {
    id: "phase-3",
    title: "Phase 3: Operational Crunch",
    phaseLabel: "Phase 3",
    objective: "Balance security, throughput, and human capacity as manual operations degrade.",
    narrative: "Queue lengths increase, commanders request exceptions, and guards report cognitive load. Manual security is effective but not infinitely scalable. Every hour of surge operations changes the risk equation.",
    prompt: "Choose a fatigue-aware operating plan that preserves essential access while reducing unsafe throughput pressure.",
    commandHint: "Try ADVANCE CLOCK or STATUS.",
    hint: "Consider rotations, prioritized access lanes, reduced privileges, and commander-approved exceptions.",
    instructorNotes: "Teams should acknowledge the 72-hour wall and define mission-essential access rules. Watch for answers that maximize security while making operations impossible.",
    focusCards: ["72-Hour Fatigue Limit", "Mission Continuity", "Least Privilege"]
  },
  {
    id: "phase-4",
    title: "Phase 4: Threat Hunt and Recovery",
    phaseLabel: "Phase 4",
    objective: "Define evidence needed before restoring automated access decisions.",
    narrative: "The team has sample access records, device status reports, and credential inventories. Leadership wants automation restored, but convenience is not proof. Recovery must be phased and tied to verified trust.",
    prompt: "List the recovery evidence and phased authorization steps required before automated PACS decisions can resume.",
    commandHint: "Try ANALYZE CSV or AUTHORIZE RECOVERY.",
    hint: "Recovery criteria should address device integrity, credential validity, log provenance, and monitored rollback.",
    instructorNotes: "Strong answers require baselines and staged restoration. Penalize recovery authorization without evidence or validation.",
    focusCards: ["Recovery Criteria", "Device Trust", "Log Integrity"]
  },
  {
    id: "aar",
    title: "After Action Review",
    phaseLabel: "AAR",
    objective: "Review performance against Zero Trust operational discipline.",
    narrative: "The review summarizes how learner decisions affected trust authority, Security Forces fatigue, mission continuity, and recovery readiness.",
    prompt: "Use the AAR to guide classroom discussion or self-paced reflection.",
    commandHint: "Try STATUS or RESET.",
    hint: "Compare strong decisions against risky assumptions. The score is a discussion aid, not the whole learning outcome.",
    instructorNotes: "Use the debrief questions to connect the exercise to local OT dependencies and physical security policy.",
    focusCards: ["Assume Breach", "Recovery Criteria", "OT Boundary Constraints"],
    isAar: true
  },
  {
    id: "reference",
    title: "Reference Library",
    phaseLabel: "Reference",
    objective: "Review compact Zero Trust concepts used throughout the scenario.",
    narrative: "These cards summarize the operating principles that support disciplined decisions under OT trust failure.",
    prompt: "Select a module to continue the exercise, or use these cards while drafting a decision.",
    commandHint: "Try HELP for available commands.",
    hint: "Reference cards support reasoning; they are not a substitute for a clear operational decision.",
    instructorNotes: "This module is useful for pre-briefing, remediation, and self-paced learners.",
    focusCards: ["Assume Breach", "Verify Explicitly", "Manual Verification", "Recovery Criteria"],
    isReference: true
  }
];
