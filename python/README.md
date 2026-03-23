# AI Python Showcase

A collection of Python scripts demonstrating practical AI engineering patterns using the [Anthropic Claude API](https://docs.anthropic.com/). Each sample is self-contained, runnable, and built around a real-world use case.

---

## Projects

| # | Script | Theme | Description |
|---|--------|-------|-------------|
| 01 | `01_document_summarization_pipeline.py` | Document Processing | Tiered multi-doc summarization → executive brief |
| 02 | `02_structured_data_extraction.py` | Document Processing | Schema-driven extraction from unstructured text |
| 03 | `03_data_analysis_assistant.py` | Data Analysis | Natural language insights from CSV data via pandas |
| 04 | `04_visualization_code_generator.py` | Data Visualization | Generate & execute matplotlib code from plain English |
| 05 | `05_tool_use_agent.py` | Agent / Tool Use | Agentic loop with custom tools for grounded answers |

---

## Setup

### Prerequisites
- Python 3.10+
- An [Anthropic API key](https://console.anthropic.com/)

### Install

```bash
git clone https://github.com/abeeku23/prompt-engineering-showcase.git
cd prompt-engineering-showcase/python
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Configure

```bash
cp .env.example .env
# Add your Anthropic API key to .env
```

---

## Running the Samples

```bash
python 01_document_summarization_pipeline.py
python 02_structured_data_extraction.py
python 03_data_analysis_assistant.py
python 04_visualization_code_generator.py   # outputs charts/ directory
python 05_tool_use_agent.py
```

---

## What Each Sample Demonstrates

### 01 — Multi-Document Summarization Pipeline
Processes a set of documents through three levels: per-document summaries → cross-document synthesis (themes, contradictions, gaps) → audience-targeted executive brief. Shows how tiered prompting produces outputs that no single-pass "summarize everything" prompt can reliably match.

### 02 — Structured Data Extraction
Compares naive extraction ("pull out the key info") against schema-driven extraction with explicit JSON output requirements. Shows how a well-defined schema enforces typed, consistent, machine-parseable records — and how business logic (e.g., normalizing hourly rates to annual equivalents) can be embedded directly in the prompt.

### 03 — CSV Data Analysis Assistant
Pairs pandas for computation with Claude for interpretation. Loads a dataset, generates descriptive statistics and group summaries, then asks Claude to surface the top insights, flag anomalies, and recommend follow-up analyses. Swap in any CSV file to use with your own data.

### 04 — Chart & Visualization Code Generator
Accepts a natural language visualization request and a dataset profile, then generates executable matplotlib code, runs it, saves the chart, and provides an interpretation of what the chart reveals. Demonstrates a generate → execute → interpret pattern that can be extended with retry logic for production use.

### 05 — Tool-Use Agent
Builds a full agentic loop using Claude's native tool-use capability. The agent has access to a calculator, a company data lookup, a text summarizer, and a date tool. It autonomously decides which tools to call, in what order, and when it has enough information to answer — without hallucinating facts or doing math in its head.

---

## Key Patterns

| Pattern | Where Used |
|---------|-----------|
| Tiered / chained prompts | 01, 04 |
| Schema-enforced JSON output | 02, 03 |
| pandas + LLM separation of concerns | 03, 04 |
| Code generation + execution | 04 |
| Agentic tool-use loop | 05 |
| System prompt role definition | 02, 04 |

---

## Author

**Nana Thompson** — Software Engineer & IP Technical Specialist  
[linkedin.com/in/nanathompson](https://www.linkedin.com/in/nanathompson) · [github.com/abeeku23](https://github.com/abeeku23)
