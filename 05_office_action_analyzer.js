/**
 * Sample 05: Office Action Analyzer & Response Strategist
 * ---------------------------------------------------------
 * Reads a USPTO office action, identifies all rejections and objections,
 * classifies them by statutory basis (35 U.S.C. §§ 101, 102, 103, 112),
 * analyzes the examiner's arguments, and generates a structured response
 * strategy with suggested arguments and claim amendment guidance.
 *
 * Pipeline:
 *   Step 1 — Parse & classify all rejections in the office action
 *   Step 2 — For each rejection, analyze the examiner's reasoning
 *   Step 3 — Generate a response strategy with legal arguments
 *   Step 4 — Suggest specific claim amendment language where applicable
 *   Step 5 — Produce a consolidated response outline
 *
 * Use case: Helping patent attorneys and agents quickly triage an office
 * action, identify the strongest response angles, and draft the skeleton
 * of an office action response before detailed prosecution work begins.
 *
 * Note: This tool provides strategic suggestions only. All responses
 * must be reviewed and filed by a registered patent practitioner.
 */

import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import fs from "fs";
import path from "path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── FILE LOADER ───────────────────────────────────────────────────────────
/**
 * Load office action text from a file path.
 *
 * Supported formats:
 *   .txt  — read as UTF-8 plain text
 *   .pdf  — extract text via pdf-parse
 *   .docx — extract text via mammoth
 *
 * @param {string} filePath  Absolute or relative path to the office action file.
 * @returns {Promise<string>} Extracted plain text content.
 * @throws {Error} If the file format is unsupported or the file cannot be read.
 */
export async function loadOfficeAction(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".txt") {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      throw new Error(`Failed to read .txt file "${filePath}": ${err.message}`);
    }
  }

  if (ext === ".pdf") {
    const { default: pdfParse } = await import("pdf-parse");
    let buffer;
    try {
      buffer = fs.readFileSync(filePath);
    } catch (err) {
      throw new Error(`Failed to read .pdf file "${filePath}": ${err.message}`);
    }
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  throw new Error(
    `Unsupported file format "${ext}". Supported formats: .txt, .pdf, .docx`
  );
}

// ── SAMPLE OFFICE ACTION ──────────────────────────────────────────────────
// Used as the default when no file path is provided.
// Pass a file path as the first CLI argument to analyse a real office action:
//   node 05_office_action_analyzer.js path/to/office_action.pdf
const OFFICE_ACTION = `
APPLICATION NUMBER: 17/123,456
FILING DATE: March 15, 2022
ART UNIT: 3689
EXAMINER: John R. Smith

OFFICE ACTION SUMMARY

Claims 1-20 are pending. Claims 1-20 are rejected.

CLAIM REJECTIONS - 35 U.S.C. § 101

Claim 1 is rejected under 35 U.S.C. § 101 because the claimed invention is directed to a 
judicial exception (an abstract idea) without significantly more. Specifically, claim 1 is 
directed to the abstract idea of collecting and analyzing financial transaction data to detect 
fraud, which is a method of organizing human activity and a mathematical concept. The additional 
elements recited in claim 1 — a processor and a database — are generic computer components that 
perform generic computer functions and do not provide an inventive concept sufficient to transform 
the abstract idea into patent-eligible subject matter.

CLAIM REJECTIONS - 35 U.S.C. § 102

Claims 3 and 7 are rejected under 35 U.S.C. § 102(a)(1) as being anticipated by Johnson et al. 
(US 10,123,456, hereinafter "Johnson"). Johnson discloses a fraud detection system comprising: 
a processor configured to receive transaction data (Johnson, col. 4, lines 12-35), a machine 
learning model trained on historical fraud patterns (Johnson, col. 6, lines 1-28), and a risk 
scoring engine that generates a fraud probability score for each transaction (Johnson, col. 8, 
lines 40-62). Johnson further discloses real-time alert generation when the fraud probability 
score exceeds a configurable threshold (Johnson, col. 9, lines 5-20), which reads directly on 
the limitations of claims 3 and 7.

CLAIM REJECTIONS - 35 U.S.C. § 103

Claims 2, 4-6, and 8-15 are rejected under 35 U.S.C. § 103 as being unpatentable over Johnson 
(cited above) in view of Patel et al. (US 9,876,543, hereinafter "Patel"). Johnson discloses 
the fraud detection system as described above. Johnson does not explicitly disclose the use of 
federated learning to train the machine learning model without centralizing sensitive user data, 
as recited in claims 4-6. However, Patel discloses a federated learning framework for training 
fraud detection models across distributed nodes while preserving data privacy (Patel, col. 3, 
lines 10-45; col. 7, lines 15-38). It would have been obvious to one of ordinary skill in the 
art to incorporate Patel's federated learning approach into Johnson's fraud detection system to 
achieve the predictable benefit of improved data privacy compliance, as both references operate 
in the same field and address compatible technical problems.

CLAIM REJECTIONS - 35 U.S.C. § 112

Claims 16-20 are rejected under 35 U.S.C. § 112(b) as being indefinite. Claim 16 recites 
"substantially real-time processing" without providing a standard for measuring what constitutes 
substantially real-time in the context of the claimed invention. A person of ordinary skill in 
the art would not be reasonably certain about the scope of this claim term. Similarly, claim 19 
recites "a high-confidence fraud signal" without defining what level of confidence constitutes 
"high confidence," rendering the metes and bounds of the claim unclear.

OBJECTIONS

The drawings are objected to under 37 C.F.R. § 1.83(a) because Figure 3 fails to show all 
elements recited in claim 8. Specifically, the federated learning nodes described in claim 8 
are not illustrated in Figure 3.
`.trim();

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────
const PATENT_ANALYST_SYSTEM = `
You are an expert patent prosecution analyst with deep knowledge of USPTO examination procedures, 
35 U.S.C. §§ 101, 102, 103, and 112, MPEP guidelines, and Federal Circuit case law. 

Your role is to help patent practitioners analyze office actions and develop response strategies. 
You provide well-reasoned, technically accurate analysis grounded in patent law.

Important constraints:
- Always note that your analysis is for strategic guidance only and must be reviewed by a registered patent practitioner before filing
- Reference specific MPEP sections and relevant case law where applicable
- Be precise about claim numbers and statutory bases
- Distinguish between rejections that can be overcome by argument alone versus those requiring claim amendments
`.trim();

// ── STEP 1: PARSE AND CLASSIFY ────────────────────────────────────────────
export async function parseAndClassify(officeAction) {
  console.log("⏳ Step 1: Parsing and classifying rejections...\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: PATENT_ANALYST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Parse the following office action and return a JSON object with this exact structure:
{
  "application_number": "string",
  "art_unit": "string", 
  "examiner": "string",
  "total_claims_pending": number,
  "rejections": [
    {
      "id": "string (e.g. REJ-1)",
      "statute": "101 | 102 | 103 | 112",
      "subsection": "string (e.g. 102(a)(1), 112(b))",
      "claims_affected": [array of claim numbers as integers],
      "prior_art_references": ["string"] or [],
      "rejection_basis_summary": "1-2 sentence summary of why the examiner rejected these claims",
      "difficulty": "straightforward | moderate | complex"
    }
  ],
  "objections": [
    {
      "id": "string (e.g. OBJ-1)",
      "target": "string (what is being objected to)",
      "basis": "string (CFR or rule cited)",
      "summary": "string"
    }
  ]
}

Respond with valid JSON only. No preamble, no markdown fences.

Office Action:
${officeAction}`,
      },
    ],
  });

  const raw = response.content[0].text.trim();
  try {
    return { success: true, data: JSON.parse(raw) };
  } catch {
    return { success: false, raw };
  }
}

// ── STEP 2: ANALYZE EACH REJECTION ───────────────────────────────────────
export async function analyzeRejection(rejection, officeActionText) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    system: PATENT_ANALYST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Analyze the following rejection from a USPTO office action.

Rejection: ${JSON.stringify(rejection, null, 2)}

Full Office Action Context:
${officeActionText}

Provide your analysis in this JSON format:
{
  "rejection_id": "string",
  "examiner_argument_strength": "weak | moderate | strong",
  "key_vulnerabilities_in_examiner_position": ["string"],
  "can_overcome_by_argument_alone": true | false,
  "amendment_likely_required": true | false,
  "relevant_case_law": ["string (case name + brief relevance)"],
  "relevant_mpep_sections": ["string"],
  "strategic_notes": "string (1-2 sentences on the overall approach)"
}

Respond with valid JSON only. No preamble, no markdown fences.`,
      },
    ],
  });

  const raw = response.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return { rejection_id: rejection.id, parse_error: raw };
  }
}

// ── STEP 3: GENERATE RESPONSE STRATEGY ───────────────────────────────────
export async function generateResponseStrategy(rejection, analysis, officeActionText) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: PATENT_ANALYST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `You are drafting the response strategy section for a USPTO office action response.

Rejection:
${JSON.stringify(rejection, null, 2)}

Analysis:
${JSON.stringify(analysis, null, 2)}

Office Action Context:
${officeActionText}

Generate a structured response strategy with the following sections:
1. RESPONSE APPROACH (1-2 sentences: argue, amend, or both)
2. KEY ARGUMENTS (bulleted list of specific arguments to make, citing claim language and prior art distinctions where relevant)
3. CLAIM AMENDMENT GUIDANCE (if applicable: specific suggestions for narrowing, clarifying, or restructuring the affected claims)
4. RISKS & CONSIDERATIONS (any prosecution history estoppel concerns, disclaimer risks, or strategic tradeoffs)

Be specific and actionable. Reference actual claim numbers and prior art references from the office action.`,
      },
    ],
  });

  return response.content[0].text.trim();
}

// ── STEP 4: SUGGEST CLAIM AMENDMENTS ─────────────────────────────────────
export async function suggestClaimAmendments(rejection, officeActionText) {
  // Only generate amendment suggestions for 103 and 112 rejections
  if (!["103", "112"].includes(rejection.statute)) return null;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    system: PATENT_ANALYST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Based on the following ${rejection.statute} rejection, suggest specific claim amendment language.

Rejection: ${JSON.stringify(rejection, null, 2)}

Office Action Context:
${officeActionText}

For each affected claim, suggest:
1. What limitation to add, narrow, or clarify
2. Draft amendment language in proper USPTO format (use [[deleted text]] for deletions and underline notation described as "underlined" for additions)
3. Why this amendment overcomes the rejection

Be concrete. If you cannot suggest a specific amendment without seeing the full claim text, state what type of limitation should be added and why.`,
      },
    ],
  });

  return response.content[0].text.trim();
}

// ── STEP 5: CONSOLIDATED RESPONSE OUTLINE ─────────────────────────────────
export async function generateResponseOutline(parsed, analyses, strategies) {
  const summary = {
    rejections: parsed.rejections.map((r) => ({
      id: r.id,
      statute: r.statute,
      claims: r.claims_affected,
      difficulty: r.difficulty,
    })),
    objections: parsed.objections,
  };

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: PATENT_ANALYST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `You are preparing a consolidated office action response outline for a patent attorney.

Application: ${parsed.application_number}
Examiner: ${parsed.examiner} | Art Unit: ${parsed.art_unit}

Rejection Summary:
${JSON.stringify(summary, null, 2)}

Write a professional response outline with:
1. PRELIMINARY REMARKS — brief framing paragraph acknowledging the office action
2. RESPONSE OVERVIEW TABLE — one row per rejection showing: Rejection ID | Statute | Claims | Approach (Argue / Amend / Both) | Estimated Difficulty
3. RECOMMENDED FILING STRATEGY — overall sequencing advice (e.g., whether to request an interview first, whether to file an RCE if needed, timeline considerations)
4. PRACTITIONER NOTES — any red flags, claim scope concerns, or strategic considerations the filing attorney should be aware of before drafting

Write in professional patent prosecution style.`,
      },
    ],
  });

  return response.content[0].text.trim();
}

// ── MAIN ──────────────────────────────────────────────────────────────────
export async function main() {
  console.log("=".repeat(60));
  console.log("OFFICE ACTION ANALYZER & RESPONSE STRATEGIST");
  console.log("=".repeat(60));
  console.log(
    "\n⚠️  NOTE: This analysis is for strategic guidance only.\n" +
      "   All responses must be reviewed and filed by a registered patent practitioner.\n"
  );

  // Resolve office action text: use a supplied file path or fall back to the
  // built-in sample.  Supported file types: .txt, .pdf, .docx
  const filePath = process.argv[2];
  let officeActionText;
  if (filePath) {
    console.log(`📂 Loading office action from: ${filePath}\n`);
    try {
      officeActionText = await loadOfficeAction(filePath);
    } catch (err) {
      console.error(`❌ Failed to load file: ${err.message}`);
      return;
    }
  } else {
    officeActionText = OFFICE_ACTION;
  }

  // Step 1: Parse
  const parseResult = await parseAndClassify(officeActionText);
  if (!parseResult.success) {
    console.error("Failed to parse office action:", parseResult.raw);
    return;
  }

  const parsed = parseResult.data;
  console.log("✅ Office Action Parsed:");
  console.log(`   Application: ${parsed.application_number}`);
  console.log(`   Examiner: ${parsed.examiner} | Art Unit: ${parsed.art_unit}`);
  console.log(`   Rejections: ${parsed.rejections.length} | Objections: ${parsed.objections.length}`);
  console.log(
    `   Claims affected: ${[...new Set(parsed.rejections.flatMap((r) => r.claims_affected))].sort((a, b) => a - b).join(", ")}\n`
  );

  // Step 2 & 3: Analyze + strategize per rejection
  const analyses = {};
  const strategies = {};
  const amendments = {};

  for (const rejection of parsed.rejections) {
    console.log(`${"─".repeat(60)}`);
    console.log(`📋 ${rejection.id} — § ${rejection.subsection} | Claims: ${rejection.claims_affected.join(", ")}`);

    console.log(`   ⏳ Analyzing examiner's position...`);
    const analysis = await analyzeRejection(rejection, officeActionText);
    analyses[rejection.id] = analysis;
    console.log(`   Examiner strength: ${analysis.examiner_argument_strength?.toUpperCase()}`);
    console.log(`   Overcome by argument alone: ${analysis.can_overcome_by_argument_alone ? "Yes" : "No"}`);
    if (analysis.key_vulnerabilities_in_examiner_position?.length) {
      console.log(`   Vulnerabilities: ${analysis.key_vulnerabilities_in_examiner_position.slice(0, 2).join("; ")}`);
    }

    console.log(`\n   ⏳ Generating response strategy...`);
    const strategy = await generateResponseStrategy(rejection, analysis, officeActionText);
    strategies[rejection.id] = strategy;
    console.log(`\n   📝 Response Strategy for ${rejection.id}:`);
    strategy.split("\n").forEach((line) => console.log(`   ${line}`));

    if (["103", "112"].includes(rejection.statute)) {
      console.log(`\n   ⏳ Generating claim amendment suggestions...`);
      const amendment = await suggestClaimAmendments(rejection, officeActionText);
      if (amendment) {
        amendments[rejection.id] = amendment;
        console.log(`\n   ✏️  Amendment Suggestions for ${rejection.id}:`);
        amendment.split("\n").forEach((line) => console.log(`   ${line}`));
      }
    }

    console.log();
  }

  // Step 5: Consolidated outline
  console.log("=".repeat(60));
  console.log("⏳ Generating consolidated response outline...\n");
  const outline = await generateResponseOutline(parsed, analyses, strategies);
  console.log("📄 CONSOLIDATED RESPONSE OUTLINE");
  console.log("=".repeat(60));
  console.log(outline);

  console.log("\n" + "=".repeat(60));
  console.log("\n--- Observation ---");
  console.log(
    "The pipeline separates parsing, legal analysis, and strategy generation"
  );
  console.log(
    "into focused steps — each checkable and improvable independently."
  );
  console.log(
    "In production: ingest PDFs via a parser, store outputs to a case management"
  );
  console.log(
    "system, and add a practitioner review gate before any content is used in filings."
  );
}

/* istanbul ignore next */
if (process.env.NODE_ENV !== "test") {
  main().catch(console.error);
}
