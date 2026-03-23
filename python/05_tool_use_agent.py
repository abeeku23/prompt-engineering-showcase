"""
Sample 05: Tool-Use Agent with Custom Tools
--------------------------------------------
Demonstrates Claude's native tool-use (function calling) capability
to build an agent that can answer multi-step questions by invoking
custom tools rather than hallucinating answers.

Tools defined:
  - calculator       : performs arithmetic operations
  - get_company_data : looks up mock company financial data
  - summarize_text   : recursively summarizes long text via Claude
  - get_today_date   : returns today's date

The agent loop:
  1. User asks a question
  2. Claude decides which tool(s) to call
  3. Tools execute and return results
  4. Claude synthesizes a final answer
  5. Loop continues until Claude signals it is done

Use case: Any scenario where reliable factual answers require
grounding in real data rather than model memory alone.
"""

import anthropic
import os
import json
import datetime
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── MOCK DATA ─────────────────────────────────────────────────────────────
COMPANY_DB = {
    "ACME Corp": {
        "revenue_2023": 4_200_000,
        "revenue_2024": 5_100_000,
        "employees": 312,
        "industry": "Manufacturing",
        "founded": 1998,
    },
    "Brightline AI": {
        "revenue_2023": 890_000,
        "revenue_2024": 2_300_000,
        "employees": 47,
        "industry": "Artificial Intelligence",
        "founded": 2021,
    },
    "Coastal Logistics": {
        "revenue_2023": 12_500_000,
        "revenue_2024": 11_800_000,
        "employees": 880,
        "industry": "Logistics",
        "founded": 1985,
    },
}

# ── TOOL DEFINITIONS (passed to Claude) ──────────────────────────────────
TOOLS = [
    {
        "name": "calculator",
        "description": (
            "Performs arithmetic calculations. Use this for any math: "
            "percentages, growth rates, totals, ratios."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "A valid Python arithmetic expression, e.g. '(5100000 - 4200000) / 4200000 * 100'",
                }
            },
            "required": ["expression"],
        },
    },
    {
        "name": "get_company_data",
        "description": "Retrieves financial and company data for a given company name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": "The exact company name to look up",
                }
            },
            "required": ["company_name"],
        },
    },
    {
        "name": "summarize_text",
        "description": "Summarizes a long piece of text into a concise paragraph.",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "The text to summarize"},
                "max_sentences": {
                    "type": "integer",
                    "description": "Target number of sentences for the summary",
                    "default": 3,
                },
            },
            "required": ["text"],
        },
    },
    {
        "name": "get_today_date",
        "description": "Returns today's date. Use when the question involves current date or time.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]


# ── TOOL IMPLEMENTATIONS ──────────────────────────────────────────────────
def run_tool(tool_name: str, tool_input: dict) -> str:
    if tool_name == "calculator":
        try:
            result = eval(tool_input["expression"], {"__builtins__": {}})
            return str(round(result, 4))
        except Exception as e:
            return f"Error: {e}"

    elif tool_name == "get_company_data":
        name = tool_input["company_name"]
        data = COMPANY_DB.get(name)
        if data:
            return json.dumps(data)
        available = list(COMPANY_DB.keys())
        return f"Company not found. Available companies: {available}"

    elif tool_name == "summarize_text":
        text = tool_input["text"]
        max_sentences = tool_input.get("max_sentences", 3)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": f"Summarize in {max_sentences} sentences:\n\n{text}",
                }
            ],
        )
        return response.content[0].text.strip()

    elif tool_name == "get_today_date":
        return datetime.date.today().isoformat()

    return f"Unknown tool: {tool_name}"


# ── AGENT LOOP ────────────────────────────────────────────────────────────
def run_agent(user_question: str, verbose: bool = True) -> str:
    """Run the agentic loop until Claude produces a final answer."""
    messages = [{"role": "user", "content": user_question}]

    if verbose:
        print(f"\n🧑 User: {user_question}")

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            tools=TOOLS,
            messages=messages,
        )

        # Append Claude's response to the conversation
        messages.append({"role": "assistant", "content": response.content})

        # If Claude is done (no more tool calls), return the final text
        if response.stop_reason == "end_turn":
            final = next(
                (b.text for b in response.content if hasattr(b, "text")), ""
            )
            if verbose:
                print(f"\n🤖 Final Answer: {final}")
            return final

        # Process tool calls
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                if verbose:
                    print(f"\n🔧 Tool Call: {block.name}({json.dumps(block.input)})")
                result = run_tool(block.name, block.input)
                if verbose:
                    print(f"   ↳ Result: {result}")
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        # Feed tool results back to Claude
        messages.append({"role": "user", "content": tool_results})


# ── SAMPLE QUESTIONS ──────────────────────────────────────────────────────
QUESTIONS = [
    "What was the revenue growth rate for ACME Corp from 2023 to 2024?",
    "Which of our tracked companies had the highest revenue per employee in 2024? Show your calculations.",
    "Today is my deadline — what date is it, and which company was founded most recently?",
]


# ── MAIN ──────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("TOOL-USE AGENT WITH CUSTOM TOOLS")
    print("=" * 60)
    print(f"\nAvailable tools: {', '.join(t['name'] for t in TOOLS)}")
    print(f"Available companies: {', '.join(COMPANY_DB.keys())}")

    for question in QUESTIONS:
        print(f"\n{'=' * 60}")
        run_agent(question, verbose=True)

    print(f"\n{'=' * 60}")
    print("\n--- Observation ---")
    print("Claude decides which tools to call, in what order, and when it has enough")
    print("information to answer. It never invents numbers — it calls tools for facts")
    print("and uses the calculator for math. This is the foundation of reliable agents.")


if __name__ == "__main__":
    main()
