(function () {
  "use strict";

  var modules = window.ZTT_MODULES || [];
  var scenario = window.ZTT_SCENARIO || {};
  var state = clone(scenario.initialState);
  var moduleUiState = createModuleUiState();
  var activeModuleIndex = 0;
  var activeGuideTrigger = null;

  var els = {};

  document.addEventListener("DOMContentLoaded", function () {
    bindElements();
    renderNavigation();
    renderModule();
    renderStatusBar();
    bindGlobalEvents();
  });

  function bindElements() {
    els.moduleList = document.getElementById("module-list");
    els.moduleContent = document.getElementById("module-content");
    els.statusBar = document.getElementById("status-bar-content");
    els.systemStrip = document.getElementById("system-strip-content");
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
    els.appShell = document.getElementById("app");
    els.referencePanel = document.getElementById("reference-panel");
    els.referenceToggle = document.getElementById("reference-toggle");
    els.aiStatus = document.getElementById("ai-status");
    els.operatorBriefing = document.getElementById("operator-briefing");
    els.workstationFrame = document.getElementById("workstation-frame");
    els.enterConsole = document.getElementById("enter-console");
  }

  function bindGlobalEvents() {
    els.resetButton.addEventListener("click", resetSimulation);
    els.referenceToggle.addEventListener("click", toggleReferencePanel);
    els.enterConsole.addEventListener("click", enterMissionConsole);

    document.addEventListener("click", function (event) {
      var actionButton = event.target.closest("[data-learner-action]");
      if (!actionButton) {
        return;
      }

      var action = actionButton.getAttribute("data-learner-action");
      if (action === "revise") {
        if (moduleUiState[activeModuleIndex]) {
          moduleUiState[activeModuleIndex].hasSubmitted = false;
          moduleUiState[activeModuleIndex].hasInvestigated = true;
        }
        updateCurrentTask();
        renderNavigation();
        var input = document.getElementById("terminal-input");
        if (input) {
          input.focus();
        }
      }
      if (action === "advance") {
        var nextIndex = Number(actionButton.getAttribute("data-next-index"));
        if (!Number.isNaN(nextIndex) && modules[nextIndex] && canAccessModule(nextIndex)) {
          setActiveModule(nextIndex);
        }
      }
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
      if (event.key === "Escape") {
        closeGuidePanel();
      }

      if (event.altKey) {
        var number = Number(event.key);
        if (number >= 1 && number <= modules.length) {
          event.preventDefault();
          setActiveModule(number - 1);
        }
      }

      if (event.ctrlKey && event.key === "Enter") {
        var run = document.getElementById("run-command");
        if (run) {
          event.preventDefault();
          run.click();
        }
      }
    });

    checkAiStatus();
  }

  function enterMissionConsole() {
    els.operatorBriefing.hidden = true;
    els.workstationFrame.hidden = false;
    var main = document.getElementById("main-content");
    if (main) {
      main.focus();
    }
  }

  function toggleReferencePanel() {
    var collapsed = els.appShell.classList.toggle("reference-collapsed");
    els.referencePanel.hidden = collapsed;
    els.referencePanel.classList.toggle("reference-panel-hidden", collapsed);
    els.referenceToggle.setAttribute("aria-expanded", String(!collapsed));
    els.referenceToggle.textContent = collapsed ? "Show Reference" : "Hide Reference";
  }

  async function checkAiStatus() {
    if (!els.aiStatus) {
      return;
    }

    if (window.location.protocol === "file:") {
      setAiStatus("LOCAL RUBRIC ACTIVE", "offline");
      return;
    }

    var controller = new AbortController();
    var timeout = window.setTimeout(function () {
      controller.abort();
    }, 5000);

    try {
      var response = await fetch("/api/status", { signal: controller.signal });
      if (!response.ok) {
        throw new Error("AI status unavailable.");
      }
      var status = await response.json();
      if (status.configured) {
        setAiStatus("AI CONNECTED: " + status.model, "connected");
      } else {
        setAiStatus("LOCAL RUBRIC ACTIVE", "offline");
      }
    } catch (_error) {
      setAiStatus("LOCAL RUBRIC ACTIVE", "offline");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function setAiStatus(label, stateClass) {
    els.aiStatus.textContent = label;
    els.aiStatus.className = "ai-status " + stateClass;
  }

  function renderNavigation() {
    els.moduleList.innerHTML = "";
    modules.forEach(function (module, index) {
      var button = document.createElement("button");
      button.type = "button";
      var locked = isModuleLocked(index);
      button.className = "module-button" + (isRecommendedNext(index) ? " recommended-next" : "") + (locked ? " locked" : "");
      button.disabled = locked;
      if (locked) {
        button.setAttribute("aria-disabled", "true");
        button.setAttribute("title", "Submit a non-risky response in the current phase to unlock this module.");
      }
      button.setAttribute("aria-current", index === activeModuleIndex ? "page" : "false");
      button.innerHTML = [
        '<span class="module-select-marker" aria-hidden="true"></span>',
        '<span class="module-index">' + (index + 1) + "</span>",
        '<span class="module-file"><span class="module-file-name">' + escapeHtml(module.title) + '</span><span class="module-file-path">/MISSION/REC-' + pad2(index + 1) + "</span></span>",
        '<span class="module-code">' + getNavigationCode(module, index, locked) + "</span>"
      ].join("");
      button.addEventListener("click", function () {
        if (!locked) {
          setActiveModule(index);
        }
      });
      els.moduleList.appendChild(button);
    });
  }

  function setActiveModule(index) {
    if (index !== activeModuleIndex && !canAccessModule(index)) {
      return;
    }
    persistActiveModuleUiState();
    activeModuleIndex = index;
    state.currentPhase = index;
    renderNavigation();
    renderModule();
    renderStatusBar();
  }

  function renderModule() {
    var module = modules[activeModuleIndex];
    closeGuidePanel();

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
    bindGuideEvents(module);
  }

  function renderLesson(module) {
    var savedUi = moduleUiState[activeModuleIndex];
    els.moduleContent.innerHTML = [
      '<div class="lesson-body">',
      renderModuleHeader(module),
      renderCurrentTask(module),
      renderStarterPanel(module),
      '<div class="lesson-grid">',
      '<section class="subpanel"><div class="subpanel-header"><span>SCENARIO PROMPT</span>' + renderGuideButton(module, "prompt") + '</div><div class="subpanel-body">',
      '<p>' + escapeHtml(module.prompt) + "</p>",
      '<p class="terminal-submit-note">Use the Command Terminal to investigate first, then type your decision, SOP, or recovery criteria for grading.</p>',
      "</div></section>",
      '<section class="subpanel"><div class="subpanel-header"><span>MISSION PROGRESS</span>' + renderGuideButton(module, "tracker") + '</div><div class="subpanel-body">',
      renderProgressTracker(),
      renderMetricGrid(),
      "</div></section>",
      "</div>",
      renderConsole(module),
      "</div>"
    ].join("");

    bindTerminal();
  }

  function renderModuleHeader(module) {
    return [
      '<header class="module-header">',
      '<div class="module-title-row"><h2>' + escapeHtml(module.title) + '</h2><span class="status-badge ' + getModeClass() + '">' + getSystemMode() + "</span></div>",
      renderDisclosure("Mission Assistance", '<div class="guided-copy-row"><p>' + escapeHtml(module.narrative) + "</p>" + renderGuideButton(module, "narrative") + "</div>", true),
      renderDisclosure("Learning Objective", '<div class="field-label-row"><span class="label">Learning Objective</span>' + renderGuideButton(module, "objective") + '</div><p>' + escapeHtml(module.objective) + "</p>", true, "objective"),
      "</header>"
    ].join("");
  }

  function renderConsole(module) {
    var savedUi = moduleUiState[activeModuleIndex];
    return [
      '<section class="subpanel command-terminal-panel">',
      '<div class="subpanel-header"><span>COMMAND TERMINAL</span>' + renderGuideButton(module, "terminal") + "</div>",
      '<div class="subpanel-body">',
      renderTerminalModes(module),
      '<div class="terminal-row">',
      '<span class="terminal-prompt" aria-hidden="true">ZT-DESK:\\MISSION&gt;</span>',
      '<input id="terminal-input" class="terminal-input" autocomplete="off" aria-label="Terminal command or learner response" placeholder="TYPE COMMAND OR RESPONSE" value="' + escapeHtml(savedUi.terminalDraft) + '">',
      '<button type="button" id="run-command" class="button secondary">Send</button>',
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
    var commandChips = document.querySelectorAll("[data-command-chip]");

    input.addEventListener("input", function (event) {
      moduleUiState[activeModuleIndex].terminalDraft = event.target.value;
    });

    async function execute() {
      var rawInput = input.value.trim();
      var command = rawInput.toUpperCase();
      if (!rawInput) {
        return;
      }

      if (isSupportedCommand(command) || isCommandAttempt(command)) {
        var output = handleCommand(command);
        var terminalText = "ZT-DESK:\\MISSION> " + command + "\n" + output;
        document.getElementById("terminal-output").textContent = terminalText;
        moduleUiState[activeModuleIndex].terminalOutput = terminalText;
        moduleUiState[activeModuleIndex].hasInvestigated = true;
        input.value = "";
        moduleUiState[activeModuleIndex].terminalDraft = "";
        updateCurrentTask();
        renderStatusBar();
        renderRightPanel(modules[activeModuleIndex]);
        bindGuideEvents(modules[activeModuleIndex]);
        return;
      }

      await submitTerminalResponse(rawInput, input, run);
    }

    run.addEventListener("click", execute);
    commandChips.forEach(function (button) {
      button.addEventListener("click", function () {
        input.value = button.getAttribute("data-command-chip");
        moduleUiState[activeModuleIndex].terminalDraft = input.value;
        execute();
      });
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        execute();
      }
    });
  }

  async function submitTerminalResponse(text, input, run) {
    var module = modules[activeModuleIndex];
    var output = document.getElementById("terminal-output");

    run.disabled = true;
    run.textContent = "Evaluating...";
    output.textContent = "ZT-DESK:\\MISSION> " + text + "\nROUTING RESPONSE TO RUBRIC ENGINE...";
    input.value = "";
    moduleUiState[activeModuleIndex].terminalDraft = "";

    try {
      var result = await gradeDecision(text, module);
      var terminalText = [
        "ZT-DESK:\\MISSION> " + text,
        (result.source || "LOCAL RUBRIC") + " COMPLETE.",
        "REVIEW FEEDBACK BELOW. TYPE STATUS FOR UPDATED METRICS."
      ].join("\n");
      output.textContent = terminalText;
      moduleUiState[activeModuleIndex].terminalOutput = terminalText;
      moduleUiState[activeModuleIndex].hasSubmitted = true;
      moduleUiState[activeModuleIndex].lastRisky = Boolean(result.risky);
      moduleUiState[activeModuleIndex].passed = !result.risky;
      renderFeedback(result);
      updateCurrentTask();
      renderStatusBar();
      renderRightPanel(module);
      bindGuideEvents(module);
      renderNavigation();
    } finally {
      run.disabled = false;
      run.textContent = "Send";
      input.focus();
    }
  }

  function renderCurrentTask(module) {
    var task = getCurrentTask(module);
    return [
      '<section id="current-task" class="current-task" aria-live="polite">',
      '<div><span class="label">Current Task</span><strong id="current-task-step">' + escapeHtml(task.step) + "</strong></div>",
      '<p id="current-task-copy">' + escapeHtml(task.copy) + "</p>",
      '<span id="current-task-code" class="task-code">' + escapeHtml(task.code) + "</span>",
      "</section>"
    ].join("");
  }

  function updateCurrentTask() {
    var taskPanel = document.getElementById("current-task");
    if (!taskPanel) {
      return;
    }
    var task = getCurrentTask(modules[activeModuleIndex]);
    document.getElementById("current-task-step").textContent = task.step;
    document.getElementById("current-task-copy").textContent = task.copy;
    document.getElementById("current-task-code").textContent = task.code;
  }

  function getCurrentTask(module) {
    var savedUi = moduleUiState[activeModuleIndex] || {};
    if (savedUi.hasSubmitted) {
      if (savedUi.lastRisky) {
        return {
          step: "Revise",
          copy: "Review the rubric and revise the response before moving forward.",
          code: "LOCKED"
        };
      }
      return {
        step: "Advance",
        copy: "Review the rubric, revise if needed, or continue to the next mission phase.",
        code: "READY"
      };
    }
    if (savedUi.hasInvestigated) {
      return {
        step: "Submit Decision",
        copy: "Type a plain-language response in the terminal. State what is untrusted, what keeps operating, and what evidence or control comes next.",
        code: "SUBMIT"
      };
    }
    return {
      step: "Investigate",
      copy: "Read the scenario, run one suggested command, then submit your operational response through the terminal.",
      code: module.phaseLabel || "TASK"
    };
  }

  function renderTerminalModes(module) {
    return [
      '<div class="terminal-mode-grid">',
      '<div class="terminal-mode-card"><span class="label">Investigate</span><p>Run a command to gather scenario telemetry.</p>' + renderCommandChips(module) + "</div>",
      '<div class="terminal-mode-card"><span class="label">Submit</span><p>Type your full response for grading. Useful starts: "I would stop trusting...", "I would keep operating by...", "Before restoring automation..."</p></div>',
      "</div>"
    ].join("");
  }

  function renderCommandChips(module) {
    var commands = module.suggestedCommands || [];
    if (!commands.length) {
      return '<p class="terminal-command-note">' + escapeHtml(module.commandHint) + "</p>";
    }

    return '<div class="command-chip-row">' + commands.map(function (command) {
      return '<button type="button" class="command-chip" data-command-chip="' + escapeHtml(command) + '">' + escapeHtml(command) + "</button>";
    }).join("") + "</div>";
  }

  function evaluateDecision(text) {
    var lower = normalizeLearnerText(text.toLowerCase());
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
      title: strong ? "STRONG ZERO TRUST DECISION" : risky ? "RISK TO REVIEW" : "PARTIAL DRAFT ACCEPTED",
      source: "LOCAL RUBRIC",
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

  async function gradeDecision(text, module) {
    try {
      var aiResult = await requestAiGrade(text, module);
      updateState(aiResult.deltas, aiResult);
      return aiResult;
    } catch (_error) {
      return evaluateDecision(text);
    }
  }

  async function requestAiGrade(text, module) {
    if (window.location.protocol === "file:") {
      throw new Error("AI grading requires an HTTP endpoint.");
    }

    var controller = new AbortController();
    var timeout = window.setTimeout(function () {
      controller.abort();
    }, 12000);

    try {
      var response = await fetch("/api/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          module: {
            id: module.id,
            title: module.title,
            objective: module.objective,
            narrative: module.narrative,
            prompt: module.prompt,
            phaseLabel: module.phaseLabel
          },
          state: {
            trustAuthorityScore: state.trustAuthorityScore,
            securityForcesFatigue: state.securityForcesFatigue,
            missionContinuityImpact: state.missionContinuityImpact,
            elapsedHours: state.elapsedHours,
            flags: clone(state.flags)
          },
          scenario: {
            constraints: scenario.constraints,
            trustVectors: scenario.trustVectors,
            positiveSignals: scenario.positiveSignals,
            negativeSignals: scenario.negativeSignals
          },
          terminalOutput: moduleUiState[activeModuleIndex].terminalOutput,
          response: text
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("AI grading unavailable.");
      }

      return normalizeAiResult(await response.json(), text);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function normalizeAiResult(payload, text) {
    var rating = ["strong", "partial", "risky"].indexOf(payload.rating) >= 0 ? payload.rating : "partial";
    var deltas = payload.metricDeltas || {};
    var flags = payload.flags || {};
    var risky = rating === "risky" || Boolean(flags.attemptedUnsafePatch);
    var strong = rating === "strong" && !risky;

    applyAiFlags(flags);

    return {
      title: rating === "strong" ? "STRONG ZERO TRUST DECISION" : rating === "risky" ? "RISK TO REVIEW" : "PARTIAL DRAFT ACCEPTED",
      source: "AI RUBRIC",
      rating: rating,
      assessment: coerceText(payload.assessment, "AI feedback returned no assessment."),
      strengths: coerceList(payload.strengths),
      gaps: coerceList(payload.gaps),
      challengeQuestion: coerceText(payload.challengeQuestion, "What evidence would change your trust posture?"),
      nextAction: coerceText(payload.nextAction, "Add one concrete verification step before submitting again."),
      teachingPoint: coerceText(payload.challengeQuestion, "What evidence would change your trust posture?"),
      nextConsideration: coerceText(payload.nextAction, "Add one concrete verification step before submitting again."),
      deltas: {
        trustAuthorityScore: clamp(Number(deltas.trustAuthorityScore) || 0, -18, 18),
        securityForcesFatigue: clamp(Number(deltas.securityForcesFatigue) || 0, 0, 10),
        missionContinuityImpact: clamp(Number(deltas.missionContinuityImpact) || 0, -8, 8),
        elapsedHours: clamp(Number(deltas.elapsedHours) || 4, 0, 8)
      },
      text: text,
      risky: risky,
      strong: strong
    };
  }

  function applyAiFlags(flags) {
    if (flags.assumedBreach) state.flags.assumedBreach = true;
    if (flags.manualVerificationDefined) state.flags.manualVerificationDefined = true;
    if (flags.evidenceBaselineEstablished) state.flags.evidenceBaselineEstablished = true;
    if (flags.attemptedUnsafePatch) state.flags.attemptedUnsafePatch = true;
    if (flags.recoveryAuthorized) state.flags.recoveryAuthorized = true;
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

  function isSupportedCommand(command) {
    return command === "RESET" ||
      command === "STATUS" ||
      command === "DECLARE BREACH ASSUMED" ||
      command === "DEPLOY MANUAL CHECKPOINTS" ||
      command === "WRITE VERIFICATION SOP" ||
      command === "ADVANCE CLOCK" ||
      command === "AUTHORIZE RECOVERY" ||
      Object.prototype.hasOwnProperty.call(scenario.commandResponses || {}, command);
  }

  function isCommandAttempt(command) {
    return /^(HELP|STATUS|RESET|QUERY|ANALYZE|DECLARE|DEPLOY|WRITE|ADVANCE|AUTHORIZE)\b/.test(command);
  }

  function renderFeedback(result) {
    var output = document.getElementById("feedback-output");
    var deltas = result.deltas || {};
    var html = [
      '<div class="feedback-card">',
      '<div class="rubric-heading"><strong>' + escapeHtml(result.title) + "</strong><span>" + escapeHtml(result.source || "LOCAL RUBRIC") + "</span></div>",
      '<p class="feedback-support-note">Spelling is not graded. Focus on operational intent, evidence, and clear next steps.</p>',
      '<div class="score-line">' + renderDelta("Trust", deltas.trustAuthorityScore || 0) + renderDelta("Fatigue", deltas.securityForcesFatigue || 0) + renderDelta("Continuity", deltas.missionContinuityImpact || 0) + renderDelta("Hours", deltas.elapsedHours || 0) + "</div>",
      "<span>Assessment: " + escapeHtml(result.assessment) + "</span>",
      renderRubricList("Strengths", result.strengths),
      renderRubricList("Gaps", result.gaps),
      "<span>Challenge question: " + escapeHtml(result.challengeQuestion || result.teachingPoint) + "</span>",
      "<span>Next action: " + escapeHtml(result.nextAction || result.nextConsideration) + "</span>",
      renderFeedbackActions(result),
      "</div>"
    ].join("");
    moduleUiState[activeModuleIndex].feedbackHtml = html + moduleUiState[activeModuleIndex].feedbackHtml;
    output.innerHTML = moduleUiState[activeModuleIndex].feedbackHtml;
  }

  function renderFeedbackActions(result) {
    var nextIndex = getNextModuleIndex();
    var nextLabel = modules[nextIndex] ? modules[nextIndex].title : "After Action Review";
    var canAdvance = !result.risky && modules[nextIndex] && canAccessModule(nextIndex);
    var nextCopy = result.risky ? "Revise this response before advancing. Close the risk noted above, then submit again." : result.strong ? "Ready to continue. You can advance, or revise if you want a sharper response." : "Good enough to continue. You can advance, or revise to make the response stronger.";
    var actions = [
      '<div class="feedback-actions">',
      '<div><strong>Improve:</strong> ' + escapeHtml(result.nextAction || result.nextConsideration || "Add one concrete verification step.") + "</div>",
      '<div><strong>Next:</strong> ' + escapeHtml(nextCopy) + "</div>",
      '<div class="feedback-action-buttons">',
      '<button type="button" class="button secondary small" data-learner-action="revise">Revise Response</button>'
    ];

    if (canAdvance) {
      actions.push('<button type="button" class="button small" data-learner-action="advance" data-next-index="' + nextIndex + '">Advance: ' + escapeHtml(nextLabel) + "</button>");
    }

    actions.push("</div></div>");
    return actions.join("");
  }

  function getNextModuleIndex() {
    return Math.min(activeModuleIndex + 1, modules.length - 1);
  }

  function isRecommendedNext(index) {
    return Boolean(moduleUiState[activeModuleIndex] && moduleUiState[activeModuleIndex].passed && index === activeModuleIndex + 1 && canAccessModule(index));
  }

  function getNavigationCode(module, index, locked) {
    if (index === activeModuleIndex) {
      return "ACTIVE";
    }
    if (locked) {
      return "LOCKED";
    }
    if (isRecommendedNext(index)) {
      return "READY";
    }
    return getModuleCode(module, index);
  }

  function renderRubricList(label, items) {
    if (!items || !items.length) {
      return "";
    }

    return '<div class="rubric-list"><span>' + escapeHtml(label) + ":</span><ul>" + items.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("") + "</ul></div>";
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
    els.trustStatus.innerHTML = renderRightPanelGuide(module) + scenario.trustVectors.map(function (vector) {
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

  function renderStarterPanel(module) {
    var guide = module.selfPacedGuide;

    if (!guide) {
      return "";
    }

    return renderDisclosure("Async Training Mode", [
      '<div class="starter-panel-header"><div><span class="label">ASYNC TRAINING MODE</span><h3 id="starter-title">' + escapeHtml(guide.starterTitle) + "</h3></div>" + renderGuideButton(module, "prompt") + "</div>",
      '<p>' + escapeHtml(guide.starterMode) + "</p>",
      '<ol class="starter-steps">' + guide.starterSteps.map(item).join("") + "</ol>"
    ].join(""), false, "starter-panel");
  }

  function renderDisclosure(title, content, open, extraClass) {
    return '<details class="lesson-disclosure ' + escapeHtml(extraClass || "") + '"' + (open ? " open" : "") + "><summary>" + escapeHtml(title) + '<span aria-hidden="true"></span></summary><div class="lesson-disclosure-body">' + content + "</div></details>";
  }

  function renderGuideButton(module, sectionKey) {
    var guide = module.selfPacedGuide;

    if (!guide || !guide.sections[sectionKey]) {
      return "";
    }

    return '<button type="button" class="guide-button" data-guide-key="' + escapeHtml(sectionKey) + '" aria-label="Open guidance for ' + escapeHtml(guide.sections[sectionKey].title) + '" aria-expanded="false">?</button>';
  }

  function renderRightPanelGuide(module) {
    if (!module.selfPacedGuide) {
      return "";
    }

    return '<div class="right-panel-guide"><span class="label">Panel Assistance</span>' + renderGuideButton(module, "reference") + "</div>";
  }

  function bindGuideEvents(module) {
    var buttons = document.querySelectorAll("[data-guide-key]");
    var close = document.getElementById("guide-close");

    buttons.forEach(function (button) {
      button.onclick = function () {
        var panel = document.getElementById("guide-panel");
        if (panel && !panel.hidden && activeGuideTrigger === button) {
          closeGuidePanel(false);
          return;
        }

        openGuidePanel(module, button.getAttribute("data-guide-key"), button);
      };
    });

    if (close) {
      close.onclick = closeGuidePanel;
    }
  }

  function openGuidePanel(module, sectionKey, trigger) {
    var panel = document.getElementById("guide-panel");
    var body = document.getElementById("guide-panel-body");
    var guide = module.selfPacedGuide;
    var section = guide && guide.sections[sectionKey];

    if (!panel || !body || !section) {
      return;
    }

    document.querySelectorAll("[data-guide-key]").forEach(function (button) {
      button.setAttribute("aria-expanded", "false");
    });
    activeGuideTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");
    body.innerHTML = [
      '<h3>' + escapeHtml(section.title) + "</h3>",
      guideLine("Purpose", section.purpose),
      guideLine("What to do", section.action),
      guideLine("What good looks like", section.good),
      guideLine("Common trap", section.trap)
    ].join("");
    panel.hidden = false;
  }

  function closeGuidePanel(returnFocus) {
    var panel = document.getElementById("guide-panel");

    if (!panel || panel.hidden) {
      return;
    }

    panel.hidden = true;
    document.querySelectorAll("[data-guide-key]").forEach(function (button) {
      button.setAttribute("aria-expanded", "false");
    });
    if (returnFocus !== false && activeGuideTrigger && document.contains(activeGuideTrigger)) {
      activeGuideTrigger.focus();
    }
    activeGuideTrigger = null;
  }

  function guideLine(label, value) {
    return '<div class="guide-line"><strong>' + escapeHtml(label) + '</strong><p>' + escapeHtml(value) + "</p></div>";
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
    if (els.systemStrip) {
      els.systemStrip.textContent = [
        mode + " MODE",
        "PACS UNTRUSTED",
        "TRUST " + state.trustAuthorityScore,
        "H+" + state.elapsedHours,
        "PHASE " + modules[activeModuleIndex].phaseLabel,
        "LOCAL SIM"
      ].join(" // ");
    }
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
    return '<div class="progress-track" aria-label="Mission progress">' + modules.map(function (_module, index) {
      var className = index === activeModuleIndex ? "active" : moduleUiState[index] && moduleUiState[index].passed ? "done" : isModuleLocked(index) ? "locked" : "";
      return '<span class="progress-step ' + className + '"></span>';
    }).join("") + "</div>";
  }

  function canAccessModule(index) {
    var module = modules[index];
    if (!module) {
      return false;
    }
    if (module.isReference || index === activeModuleIndex) {
      return true;
    }
    if (module.isAar) {
      return Boolean(moduleUiState[4] && moduleUiState[4].passed);
    }
    if (index === 0) {
      return true;
    }
    return isSequentiallyUnlocked(index);
  }

  function isSequentiallyUnlocked(index) {
    for (var i = 0; i < index; i += 1) {
      if (modules[i].isReference || modules[i].isAar) {
        continue;
      }
      if (!moduleUiState[i] || !moduleUiState[i].passed) {
        return false;
      }
    }
    return true;
  }

  function isModuleLocked(index) {
    return !canAccessModule(index);
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
      return "This draft has a useful starting point, but it includes an assumption that could restore trust before evidence supports it.";
    }
    if (positives >= 3) {
      return "The action aligns with multiple Zero Trust behaviors and improves operational discipline.";
    }
    return "This is a workable start. Add more explicit evidence, authority, or operating detail so another operator can follow the decision.";
  }

  function buildTeachingPoint(lower, risky) {
    if (risky) {
      return "Under PACS compromise, speed becomes safer when it is paired with validation and clear limits.";
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
    if (!state.flags.assumedBreach) return "Add what is untrusted and how the team will operate under assumed breach.";
    if (!state.flags.manualVerificationDefined) return "Add guard-executable manual verification steps and escalation criteria.";
    if (state.securityForcesFatigue > 60) return "Add a fatigue control such as rotations, prioritized access, or commander-approved exceptions.";
    if (!state.flags.evidenceBaselineEstablished) return "Add the evidence baseline required before any automated restoration.";
    return "Plan phased recovery with monitoring, rollback criteria, and continued manual oversight.";
  }

  function normalizeLearnerText(text) {
    return text
      .replace(/\bdon't trust logs\b/g, "logs untrusted")
      .replace(/\bdont trust logs\b/g, "logs untrusted")
      .replace(/\bdo not trust logs\b/g, "logs untrusted")
      .replace(/\bnot trust logs\b/g, "logs untrusted")
      .replace(/\bdon't trust pacs\b/g, "pacs untrusted")
      .replace(/\bdont trust pacs\b/g, "pacs untrusted")
      .replace(/\bdo not trust pacs\b/g, "pacs untrusted")
      .replace(/\bnot trust pacs\b/g, "pacs untrusted")
      .replace(/\bbrech\b/g, "breach")
      .replace(/\bautorize\b/g, "authorize")
      .replace(/\bauthorise\b/g, "authorize")
      .replace(/\bverfication\b/g, "verification")
      .replace(/\bverifcation\b/g, "verification")
      .replace(/\bvalidaton\b/g, "validation")
      .replace(/\bmanul\b/g, "manual")
      .replace(/\bcheks\b/g, "checks")
      .replace(/\bchks\b/g, "checks")
      .replace(/\bmanual checks\b/g, "manual verification")
      .replace(/\bmanual check\b/g, "manual verification")
      .replace(/\buntrustd\b/g, "untrusted")
      .replace(/\bevidance\b/g, "evidence")
      .replace(/\bbasline\b/g, "baseline")
      .replace(/\brestor\b/g, "restore");
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
    return '<div class="metric-card"><span class="readout-ticks" aria-hidden="true"></span><span class="label">' + escapeHtml(label) + '</span><span class="metric-value">' + escapeHtml(String(value)) + '</span><span class="readout-code">SYS RDY</span></div>';
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

  function getModuleCode(module, index) {
    if (module.isAar) {
      return "AAR";
    }
    if (module.isReference) {
      return "LIB";
    }
    return index === 0 ? "SYS" : "PHASE";
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function createModuleUiState() {
    return modules.map(function () {
      return {
        hasInvestigated: false,
        hasSubmitted: false,
        lastRisky: false,
        passed: false,
        terminalDraft: "",
        terminalOutput: "SYSTEM READY. TYPE HELP FOR AVAILABLE COMMANDS.",
        feedbackHtml: "Decision feedback will appear here after submission."
      };
    });
  }

  function persistActiveModuleUiState() {
    var savedUi = moduleUiState[activeModuleIndex];
    var terminalInput = document.getElementById("terminal-input");
    var terminalOutput = document.getElementById("terminal-output");
    var feedbackOutput = document.getElementById("feedback-output");

    if (!savedUi) {
      return;
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

  function coerceText(value, fallback) {
    var text = String(value || "").trim();
    return text || fallback;
  }

  function coerceList(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map(function (item) {
      return String(item || "").trim();
    }).filter(Boolean).slice(0, 3);
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
