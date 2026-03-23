"""
Sample 01: Multi-Document Summarization Pipeline
-------------------------------------------------
Demonstrates how to process multiple documents through a tiered
summarization pipeline:
  - Level 1: Per-document summaries (focused, concise)
  - Level 2: Cross-document synthesis (themes, contradictions, gaps)
  - Level 3: Executive brief (audience-aware, decision-ready)

Use case: A researcher or analyst who needs to distill a large
set of reports or articles into a single actionable brief.
"""

import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── SAMPLE DOCUMENTS ──────────────────────────────────────────────────────
DOCUMENTS = [
    {
        "title": "Q3 Market Report — EV Sector",
        "content": """
        Electric vehicle adoption accelerated in Q3, with global sales up 34% year-over-year.
        North America saw its strongest quarter on record, driven by expanded charging
        infrastructure and new model launches from legacy automakers. However, supply chain
        constraints for battery-grade lithium remain a persistent bottleneck, and several
        manufacturers have flagged margin compression heading into Q4. Consumer sentiment
        surveys indicate range anxiety is declining but purchase price remains the primary
        barrier for mass-market adoption.
        """,
    },
    {
        "title": "Analyst Note — Battery Technology Outlook",
        "content": """
        Solid-state battery commercialization timelines are slipping. Three of the five
        leading developers have pushed pilot production targets from 2025 to 2026-2027.
        The core challenge remains ionic conductivity at room temperature. Meanwhile,
        incremental improvements to lithium-iron-phosphate (LFP) chemistry are delivering
        near-term cost reductions that may reduce urgency for solid-state adoption in the
        budget EV segment. Premium OEMs remain committed to solid-state as a differentiator.
        """,
    },
    {
        "title": "Policy Brief — Federal EV Incentives Review",
        "content": """
        The current federal tax credit structure has driven purchase intent among higher-income
        households but has had limited impact on sub-$35,000 vehicles, where the credit
        phases out or does not apply. Legislative proposals under review would shift the
        incentive to point-of-sale rebates and expand eligibility to used EVs. Automakers
        and dealers are lobbying for domestic content flexibility, arguing that current
        sourcing requirements disadvantage US assemblers relative to imports from free-trade
        partners. A final rule is expected by Q1 of next year.
        """,
    },
]


def summarize_document(doc: dict) -> str:
    """Level 1: Summarize a single document."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Summarize the following document in 3-4 sentences. "
                    f"Focus on the most important facts and findings. "
                    f"Do not editorialize.\n\n"
                    f"Document: {doc['title']}\n{doc['content'].strip()}"
                ),
            }
        ],
    )
    return response.content[0].text.strip()


def synthesize_summaries(summaries: list[dict]) -> str:
    """Level 2: Cross-document synthesis."""
    formatted = "\n\n".join(
        f"Document: {s['title']}\nSummary: {s['summary']}" for s in summaries
    )
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=400,
        messages=[
            {
                "role": "user",
                "content": (
                    "You are a research analyst. Given the summaries below, identify:\n"
                    "1. Common themes across documents\n"
                    "2. Any contradictions or tensions between documents\n"
                    "3. Key gaps or unanswered questions\n\n"
                    f"{formatted}"
                ),
            }
        ],
    )
    return response.content[0].text.strip()


def write_executive_brief(synthesis: str, audience: str = "C-suite") -> str:
    """Level 3: Write audience-targeted executive brief."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=400,
        messages=[
            {
                "role": "user",
                "content": (
                    f"You are writing for a {audience} audience. "
                    f"Using the synthesis below, write a 150-word executive brief. "
                    f"Lead with the most important insight. Use plain language. "
                    f"End with one clear recommendation or watch item.\n\n"
                    f"Synthesis:\n{synthesis}"
                ),
            }
        ],
    )
    return response.content[0].text.strip()


# ── MAIN ──────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("MULTI-DOCUMENT SUMMARIZATION PIPELINE")
    print("=" * 60)

    # Level 1: Per-document summaries
    print("\n⏳ Level 1: Summarizing individual documents...\n")
    summaries = []
    for doc in DOCUMENTS:
        summary = summarize_document(doc)
        summaries.append({"title": doc["title"], "summary": summary})
        print(f"📄 {doc['title']}")
        print(f"   {summary}\n")

    # Level 2: Cross-document synthesis
    print("⏳ Level 2: Synthesizing across documents...\n")
    synthesis = synthesize_summaries(summaries)
    print("🔗 Cross-Document Synthesis:")
    print(synthesis)

    # Level 3: Executive brief
    print("\n⏳ Level 3: Writing executive brief...\n")
    brief = write_executive_brief(synthesis)
    print("📊 Executive Brief:")
    print(brief)

    print("\n--- Observation ---")
    print("Tiered summarization preserves document-level detail while")
    print("producing a synthesis and brief no single-pass prompt could reliably achieve.")


if __name__ == "__main__":
    main()
