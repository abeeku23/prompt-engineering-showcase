/**
 * Sample 03: Prompt Chaining (Multi-Step Pipeline)
 * --------------------------------------------------
 * Demonstrates how to decompose a complex task into a sequence of
 * focused prompts where each output feeds into the next step.
 * This improves reliability over single "do everything" mega-prompts.
 *
 * Use case: A 3-step content pipeline —
 *   Step 1: Extract key topics from a raw article
 *   Step 2: Generate a structured outline from those topics
 *   Step 3: Write an executive summary from the outline
 */

import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RAW_ARTICLE = `
  Artificial intelligence is reshaping the drug discovery process. Traditionally, 
  identifying a viable drug candidate took over a decade and billions in investment. 
  Machine learning models can now screen millions of molecular compounds in hours, 
  predicting binding affinity and toxicity before a single lab experiment is run. 
  Companies like Recursion Pharmaceuticals and Insilico Medicine have used AI to 
  move candidates from target identification to clinical trials in record time.

  However, regulatory frameworks haven't kept pace. The FDA is still developing 
  guidance for AI-generated evidence in drug applications, and there are real concerns 
  about model explainability — physicians and regulators need to understand why an 
  AI recommends a compound, not just that it does.

  Meanwhile, smaller biotech firms face an access gap. The compute costs required 
  to train frontier models are prohibitive, and open-source alternatives lag behind 
  proprietary systems in accuracy. This could widen the innovation gap between 
  well-funded incumbents and emerging players in the space.
`;

export async function callClaude(prompt, context = "") {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: context ? `${context}\n\n${prompt}` : prompt,
      },
    ],
  });

  return response.content[0].text.trim();
}

// ── PIPELINE ───────────────────────────────────────────────────────────────
export async function runPipeline() {
  // Step 1: Topic extraction
  console.log("⏳ Step 1: Extracting key topics...");
  const topics = await callClaude(
    `Extract the 4-5 most important topics or themes from the article below. Return them as a simple numbered list — no explanations, just the topic names.\n\nArticle:\n${RAW_ARTICLE}`
  );
  console.log("\n✅ Step 1 Output — Key Topics:");
  console.log(topics);

  // Step 2: Outline generation (feeds from Step 1)
  console.log("\n⏳ Step 2: Building structured outline...");
  const outline = await callClaude(
    `You are a content strategist. Using the topics below, create a structured 3-section outline for a one-page executive briefing. Each section should have a title and 2 bullet sub-points.\n\nTopics:\n${topics}`
  );
  console.log("\n✅ Step 2 Output — Structured Outline:");
  console.log(outline);

  // Step 3: Executive summary (feeds from Step 2 + original article)
  console.log("\n⏳ Step 3: Writing executive summary...");
  const summary = await callClaude(
    `You are a senior analyst writing for a C-suite audience. Using the outline below as your structure and the original article as your source material, write a concise 150-word executive summary. Use plain language. Avoid jargon.\n\nOutline:\n${outline}\n\nOriginal Article:\n${RAW_ARTICLE}`
  );
  console.log("\n✅ Step 3 Output — Executive Summary:");
  console.log(summary);

  return { topics, outline, summary };
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export async function main() {
  console.log("=== PROMPT CHAINING PIPELINE ===");
  console.log("Input: Raw article on AI in drug discovery\n");

  const result = await runPipeline();

  console.log("\n--- Observation ---");
  console.log(
    "Each step is focused on one task, making outputs easier to validate and debug."
  );
  console.log(
    "If Step 2 produces a poor outline, you fix that prompt without touching Step 1 or 3."
  );
}

/* istanbul ignore next */
if (process.env.NODE_ENV !== "test") {
  main().catch(console.error);
}
