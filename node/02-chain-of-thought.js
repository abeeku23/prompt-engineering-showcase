/**
 * Sample 02: Chain-of-Thought (CoT) Prompting
 * ---------------------------------------------
 * Demonstrates how instructing the model to reason step-by-step
 * before arriving at a final answer improves accuracy on complex,
 * multi-factor tasks.
 *
 * Use case: Evaluating a software engineering candidate's fit for a role
 * based on a job description and resume summary — a task with competing signals
 * that benefits from explicit reasoning.
 */

import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const JOB_DESCRIPTION = `
  Role: Senior Backend Engineer
  Requirements:
  - 5+ years of backend development experience
  - Strong proficiency in Node.js or Python
  - Experience with distributed systems and microservices
  - Familiarity with cloud platforms (AWS, GCP, or Azure)
  - Experience leading or mentoring engineers
  Nice to have: GraphQL, Kafka, or event-driven architecture experience
`;

const CANDIDATE_SUMMARY = `
  Candidate: Jordan M.
  - 4 years of professional backend experience
  - Expert-level Python; working knowledge of Node.js
  - Built and maintained 3 microservices in production at current role
  - AWS Certified Solutions Architect
  - Mentors 2 junior engineers; leads sprint planning
  - No GraphQL experience; limited Kafka exposure
`;

// ── WITHOUT CoT ────────────────────────────────────────────────────────────
export async function withoutCoT() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Given the job description and candidate summary below, should we move this candidate to the next interview round? Answer with YES or NO and a one-sentence reason.\n\nJob Description:\n${JOB_DESCRIPTION}\n\nCandidate:\n${CANDIDATE_SUMMARY}`,
      },
    ],
  });

  return response.content[0].text;
}

// ── WITH CoT ───────────────────────────────────────────────────────────────
export async function withCoT() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are a technical recruiting advisor. Given a job description and candidate profile, evaluate fit carefully before making a recommendation.

Think through each requirement one at a time:
1. List each requirement and whether the candidate meets it, partially meets it, or does not meet it.
2. Weigh the gaps against the candidate's strengths.
3. Consider whether the gaps are trainable or fundamental blockers.
4. Then give your final recommendation: ADVANCE, HOLD, or REJECT — with a 2-3 sentence justification.

Job Description:
${JOB_DESCRIPTION}

Candidate:
${CANDIDATE_SUMMARY}

Let's think through this step by step:`,
      },
    ],
  });

  return response.content[0].text;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export async function main() {
  console.log("=== WITHOUT CHAIN-OF-THOUGHT ===");
  const direct = await withoutCoT();
  console.log(direct);

  console.log("\n=== WITH CHAIN-OF-THOUGHT ===");
  const reasoned = await withCoT();
  console.log(reasoned);

  console.log("\n--- Observation ---");
  console.log(
    "CoT produces a traceable, auditable decision with nuance around partial matches."
  );
  console.log(
    "Without CoT, the model may overlook competing signals and oversimplify."
  );
}

/* istanbul ignore next */
if (process.env.NODE_ENV !== "test") {
  main().catch(console.error);
}
