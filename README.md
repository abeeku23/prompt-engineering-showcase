# Prompt Engineering Showcase

A collection of Node.js scripts demonstrating foundational prompt engineering techniques using the [Anthropic Claude API](https://docs.anthropic.com/). Each example is self-contained, runnable, and includes inline observations comparing the approach to its baseline.

---

## Techniques Covered

| # | Script | Technique |
|---|--------|-----------|
| 01 | `01-zero-shot-vs-few-shot.js` | Zero-Shot vs. Few-Shot Prompting |
| 02 | `02-chain-of-thought.js` | Chain-of-Thought (CoT) Reasoning |
| 03 | `03-prompt-chaining.js` | Prompt Chaining / Multi-Step Pipelines |
| 04 | `04-system-prompt-and-output-control.js` | System Prompt Design & Structured Output |
| 05 | `05_office_action_analyzer.js` | Multi-Step Pipeline — Patent Office Action Analyzer |

---

## Setup

### Prerequisites
- Node.js v18+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone the repository

```bash
git clone https://github.com/abeeku23/prompt-engineering-showcase.git
cd prompt-engineering-showcase
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your API key

The scripts read your Anthropic API key from the `ANTHROPIC_API_KEY` environment variable.

**Option A — `.env` file (recommended for local development)**

```bash
# Create a .env file in the project root
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
```

**Option B — inline environment variable**

```bash
ANTHROPIC_API_KEY=sk-ant-... node 01-zero-shot-vs-few-shot.js
```

**Option C — shell export (persists for the current terminal session)**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node 01-zero-shot-vs-few-shot.js
```

> ⚠️ Never commit your `.env` file or API key to version control.
> The `.gitignore` already excludes `.env` for you.

---

## Running the Examples

Each script can be run individually with the provided npm shortcuts:

```bash
npm run 01   # Zero-Shot vs. Few-Shot
npm run 02   # Chain-of-Thought
npm run 03   # Prompt Chaining
npm run 04   # System Prompt & Output Control
npm run 05   # Office Action Analyzer & Response Strategist
```

Or invoke Node directly:

```bash
node 01-zero-shot-vs-few-shot.js
node 02-chain-of-thought.js
node 03-prompt-chaining.js
node 04-system-prompt-and-output-control.js
node 05_office_action_analyzer.js                        # uses the built-in sample
node 05_office_action_analyzer.js path/to/action.txt    # plain-text file
node 05_office_action_analyzer.js path/to/action.pdf    # PDF
node 05_office_action_analyzer.js path/to/action.docx   # Word document
```

> Each script is self-contained and streams its output to the terminal.
> Scripts 03 and 05 run multi-step pipelines and may take 10–30 seconds to complete.

---

## Running the Tests

The test suite uses [Jest](https://jestjs.io/) and mocks all Anthropic API calls — no API key is required.

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run a single test file
npx jest __tests__/05_office_action_analyzer.test.js
```

## What Each Sample Demonstrates

### 01 — Zero-Shot vs. Few-Shot Prompting
Compares a bare instruction (zero-shot) against a prompt with 3 examples (few-shot) for sentiment analysis. Shows how few-shot examples enforce output format and dramatically improve consistency across runs — critical for any downstream parsing or automation.

### 02 — Chain-of-Thought Reasoning
Evaluates a hiring candidate against a job description, first with a direct yes/no prompt, then by instructing the model to reason through each requirement step by step. CoT produces auditable, nuanced decisions that surface partial matches a direct prompt would flatten into a binary call.

### 03 — Prompt Chaining (Multi-Step Pipeline)
Processes a raw article through a 3-step pipeline: topic extraction → outline generation → executive summary. Each step's output feeds the next. Demonstrates how decomposing complex tasks into focused sub-prompts improves reliability and makes individual steps independently debuggable.

### 04 — System Prompt Design & Structured JSON Output
Routes customer support tickets using a weak vs. a strongly engineered system prompt. The strong prompt defines role, constraints, output schema, and decision rules. Result: consistent, machine-parseable JSON across all ticket types — ready for direct API consumption.

### 05 — Office Action Analyzer & Response Strategist
Processes a USPTO patent office action through a 5-step pipeline: parse & classify rejections → analyze each rejection's legal strength → generate a response strategy per rejection → suggest specific claim amendment language (§ 103 and § 112 only) → produce a consolidated response outline for the filing attorney. Accepts a plain-text (`.txt`), PDF (`.pdf`), or Word (`.docx`) file as an optional CLI argument; falls back to a built-in sample when no file is supplied. Demonstrates how a domain-specific system prompt combined with prompt chaining can turn unstructured legal text into actionable prosecution strategy. Reinforces techniques from samples 03 and 04 in a real-world IP context.

---

## Key Takeaways

- **Few-shot > zero-shot** when output format consistency matters
- **Chain-of-thought** improves accuracy on tasks with competing signals or multiple variables
- **Prompt chaining** trades simplicity for modularity — each step is easier to test and improve in isolation
- **System prompt engineering** is where production reliability is built; user-turn prompting alone is rarely sufficient
- **Domain-specific system prompts** unlock expert-level analysis; combining them with multi-step pipelines makes complex professional workflows tractable

---

## Author

**Nana Thompson** — Software Engineer & IP Technical Specialist  
[linkedin.com/in/nanathompson](https://www.linkedin.com/in/nanathompson) · [github.com/abeeku23](https://github.com/abeeku23)
