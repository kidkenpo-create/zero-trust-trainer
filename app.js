(function () {
  "use strict";

  var modules = window.ZTT_MODULES || [];
  var scenario = window.ZTT_SCENARIO || {};
  var state = clone(scenario.initialState);
  var moduleUiState = createModuleUiState();
  var activeModuleIndex = 0;

  var els = {};

  document.addEventListener("DOMContentLoaded", function () {
    bindElements();
    document.body.classList.add("scanlines");
    renderNavigation();
    renderModule();
    renderStatusBar();
    bindGlobalEvents();
  });

  function bindElements() {
    els.moduleList = document.getElementById("module-list");
    els.moduleContent = document.getElementById("module-content");
    els.statusBar = document.getElementById("status-bar-content");
    els.phaseIndicator = document.getElementById("phase-indicator");
    els.missionStatus = document.getElementById("mission-status");
    els.trustStatus = document.getElementById("trust-status");
    els.constraintsList = document.getElementById("constraints-list");
    els.hintButton = document.getElementById("hint-button");
    els.hintOutput = document.getElementById("hint-output");
    els.instructorToggle = document.getElementById("instructor-toggle");
    els.instructorNotes = document.getElementById("instructor-notes");
    els.qualityIndicators = document.getElementById("quality-indicators");
    els.trapList = document.getElementById("trap-list");
    els.referenceCards = document.getElementById("reference-cards");
    els.resetButton = document.getElementById("reset-button");
    els.scanlineToggle = document.getElementById("scanline-toggle");
  }

  function bindGlobalEvents() {
    els.resetButton.addEventListener("click", resetSimulation);
    els.scanlineToggle.addEventListener("click", function () {
      var enabled = document.body.classList.toggle("scanlines");
      els.scanlineToggle.textContent = enabled ? "Scanlines On" : "Scanlines Off";
      els.scanlineToggle.setAttribute("aria-pressed", String(enabled));
    });

    els.hintButton.addEventListener("click", function () {
      var module = modules[activeModuleIndex];
      els.hintOutput.textContent = module.hint;
    });

    els.instructorToggle.addEventListener("click", function () {
      var expanded = els.instructorToggle.getAttribute("aria-expanded") === "true";
      els.instructorToggle.setAttribute("aria-expanded", String(!expanded));
      els.instructorNotes.hidden = expanded;
    });

    document.addEventListener("keydown", function (event) {
      if (event.altKey) {
        var number = Number(event.key);
        if (number >= 1 && number <= modules.length) {
          event.preventDefault();
          setActiveModule(number - 1);
        }
      }

      if (event.ctrlKey && event.key === "Enter") {
        var submit = document.getElementById("submit-decision");
        if (submit) {
          event.preventDefault();
          submit.click();
        }
      }
    });
  }

  function renderNavigation() {
    els.moduleList.innerHTML = "";
    modules.forEach(function (module, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "module-button";
      button.setAttribute("aria-current", index === activeModuleIndex ? "page" : "false");
      button.innerHTML = '<span class="module-index">' + (index + 1) + '</span><span>' + escapeHtml(module.title) + "</span>";
      button.addEventListener("click", function () {
        setActiveModule(index);
      });
      els.moduleList.appendChild(button);
    });
  }

  function setActiveModule(index) {
    persistActiveModuleUiState();
    activeModuleIndex = index;
    state.currentPhase = index;
    renderNavigation();
    renderModule();
    renderStatusBar();
  }

  function renderModule() {
    var module = modules[activeModuleIndex];
    els.phaseIndicator.textContent = module.phaseLabel;
    els.hintOutput.textContent = "Hints are contextual and will not reveal a complete answer.";
    els.instructorNotes.textContent = module.instructorNotes;
    els.instructorNotes.hidden = true;
    els.instructorToggle.setAttribute("aria-expanded", "false");

    if (module.isAar) {
      renderAfterActionReview();
    } else if (module.isReference) {
      renderReferenceLibrary();
    } else {
      renderLesson(module);
    }

    renderRightPanel(module);
  }

  function renderLesson(module) {
    var savedUi = moduleUiState[activeModuleIndex];
    els.moduleContent.innerHTML = [
      '<div class="lesson-body">',
      renderModuleHeader(module),
      '<div class="lesson-grid">',
      '<section class="subpanel"><div class="subpanel-header">SCENARIO PROMPT</div><div class="subpanel-body">',
      '<p>' + escapeHtml(module.prompt) + "</p>",
      '<div class="decision-workspace">',
      '<label for="learner-response" class="label">Learner Response</label>',
      '<textarea id="learner-response" class="response-input" placeholder="Type your Zero Trust decision, SOP, or recovery criteria here...">' + escapeHtml(savedUi.responseDraft) + "</textarea>",
      '<button type="button" id="submit-decision" class="button">Submit Decision</button>',
      "</div></div></section>",
      '<section class="subpanel"><div class="subpanel-header">PHASE TRACKER</div><div class="subpanel-body">',
      renderProgressTracker(),
      renderMetricGrid(),
      "</div></section>",
      "</div>",
      renderConsole(module),
      "</div>"
    ].join("");

    document.getElementById("learner-response").addEventListener("input", function (event) {
      moduleUiState[activeModuleIndex].responseDraft = event.target.value;
    });

    document.getElementById("submit-decision").addEventListener("click", function () {
      var input = document.getElementById("learner-response");
      var text = input.value.trim();
      if (!text) {
        renderFeedback({
          title: "NO DECISION ENTERED",
          assessment: "The console requires an explicit action, assumption, or protocol.",
          teachingPoint: "Zero Trust depends on observable decisions, not implied intent.",
          nextConsideration: "State what you trust, what you do not trust, and what evidence changes that posture.",
          deltas: {}
        });
        return;
      }

      var result = evaluateDecision(text);
      input.value = "";
      moduleUiState[activeModuleIndex].responseDraft = "";
      renderFeedback(result);
      renderStatusBar();
      renderRightPanel(module);
      renderNavigation();
    });

    bindTerminal();
  }

  function renderModuleHeader(module) {
    return [
      '<header class="module-header">',
      '<div class="module-title-row"><h2>' + escapeHtml(module.title) + '</h2><span class="status-badge ' + getModeClass() + '">' + getSystemMode() + "</span></div>",
      '<p>' + escapeHtml(module.narrative) + "</p>",
      '<div class="objective"><span class="label">Learning Objective</span>' + escapeHtml(module.objective) + "</div>",
      "</header>"
    ].join("");
  }

  function renderConsole(module) {
    var savedUi = moduleUiState[activeModuleIndex];
    return [
      '<section class="subpanel">',
      '<div class="subpanel-header">COMMAND TERMINAL</div>',
      '<div class="subpanel-body">',
      '<p class="label">' + escapeHtml(module.commandHint) + "</p>",
      '<div class="terminal-row">',
      '<input id="terminal-input" class="terminal-input" autocomplete="off" aria-label="Terminal command" placeholder="ENTER COMMAND" value="' + escapeHtml(savedUi.terminalDraft) + '">',
      '<button type="button" id="run-command" class="button secondary">Run</button>',
      "</div>",
      '<div id="terminal-output" class="terminal-output" aria-live="polite">' + escapeHtml(savedUi.terminalOutput) + "</div>",
      '<div id="feedback-output" class="feedback-output" aria-live="polite">' + savedUi.feedbackHtml + "</div>",
      "</div>",
      "</section>"
    ].join("");
  }

  function bindTerminal() {
    var input = document.getElementById("terminal-input");
    var run = document.getElementById("run-command");

    input.addEventListener("input", function (event) {
      moduleUiState[activeModuleIndex].terminalDraft = event.target.value;
    });

    function execute() {
      var command = input.value.trim().toUpperCase();
      if (!command) {
        return;
      }
      var output = handleCommand(command);
      var terminalText = "> " + command + "\n" + output;
      document.getElementById("terminal-output").textContent = terminalText;
      moduleUiState[activeModuleIndex].terminalOutput = terminalText;
      input.value = "";
      moduleUiState[activeModuleIndex].terminalDraft = "";
      renderStatusBar();
      renderRightPanel(modules[activeModuleIndex]);
    }

    run.addEventListener("click", execute);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        execute();
      }
    });
  }

  function evaluateDecision(text) {
    var lower = text.toLowerCase();
    var positives = countMatches(lower, scenario.positiveSignals);
    var negatives = countMatches(lower, scenario.negativeSignals);
    var deltas = {
      trustAuthorityScore: clamp((positives * 4) - (negatives * 7), -18, 18),
      securityForcesFatigue: clamp(hasAny(lower, ["manual", "checkpoint", "guard"]) ? 7 : 2, 0, 10),
      missionContinuityImpact: clamp(hasAny(lower, ["mission continuity", "throughput", "rotation", "priority", "essential"]) ? -5 : 3, -8, 8),
      elapsedHours: 4
    };

    if (hasAny(lower, ["assume breach", "breach assumed", "untrusted"])) {
      state.flags.assumedBreach = true;
      deltas.trustAuthorityScore += 5;
    }
    if (hasAny(lower, ["manual verification", "checkpoint", "guard", "sop", "two-person", "escalation"])) {
      state.flags.manualVerificationDefined = true;
      deltas.trustAuthorityScore += 5;
    }
    if (hasAny(lower, ["evidence", "baseline", "integrity", "credential", "validated", "reconstitution"])) {
      state.flags.evidenceBaselineEstablished = true;
      deltas.trustAuthorityScore += 5;
    }
    if (hasAny(lower, ["immediate patch", "hotfix", "trust logs", "restore automation", "skip validation", "declare recovered"])) {
      state.flags.attemptedUnsafePatch = true;
      deltas.missionContinuityImpact += 7;
    }
    if (activeModuleIndex >= 4 && hasAny(lower, ["authorize recovery", "phased recovery", "restore automation"]) && state.flags.evidenceBaselineEstablished) {
      state.flags.recoveryAuthorized = true;
    }

    var risky = negatives > 0 || deltas.trustAuthorityScore < 0;
    var strong = positives >= 2 && !risky;
    var result = {
      title: strong ? "STRONG ZERO TRUST DECISION" : risky ? "RISKY ASSUMPTION DETECTED" : "PARTIAL DECISION ACCEPTED",
      assessment: buildAssessment(positives, negatives),
      teachingPoint: buildTeachingPoint(lower, risky),
      nextConsideration: buildNextConsideration(),
      deltas: deltas,
      text: text,
      risky: risky,
      strong: strong
    };

    updateState(deltas, result);
    return result;
  }

  function updateState(deltas, result) {
    state.trustAuthorityScore = clamp(state.trustAuthorityScore + deltas.trustAuthorityScore, 0, 100);
    state.securityForcesFatigue = clamp(state.securityForcesFatigue + deltas.securityForcesFatigue, 0, 100);
    state.missionContinuityImpact = clamp(state.missionContinuityImpact + deltas.missionContinuityImpact, 0, 100);
    state.elapsedHours = clamp(state.elapsedHours + deltas.elapsedHours, 0, 96);
    state.decisions.push({
      module: modules[activeModuleIndex].title,
      text: result.text,
      risky: result.risky,
      strong: result.strong,
      timestamp: "H+" + state.elapsedHours
    });
  }

  function handleCommand(command) {
    if (command === "RESET") {
      resetSimulation();
      return "SIMULATION RESET. STATE RESTORED TO INITIAL CONDITIONS.";
    }

    if (command === "STATUS") {
      return [
        "TACTICAL INSTALLATION TRUST DESK: " + getSystemMode(),
        "TRUST AUTHORITY SCORE: " + state.trustAuthorityScore,
        "SECURITY FORCES FATIGUE: " + state.securityForcesFatigue + "%",
        "MISSION CONTINUITY IMPACT: " + state.missionContinuityImpact + "%",
        "ELAPSED HOURS: H+" + state.elapsedHours,
        "FLAGS: " + Object.keys(state.flags).filter(function (key) { return state.flags[key]; }).join(", ")
      ].join("\n");
    }

    if (command === "DECLARE BREACH ASSUMED") {
      state.flags.assumedBreach = true;
      state.trustAuthorityScore = clamp(state.trustAuthorityScore + 8, 0, 100);
      state.elapsedHours += 1;
      return "BREACH POSTURE RECORDED.\nPACS, badge assertions, and access logs marked non-authoritative pending independent validation.";
    }

    if (command === "DEPLOY MANUAL CHECKPOINTS") {
      state.flags.manualVerificationDefined = true;
      state.trustAuthorityScore = clamp(state.trustAuthorityScore + 6, 0, 100);
      state.securityForcesFatigue = clamp(state.securityForcesFatigue + 8, 0, 100);
      state.missionContinuityImpact = clamp(state.missionContinuityImpact + 3, 0, 100);
      state.elapsedHours += 2;
      return "MANUAL CHECKPOINTS DEPLOYED.\nWarning: control effectiveness depends on SOP precision, escalation rules, and fatigue rotation.";
    }

    if (command === "WRITE VERIFICATION SOP") {
      state.flags.manualVerificationDefined = true;
      state.trustAuthorityScore = clamp(state.trustAuthorityScore + 9, 0, 100);
      state.elapsedHours += 2;
      return "SOP DRAFT SLOT OPENED.\nRequired fields: ID corroboration, mission need, exception handling, two-person escalation, mismatch logging.";
    }

    if (command === "ADVANCE CLOCK") {
      state.elapsedHours = clamp(state.elapsedHours + 12, 0, 96);
      state.securityForcesFatigue = clamp(state.securityForcesFatigue + 14, 0, 100);
      state.missionContinuityImpact = clamp(state.missionContinuityImpact + 6, 0, 100);
      return "CLOCK ADVANCED 12 HOURS.\nManual surge strain increased. Reassess rotations and access prioritization.";
    }

    if (command === "AUTHORIZE RECOVERY") {
      if (!state.flags.evidenceBaselineEstablished) {
        state.flags.attemptedUnsafePatch = true;
        state.trustAuthorityScore = clamp(state.trustAuthorityScore - 14, 0, 100);
        return "RECOVERY DENIED: EVIDENCE BASELINE MISSING.\nTraining note: automated access cannot resume until device integrity, credential validity, and log provenance are verified.";
      }
      state.flags.recoveryAuthorized = true;
      state.trustAuthorityScore = clamp(state.trustAuthorityScore + 8, 0, 100);
      state.missionContinuityImpact = clamp(state.missionContinuityImpact - 8, 0, 100);
      return "PHASED RECOVERY AUTHORIZED.\nCondition: monitored restoration with rollback criteria and continued manual oversight.";
    }

    return scenario.commandResponses[command] || "UNKNOWN COMMAND. TYPE HELP FOR SUPPORTED COMMANDS.";
  }

  function renderFeedback(result) {
    var output = document.getElementById("feedback-output");
    var deltas = result.deltas || {};
    var html = [
      '<div class="feedback-card">',
      "<strong>" + escapeHtml(result.title) + "</strong>",
      '<div class="score-line">' + renderDelta("Trust", deltas.trustAuthorityScore || 0) + renderDelta("Fatigue", deltas.securityForcesFatigue || 0) + renderDelta("Continuity", deltas.missionContinuityImpact || 0) + renderDelta("Hours", deltas.elapsedHours || 0) + "</div>",
      "<span>Assessment: " + escapeHtml(result.assessment) + "</span>",
      "<span>Teaching point: " + escapeHtml(result.teachingPoint) + "</span>",
      "<span>Next consideration: " + escapeHtml(result.nextConsideration) + "</span>",
      "</div>"
    ].join("");
    moduleUiState[activeModuleIndex].feedbackHtml = html + moduleUiState[activeModuleIndex].feedbackHtml;
    output.innerHTML = moduleUiState[activeModuleIndex].feedbackHtml;
  }

  function renderDelta(label, value) {
    var className = value <= 0 && label !== "Hours" ? "positive" : "negative";
    var sign = value > 0 ? "+" : "";
    return '<span class="delta ' + className + '">' + label + " " + sign + value + "</span>";
  }

  function renderAfterActionReview() {
    var risky = state.decisions.filter(function (decision) { return decision.risky; }).length;
    var strong = state.decisions.filter(function (decision) { return decision.strong; }).length;
    var strengths = [];
    var improvements = [];

    if (state.flags.assumedBreach) strengths.push("Recognized the PACS trust boundary failure.");
    if (state.flags.manualVerificationDefined) strengths.push("Established manual verification as a compensating control.");
    if (state.flags.evidenceBaselineEstablished) strengths.push("Connected recovery to evidence and baseline validation.");
    if (!strengths.length) strengths.push("Engaged the scenario and generated decision history for review.");

    if (state.flags.attemptedUnsafePatch) improvements.push("Avoid IT-centric patch or restore instincts before OT validation.");
    if (state.securityForcesFatigue > 70) improvements.push("Manage Security Forces fatigue before manual controls become brittle.");
    if (!state.flags.evidenceBaselineEstablished) improvements.push("Define recovery criteria with device, identity, and log integrity evidence.");
    if (!improvements.length) improvements.push("Continue refining exception handling and commander communication.");

    els.moduleContent.innerHTML = [
      '<div class="lesson-body">',
      renderModuleHeader(modules[activeModuleIndex]),
      '<section class="aar-grid">',
      aarCard("Final Trust Authority Score", state.trustAuthorityScore),
      aarCard("Final Security Forces Fatigue", state.securityForcesFatigue + "%"),
      aarCard("Final Mission Continuity Impact", state.missionContinuityImpact + "%"),
      aarCard("Elapsed Time", "H+" + state.elapsedHours),
      aarCard("Risky Decisions", risky),
      aarCard("Strong Zero Trust Decisions", strong),
      "</section>",
      '<section class="lesson-grid">',
      '<div class="subpanel"><div class="subpanel-header">LEARNER STRENGTHS</div><div class="subpanel-body"><ul>' + strengths.map(item).join("") + "</ul></div></div>",
      '<div class="subpanel"><div class="subpanel-header">IMPROVEMENT AREAS</div><div class="subpanel-body"><ul>' + improvements.map(item).join("") + "</ul></div></div>",
      "</section>",
      '<section class="subpanel"><div class="subpanel-header">INSTRUCTOR DEBRIEF QUESTIONS</div><div class="subpanel-body"><ul>',
      item("Which system outputs did your team initially want to trust, and why?"),
      item("Where did manual verification become a security risk instead of a solution?"),
      item("What exact evidence would justify restoring automated PACS decisions?"),
      item("How would your plan change at hour 60 of the surge operation?"),
      "</ul></div></section>",
      '<section class="subpanel"><div class="subpanel-header">DECISION HISTORY</div><div class="subpanel-body">' + renderHistory() + "</div></section>",
      "</div>"
    ].join("");
  }

  function renderReferenceLibrary() {
    els.moduleContent.innerHTML = [
      '<div class="lesson-body">',
      renderModuleHeader(modules[activeModuleIndex]),
      '<section class="reference-library-grid">',
      scenario.referenceCards.map(function (card) {
        return '<article class="reference-card"><h3>' + escapeHtml(card.title) + "</h3><p>" + escapeHtml(card.body) + "</p></article>";
      }).join(""),
      "</section>",
      "</div>"
    ].join("");
  }

  function renderRightPanel(module) {
    els.trustStatus.innerHTML = scenario.trustVectors.map(function (vector) {
      return '<div class="trust-row"><div></div><div><strong>' + escapeHtml(vector.label) + ": " + escapeHtml(vector.status) + "</strong><span>" + escapeHtml(vector.detail) + "</span></div></div>";
    }).join("");

    els.constraintsList.innerHTML = scenario.constraints.map(item).join("");

    var focusCards = scenario.referenceCards.filter(function (card) {
      return module.focusCards.indexOf(card.title) !== -1;
    });
    els.referenceCards.innerHTML = focusCards.map(function (card) {
      return '<article class="reference-card"><h3>' + escapeHtml(card.title) + "</h3><p>" + escapeHtml(card.body) + "</p></article>";
    }).join("");

    els.qualityIndicators.innerHTML = [
      quality("Evidence Discipline", evidenceQuality()),
      quality("Fatigue Management", 100 - state.securityForcesFatigue),
      quality("Recovery Readiness", recoveryQuality())
    ].join("");

    els.trapList.innerHTML = scenario.traps.map(item).join("");
  }

  function renderStatusBar() {
    var mode = getSystemMode();
    els.missionStatus.textContent = mode;
    els.missionStatus.className = "status-badge " + getModeClass();
    els.statusBar.innerHTML = [
      chip("TRUST", state.trustAuthorityScore, ""),
      chip("SF FATIGUE", state.securityForcesFatigue + "%", state.securityForcesFatigue > 65 ? "alert" : "warning"),
      chip("IMPACT", state.missionContinuityImpact + "%", state.missionContinuityImpact > 70 ? "alert" : ""),
      chip("TIME", "H+" + state.elapsedHours, state.elapsedHours >= 60 ? "alert" : ""),
      chip("PHASE", modules[activeModuleIndex].phaseLabel, ""),
      chip("MODE", mode, getModeClass() === "recovery" ? "alert" : "")
    ].join("");
  }

  function resetSimulation() {
    state = clone(scenario.initialState);
    moduleUiState = createModuleUiState();
    activeModuleIndex = 0;
    renderNavigation();
    renderModule();
    renderStatusBar();
  }

  function renderMetricGrid() {
    return '<div class="metric-grid">' + [
      metric("Trust Authority", state.trustAuthorityScore),
      metric("SF Fatigue", state.securityForcesFatigue + "%"),
      metric("Continuity Impact", state.missionContinuityImpact + "%"),
      metric("Elapsed", "H+" + state.elapsedHours)
    ].join("") + "</div>";
  }

  function renderProgressTracker() {
    return '<div class="progress-track" aria-label="Phase progress">' + modules.map(function (_module, index) {
      var className = index === activeModuleIndex ? "active" : index < activeModuleIndex ? "done" : "";
      return '<span class="progress-step ' + className + '"></span>';
    }).join("") + "</div>";
  }

  function renderHistory() {
    if (!state.decisions.length) {
      return "<p>No decisions submitted yet.</p>";
    }
    return '<ol class="history-list">' + state.decisions.map(function (decision) {
      return "<li><strong>" + escapeHtml(decision.timestamp) + " / " + escapeHtml(decision.module) + ":</strong> " + escapeHtml(decision.text) + "</li>";
    }).join("") + "</ol>";
  }

  function buildAssessment(positives, negatives) {
    if (negatives > 0) {
      return "The action contains assumptions that could restore trust before evidence supports it.";
    }
    if (positives >= 3) {
      return "The action aligns with multiple Zero Trust behaviors and improves operational discipline.";
    }
    return "The action has useful intent but needs more explicit evidence, authority, or operating detail.";
  }

  function buildTeachingPoint(lower, risky) {
    if (risky) {
      return "Under PACS compromise, speed can become risk when it bypasses validation.";
    }
    if (lower.indexOf("fatigue") >= 0 || lower.indexOf("72") >= 0) {
      return "Human capacity is part of the security architecture during manual fallback.";
    }
    if (lower.indexOf("evidence") >= 0 || lower.indexOf("baseline") >= 0) {
      return "Recovery becomes credible when evidence defines the path back to trust.";
    }
    return "Zero Trust requires explicit verification paths for identity, device, and operational need.";
  }

  function buildNextConsideration() {
    if (!state.flags.assumedBreach) return "Declare what is untrusted and how the team will operate under assumed breach.";
    if (!state.flags.manualVerificationDefined) return "Define guard-executable manual verification steps and escalation criteria.";
    if (state.securityForcesFatigue > 60) return "Reduce fatigue risk with rotations, prioritized access, and commander-approved exceptions.";
    if (!state.flags.evidenceBaselineEstablished) return "Identify the evidence baseline required before any automated restoration.";
    return "Plan phased recovery with monitoring, rollback criteria, and continued manual oversight.";
  }

  function getSystemMode() {
    if (state.flags.recoveryAuthorized) return "RECOVERY";
    if (state.trustAuthorityScore < 55 || state.securityForcesFatigue > 60) return "DEGRADED";
    return "TRAINING";
  }

  function getModeClass() {
    var mode = getSystemMode();
    return mode === "RECOVERY" ? "recovery" : mode === "DEGRADED" ? "degraded" : "";
  }

  function evidenceQuality() {
    var score = 25;
    if (state.flags.assumedBreach) score += 20;
    if (state.flags.manualVerificationDefined) score += 20;
    if (state.flags.evidenceBaselineEstablished) score += 30;
    if (state.flags.attemptedUnsafePatch) score -= 20;
    return clamp(score, 0, 100);
  }

  function recoveryQuality() {
    var score = state.flags.evidenceBaselineEstablished ? 70 : 25;
    if (state.flags.recoveryAuthorized) score += 20;
    if (state.flags.attemptedUnsafePatch) score -= 30;
    return clamp(score, 0, 100);
  }

  function quality(label, value) {
    return '<div class="quality-indicator"><strong>' + label + '</strong><span>' + value + '%</span><div class="quality-bar"><span style="width:' + value + '%"></span></div></div>';
  }

  function chip(label, value, className) {
    return '<span class="metric-chip ' + className + '">' + escapeHtml(label) + ": " + escapeHtml(String(value)) + "</span>";
  }

  function metric(label, value) {
    return '<div class="metric-card"><span class="label">' + escapeHtml(label) + '</span><span class="metric-value">' + escapeHtml(String(value)) + "</span></div>";
  }

  function aarCard(label, value) {
    return '<article class="aar-card"><span class="label">' + escapeHtml(label) + '</span><span class="metric-value">' + escapeHtml(String(value)) + "</span></article>";
  }

  function item(text) {
    return "<li>" + escapeHtml(text) + "</li>";
  }

  function countMatches(text, terms) {
    return terms.reduce(function (count, term) {
      return count + (text.indexOf(term) >= 0 ? 1 : 0);
    }, 0);
  }

  function hasAny(text, terms) {
    return terms.some(function (term) {
      return text.indexOf(term) >= 0;
    });
  }

  function createModuleUiState() {
    return modules.map(function () {
      return {
        responseDraft: "",
        terminalDraft: "",
        terminalOutput: "SYSTEM READY. TYPE HELP FOR AVAILABLE COMMANDS.",
        feedbackHtml: "Decision feedback will appear here after submission."
      };
    });
  }

  function persistActiveModuleUiState() {
    var savedUi = moduleUiState[activeModuleIndex];
    var response = document.getElementById("learner-response");
    var terminalInput = document.getElementById("terminal-input");
    var terminalOutput = document.getElementById("terminal-output");
    var feedbackOutput = document.getElementById("feedback-output");

    if (!savedUi) {
      return;
    }
    if (response) {
      savedUi.responseDraft = response.value;
    }
    if (terminalInput) {
      savedUi.terminalDraft = terminalInput.value;
    }
    if (terminalOutput) {
      savedUi.terminalOutput = terminalOutput.textContent;
    }
    if (feedbackOutput) {
      savedUi.feedbackHtml = feedbackOutput.innerHTML;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
