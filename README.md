# Prompt Engineering Showcase

A collection of AI/LLM prompt engineering examples split into two self-contained sub-projects — one in **Node.js** and one in **Python** — both using the [Anthropic Claude API](https://docs.anthropic.com/).

```
prompt-engineering-showcase/
├── node/      ← Node.js examples (prompt techniques, Jest tests)
└── python/    ← Python examples (data pipelines, tool-use agents)
```

---

## Sub-projects

### [`node/`](./node/README.md) — Node.js Prompt Engineering Showcase

Five self-contained scripts demonstrating foundational prompt engineering techniques:

| # | Script | Technique |
|---|--------|-----------|
| 01 | `01-zero-shot-vs-few-shot.js` | Zero-Shot vs. Few-Shot Prompting |
| 02 | `02-chain-of-thought.js` | Chain-of-Thought (CoT) Reasoning |
| 03 | `03-prompt-chaining.js` | Prompt Chaining / Multi-Step Pipelines |
| 04 | `04-system-prompt-and-output-control.js` | System Prompt Design & Structured Output |
| 05 | `05_office_action_analyzer.js` | Multi-Step Pipeline — Patent Office Action Analyzer |

**Quick start:**

```bash
cd node
npm install
# Add ANTHROPIC_API_KEY to a .env file
npm run 01   # run any example
npm test     # run all tests (no API key needed)
```

See [`node/README.md`](./node/README.md) for full setup instructions and per-example descriptions.

---

### [`python/`](./python/README.md) — Python AI Showcase

Five self-contained scripts demonstrating practical AI engineering patterns:

| # | Script | Theme |
|---|--------|-------|
| 01 | `01_document_summarization_pipeline.py` | Document Processing |
| 02 | `02_structured_data_extraction.py` | Structured Data Extraction |
| 03 | `03_data_analysis_assistant.py` | Data Analysis with pandas |
| 04 | `04_visualization_code_generator.py` | Chart Code Generation |
| 05 | `05_tool_use_agent.py` | Agentic Tool-Use Loop |

**Quick start:**

```bash
cd python
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # add your ANTHROPIC_API_KEY
python 01_document_summarization_pipeline.py
```

See [`python/README.md`](./python/README.md) for full setup instructions and per-example descriptions.

---

## Key Takeaways

- **Few-shot > zero-shot** when output format consistency matters
- **Chain-of-thought** improves accuracy on tasks with competing signals or multiple variables
- **Prompt chaining** trades simplicity for modularity — each step is easier to test and improve in isolation
- **System prompt engineering** is where production reliability is built; user-turn prompting alone is rarely sufficient
- **Domain-specific system prompts** unlock expert-level analysis; combining them with multi-step pipelines makes complex professional workflows tractable
- **Agentic tool-use loops** let models autonomously decide which tools to call and when to stop — without hallucinating facts

---

## Author

**Nana Thompson** — Software Engineer & IP Technical Specialist  
[linkedin.com/in/nanathompson](https://www.linkedin.com/in/nanathompson) · [github.com/abeeku23](https://github.com/abeeku23)
