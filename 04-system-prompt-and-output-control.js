/**
 * Sample 04: System Prompt Engineering & Output Format Control
 * -------------------------------------------------------------
 * Demonstrates how a well-crafted system prompt — defining role, constraints,
 * tone, and output schema — dramatically shapes model behavior compared to
 * relying on the user turn alone.
 *
 * Also shows how to enforce strict JSON output for downstream parsing,
 * a critical technique for production AI pipelines.
 *
 * Use case: A support ticket triage assistant that categorizes incoming
 * tickets, assigns priority, and suggests a response — ready to be consumed
 * by a ticketing system API.
 */

import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TICKETS = [
  "Hi, I've been waiting 3 weeks for my refund and nobody is responding to my emails. This is unacceptable.",
  "Quick question — does your API support batch requests or only single calls?",
  "URGENT: Our entire production environment is down and we're losing thousands per minute. Need help NOW.",
  "I'd love to see a dark mode option in the dashboard. Just a suggestion!",
];

// ── WEAK SYSTEM PROMPT ─────────────────────────────────────────────────────
const WEAK_SYSTEM = `You are a helpful assistant. Help triage customer support tickets.`;

// ── STRONG SYSTEM PROMPT ───────────────────────────────────────────────────
const STRONG_SYSTEM = `
You are a support triage engine for a B2B SaaS company. Your job is to analyze inbound support tickets and return structured data for routing.

Rules:
- You MUST respond only with a valid JSON object. No preamble, no explanation, no markdown.
- Do not add any text before or after the JSON.

Output schema (use exactly these keys):
{
  "category": one of ["billing", "technical", "feature_request", "general_inquiry"],
  "priority": one of ["critical", "high", "medium", "low"],
  "sentiment": one of ["frustrated", "neutral", "positive"],
  "suggested_response": a 1-2 sentence empathetic reply to send to the customer,
  "route_to": one of ["billing_team", "engineering", "product", "support_tier_1"]
}

Priority guide:
- critical: production outages, data loss, security issues
- high: customer blocked from core functionality, financial dispute
- medium: usability issues, general questions
- low: feature requests, compliments, curiosity
`.trim();

async function triageWithWeakPrompt(ticket) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: WEAK_SYSTEM,
    messages: [{ role: "user", content: `Triage this ticket: "${ticket}"` }],
  });
  return response.content[0].text.trim();
}

async function triageWithStrongPrompt(ticket) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: STRONG_SYSTEM,
    messages: [{ role: "user", content: ticket }],
  });

  const raw = response.content[0].text.trim();

  // Attempt to parse — in a real pipeline this gates downstream processing
  try {
    return { parsed: true, data: JSON.parse(raw) };
  } catch {
    return { parsed: false, raw };
  }
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  for (const ticket of TICKETS) {
    console.log("\n" + "=".repeat(60));
    console.log(`TICKET: "${ticket}"`);

    console.log("\n-- Weak System Prompt Output --");
    const weak = await triageWithWeakPrompt(ticket);
    console.log(weak);

    console.log("\n-- Strong System Prompt Output --");
    const strong = await triageWithStrongPrompt(ticket);
    if (strong.parsed) {
      console.log(JSON.stringify(strong.data, null, 2));
    } else {
      console.log("⚠️  JSON parse failed:", strong.raw);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n--- Observation ---");
  console.log(
    "The strong system prompt produces consistent, machine-parseable JSON across all ticket types."
  );
  console.log(
    "The weak prompt produces helpful prose — but it varies in structure and cannot be reliably parsed by downstream systems."
  );
  console.log(
    "In production pipelines, output format control is as important as the content of the answer."
  );
}

main().catch(console.error);
