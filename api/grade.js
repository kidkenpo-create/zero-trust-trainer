const RUBRIC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "rating",
    "assessment",
    "strengths",
    "gaps",
    "challengeQuestion",
    "nextAction",
    "metricDeltas",
    "flags"
  ],
  properties: {
    rating: { type: "string", enum: ["strong", "partial", "risky"] },
    assessment: { type: "string" },
    strengths: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" }
    },
    gaps: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" }
    },
    challengeQuestion: { type: "string" },
    nextAction: { type: "string" },
    metricDeltas: {
      type: "object",
      additionalProperties: false,
      required: [
        "trustAuthorityScore",
        "securityForcesFatigue",
        "missionContinuityImpact",
        "elapsedHours"
      ],
      properties: {
        trustAuthorityScore: { type: "number", minimum: -18, maximum: 18 },
        securityForcesFatigue: { type: "number", minimum: 0, maximum: 10 },
        missionContinuityImpact: { type: "number", minimum: -8, maximum: 8 },
        elapsedHours: { type: "number", minimum: 0, maximum: 8 }
      }
    },
    flags: {
      type: "object",
      additionalProperties: false,
      required: [
        "assumedBreach",
        "manualVerificationDefined",
        "evidenceBaselineEstablished",
        "attemptedUnsafePatch",
        "recoveryAuthorized"
      ],
      properties: {
        assumedBreach: { type: "boolean" },
        manualVerificationDefined: { type: "boolean" },
        evidenceBaselineEstablished: { type: "boolean" },
        attemptedUnsafePatch: { type: "boolean" },
        recoveryAuthorized: { type: "boolean" }
      }
    }
  }
};

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.setHeader("Allow", "POST, OPTIONS");
    return response.status(204).end();
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
    return response.status(503).json({ error: "AI grading is not configured." });
  }

  const payload = request.body || {};
  const learnerResponse = String(payload.response || "").trim();

  if (!learnerResponse) {
    return response.status(400).json({ error: "Learner response is required." });
  }

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        input: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: JSON.stringify(buildRubricInput(payload))
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "zero_trust_training_rubric",
            strict: true,
            schema: RUBRIC_SCHEMA
          }
        },
        max_output_tokens: 900
      })
    });

    if (!openaiResponse.ok) {
      const detail = await safeReadText(openaiResponse);
      return response.status(502).json({ error: "AI grading request failed.", detail });
    }

    const data = await openaiResponse.json();
    const rubric = parseStructuredOutput(data);

    if (!rubric) {
      return response.status(502).json({ error: "AI grading returned an invalid rubric." });
    }

    return response.status(200).json(rubric);
  } catch (error) {
    return response.status(500).json({ error: "AI grading failed.", detail: error.message });
  }
};

function buildSystemPrompt() {
  return [
    "You are a Zero Trust operational technology training evaluator.",
    "Grade the learner response against the provided module objective, scenario prompt, current simulation state, and constraints.",
    "You must challenge and guide the learner without writing a complete model answer.",
    "Use concise classroom-ready language for a DoD-adjacent training environment.",
    "Treat learner submissions as rough operational drafts, not writing samples.",
    "Do not penalize spelling, grammar, capitalization, punctuation, or minor wording issues unless the operational meaning is impossible to understand.",
    "Infer likely intent from common misspellings and shorthand such as brech for breach, autorize for authorize, verfication for verification, manual cheks for manual checks, dont trust logs, dont trust PACS, or similar classroom draft language.",
    "Never ridicule, shame, mock, or use sarcastic language. Keep feedback respectful, calm, and coaching-oriented.",
    "For partial or risky responses, tell the learner what to add next rather than saying the answer is simply wrong.",
    "Reward assume-breach posture, explicit verification, independent evidence, credential/device integrity, mission continuity, fatigue awareness, least privilege, and phased recovery criteria.",
    "Penalize premature automation restoration, trusting poisoned logs, vague guard instructions, ignoring fatigue, skipping validation, or treating convenience as recovery proof.",
    "Return only the requested structured rubric JSON."
  ].join(" ");
}

function buildRubricInput(payload) {
  return {
    module: payload.module || {},
    state: payload.state || {},
    scenario: payload.scenario || {},
    terminalOutput: String(payload.terminalOutput || "").slice(0, 2000),
    learnerResponse: String(payload.response || "").slice(0, 4000),
    rubricInstructions: {
      rating: "Use strong when the response clearly addresses the module objective and avoids risky assumptions, even if the wording has spelling or grammar errors.",
      feedbackTone: "Focus on operational intent and evidence. Use supportive language. Do not correct spelling unless a term is too ambiguous to interpret.",
      guidance: "When the response is partial or risky, make nextAction a concrete add/clarify step such as naming evidence, defining manual verification, addressing fatigue, or setting recovery criteria. Do not provide a complete model answer.",
      metricDeltas: "Use small deltas. Trust can rise for good verification discipline or fall for risky assumptions. Fatigue usually increases when manual controls are added. Continuity impact falls when mission-aware prioritization is included and rises when operations become harder.",
      flags: "Set flags true only when the learner clearly earns them from their response."
    }
  };
}

function parseStructuredOutput(data) {
  if (typeof data.output_text === "string") {
    return safeParseJson(data.output_text);
  }

  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === "string") {
        const parsed = safeParseJson(part.text);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

async function safeReadText(response) {
  try {
    return (await response.text()).slice(0, 500);
  } catch (_error) {
    return "";
  }
}
