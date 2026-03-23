"""
Sample 02: Structured Data Extraction from Unstructured Documents
-----------------------------------------------------------------
Demonstrates how to extract consistent, typed, machine-readable
data from messy, unstructured text using Claude.

Compares two approaches:
  - Naive extraction: ask Claude to "pull out the key info"
  - Schema-driven extraction: provide an explicit JSON schema,
    enforce types, and validate the output

Use case: Extracting structured fields from job postings, contracts,
emails, or any document where downstream systems need clean data.
"""

import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── SAMPLE DOCUMENTS ──────────────────────────────────────────────────────
JOB_POSTINGS = [
    """
    We're a fast-growing fintech startup looking for a senior backend engineer to join
    our payments infrastructure team. You'll be working in Python and Go, managing
    services that process over $2B in transactions annually. We need someone with at
    least 6 years of experience, strong knowledge of distributed systems, and ideally
    some exposure to PCI compliance. Salary range is $180k–$220k. This is a hybrid role
    out of our Austin, TX office — 3 days in, 2 remote. We move fast, so expect to ship
    in your first week.
    """,
    """
    Remote | Full Time | New York (preferred timezone)
    Junior Data Analyst — join our growth analytics team. You'll own our funnel
    dashboards, run ad-hoc analyses in SQL and Python, and present weekly to the
    marketing org. 1-2 years of experience preferred. We're offering $70,000 - $85,000
    DOE with full benefits. Must be eligible to work in the US.
    """,
    """
    Contract opportunity, 6 months with potential to extend. Looking for a DevOps /
    Platform engineer to help us migrate from on-prem to AWS. Strong Terraform and
    Kubernetes skills required. Experience with GitOps workflows a plus. Rate: $120-$150/hr.
    Location is fully remote. Start date ASAP.
    """,
]

# ── SCHEMA ────────────────────────────────────────────────────────────────
EXTRACTION_SCHEMA = {
    "role_title": "string",
    "seniority_level": "one of: junior, mid, senior, staff, unknown",
    "employment_type": "one of: full_time, contract, part_time, unknown",
    "location": "string or 'remote'",
    "remote_policy": "one of: remote, hybrid, onsite, unknown",
    "min_years_experience": "integer or null",
    "tech_stack": "array of strings",
    "comp_min": "integer (annual USD) or null",
    "comp_max": "integer (annual USD) or null",
    "comp_type": "one of: salary, hourly, unknown",
    "visa_sponsorship_mentioned": "boolean",
}


def naive_extraction(posting: str) -> str:
    """Extract info without schema guidance."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": f"Extract the key information from this job posting:\n\n{posting.strip()}",
            }
        ],
    )
    return response.content[0].text.strip()


def schema_driven_extraction(posting: str) -> dict:
    """Extract info using an explicit schema, return parsed JSON."""
    schema_str = json.dumps(EXTRACTION_SCHEMA, indent=2)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=400,
        system=(
            "You are a data extraction engine. You MUST respond with a single valid JSON object only. "
            "No markdown, no preamble, no explanation. Only the JSON object."
        ),
        messages=[
            {
                "role": "user",
                "content": (
                    f"Extract structured data from the job posting below. "
                    f"Use exactly this schema:\n{schema_str}\n\n"
                    f"Rules:\n"
                    f"- If a field cannot be determined, use null for numbers and 'unknown' for enums\n"
                    f"- For hourly rates, convert to annual equivalent (rate * 2080) for comp fields\n"
                    f"- comp_min and comp_max should always be annual USD integers or null\n\n"
                    f"Job Posting:\n{posting.strip()}"
                ),
            }
        ],
    )

    raw = response.content[0].text.strip()
    try:
        return {"success": True, "data": json.loads(raw)}
    except json.JSONDecodeError:
        return {"success": False, "raw": raw}


# ── MAIN ──────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("STRUCTURED DATA EXTRACTION FROM UNSTRUCTURED DOCUMENTS")
    print("=" * 60)

    for i, posting in enumerate(JOB_POSTINGS, 1):
        print(f"\n{'─' * 60}")
        print(f"POSTING {i}:")
        print(posting.strip())

        print("\n-- Naive Extraction --")
        naive = naive_extraction(posting)
        print(naive)

        print("\n-- Schema-Driven Extraction --")
        result = schema_driven_extraction(posting)
        if result["success"]:
            print(json.dumps(result["data"], indent=2))
        else:
            print(f"⚠️  Parse failed: {result['raw']}")

    print(f"\n{'─' * 60}")
    print("\n--- Observation ---")
    print("Schema-driven extraction produces consistent, typed, parseable records.")
    print("Naive extraction is readable but varies in structure — unusable in pipelines.")
    print("The annual comp normalization (hourly → annual) shows how schema prompts")
    print("can encode business logic, not just field names.")


if __name__ == "__main__":
    main()
