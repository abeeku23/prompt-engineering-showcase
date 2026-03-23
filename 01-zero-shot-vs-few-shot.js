/**
 * Sample 01: Zero-Shot vs. Few-Shot Prompting
 * --------------------------------------------
 * Demonstrates how adding examples (few-shot) to a prompt
 * significantly improves output consistency and format adherence
 * compared to a bare instruction (zero-shot).
 *
 * Use case: Classifying text by sentiment and extracting a structured summary.
 */

import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INPUT_TEXT = `
  The new project management tool has a clean interface and the onboarding 
  was smooth. However, the reporting features are frustratingly limited and 
  customer support took three days to respond to a basic question.
`;

// ── ZERO-SHOT ──────────────────────────────────────────────────────────────
export async function zeroShot() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Analyze the sentiment of the following review and summarize the key points.\n\nReview: ${INPUT_TEXT}`,
      },
    ],
  });

  return response.content[0].text;
}

// ── FEW-SHOT ───────────────────────────────────────────────────────────────
export async function fewShot() {
  const examples = `
Example 1:
Review: "Fast shipping and the product looks great, but the sizing runs small and returns are a hassle."
Output:
{
  "sentiment": "mixed",
  "positives": ["fast shipping", "good appearance"],
  "negatives": ["sizing runs small", "difficult returns"],
  "overall_score": 3
}

Example 2:
Review: "Absolutely love this app. Intuitive design, works offline, and the team ships updates constantly."
Output:
{
  "sentiment": "positive",
  "positives": ["intuitive design", "offline support", "frequent updates"],
  "negatives": [],
  "overall_score": 5
}

Example 3:
Review: "The food was cold, service was rude, and they got our order wrong twice."
Output:
{
  "sentiment": "negative",
  "positives": [],
  "negatives": ["cold food", "rude service", "incorrect orders"],
  "overall_score": 1
}
`.trim();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are a sentiment analysis tool. Analyze each review and return a JSON object exactly matching the format shown in the examples below.\n\n${examples}\n\nNow analyze this review:\nReview: ${INPUT_TEXT}\nOutput:`,
      },
    ],
  });

  return response.content[0].text;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export async function main() {
  console.log("=== INPUT TEXT ===");
  console.log(INPUT_TEXT.trim());

  console.log("\n=== ZERO-SHOT OUTPUT ===");
  const zeroResult = await zeroShot();
  console.log(zeroResult);

  console.log("\n=== FEW-SHOT OUTPUT ===");
  const fewResult = await fewShot();
  console.log(fewResult);

  console.log("\n--- Observation ---");
  console.log(
    "Few-shot produces a structured, machine-parseable JSON object every time."
  );
  console.log(
    "Zero-shot produces a valid response but format varies across runs."
  );
}

/* istanbul ignore next */
if (process.env.NODE_ENV !== "test") {
  main().catch(console.error);
}
