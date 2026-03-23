# Prompt Engineering Showcase

A collection of Node.js scripts demonstrating four foundational prompt engineering techniques using the [Anthropic Claude API](https://docs.anthropic.com/). Each example is self-contained, runnable, and includes inline observations comparing the approach to its baseline.

---

## Techniques Covered

| # | Script | Technique |
|---|--------|-----------|
| 01 | `01-zero-shot-vs-few-shot.js` | Zero-Shot vs. Few-Shot Prompting |
| 02 | `02-chain-of-thought.js` | Chain-of-Thought (CoT) Reasoning |
| 03 | `03-prompt-chaining.js` | Prompt Chaining / Multi-Step Pipelines |
| 04 | `04-system-prompt-and-output-control.js` | System Prompt Design & Structured Output |

---

## Setup

### Prerequisites
- Node.js v18+
- An [Anthropic API key](https://console.anthropic.com/)

### Install

```bash
git clone https://github.com/abeeku23/prompt-engineering-showcase.git
cd prompt-engineering-showcase
npm install
```

### Configure

```bash
cp .env.example .env
# Add your Anthropic API key to .env
```

---

## Running the Examples

Each script can be run individually:

```bash
npm run 01   # Zero-Shot vs. Few-Shot
npm run 02   # Chain-of-Thought
npm run 03   # Prompt Chaining
npm run 04   # System Prompt & Output Control
```

Or directly:

```bash
node 01-zero-shot-vs-few-shot.js
```

---

## What Each Sample Demonstrates

### 01 — Zero-Shot vs. Few-Shot Prompting
Compares a bare instruction (zero-shot) against a prompt with 3 examples (few-shot) for sentiment analysis. Shows how few-shot examples enforce output format and dramatically improve consistency across runs — critical for any downstream parsing or automation.

### 02 — Chain-of-Thought Reasoning
Evaluates a hiring candidate against a job description, first with a direct yes/no prompt, then by instructing the model to reason through each requirement step by step. CoT produces auditable, nuanced decisions that surface partial matches a direct prompt would flatten into a binary call.

### 03 — Prompt Chaining (Multi-Step Pipeline)
Processes a raw article through a 3-step pipeline: topic extraction → outline generation → executive summary. Each step's output feeds the next. Demonstrates how decomposing complex tasks into focused sub-prompts improves reliability and makes individual steps independently debuggable.

### 04 — System Prompt Design & Structured JSON Output
Routes customer support tickets using a weak vs. a strongly engineered system prompt. The strong prompt defines role, constraints, output schema, and decision rules. Result: consistent, machine-parseable JSON across all ticket types — ready for direct API consumption.

---

## Key Takeaways

- **Few-shot > zero-shot** when output format consistency matters
- **Chain-of-thought** improves accuracy on tasks with competing signals or multiple variables
- **Prompt chaining** trades simplicity for modularity — each step is easier to test and improve in isolation
- **System prompt engineering** is where production reliability is built; user-turn prompting alone is rarely sufficient

---

## Author

**Nana Thompson** — Software Engineer & IP Technical Specialist  
[linkedin.com/in/nanathompson](https://www.linkedin.com/in/nanathompson) · [github.com/abeeku23](https://github.com/abeeku23)
