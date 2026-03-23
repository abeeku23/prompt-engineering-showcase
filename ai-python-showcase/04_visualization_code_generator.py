"""
Sample 04: Chart & Visualization Code Generator
------------------------------------------------
Demonstrates how to use Claude to generate matplotlib visualization
code from a natural language description and a dataset profile.

Workflow:
  1. Describe your data and what you want to visualize
  2. Claude recommends the best chart type and generates Python code
  3. The generated code is validated and executed to produce an image
  4. Claude explains what the chart reveals

Use case: Analysts or stakeholders who know what question they want
to answer but don't want to write boilerplate matplotlib code.
"""

import anthropic
import os
import pandas as pd
import io
import matplotlib
matplotlib.use("Agg")  # non-interactive backend for script execution
import matplotlib.pyplot as plt
import traceback
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── SAMPLE DATA ───────────────────────────────────────────────────────────
SAMPLE_CSV = """region,product,q1_revenue,q2_revenue,q3_revenue,q4_revenue,return_rate,satisfaction
Northeast,Widget A,48000,54000,56000,52000,0.03,4.2
Southeast,Widget A,32000,30400,32800,28000,0.11,3.3
West,Widget B,126000,138000,147000,156000,0.015,4.8
Midwest,Widget B,57000,66000,75000,84000,0.03,4.4
Southwest,Widget A,41000,43000,45000,44000,0.04,4.0
Northwest,Widget B,98000,105000,112000,119000,0.02,4.6
"""

VISUALIZATION_REQUESTS = [
    "Show quarterly revenue trends by region as a line chart",
    "Compare return rates vs customer satisfaction across regions as a scatter plot",
]


def get_data_profile(df: pd.DataFrame) -> str:
    """Generate a concise data profile to pass to Claude."""
    profile = {
        "columns": df.columns.tolist(),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "shape": list(df.shape),
        "sample": df.head(3).to_dict(orient="records"),
        "numeric_ranges": df.select_dtypes(include="number").agg(["min", "max"]).round(2).to_dict(),
    }
    return str(profile)


def generate_chart_code(df_profile: str, request: str) -> str:
    """Ask Claude to generate matplotlib code for the visualization."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        system=(
            "You are an expert data visualization engineer. "
            "When asked to create a chart, respond ONLY with executable Python code. "
            "No explanation, no markdown code fences, no preamble. Just the raw Python code.\n\n"
            "Rules for the code you generate:\n"
            "- The dataframe is already loaded as `df` — do not re-load or re-define it\n"
            "- Use matplotlib only (no seaborn, no plotly)\n"
            "- Use plt.style.use('seaborn-v0_8-whitegrid') for clean styling\n"
            "- Always set a title, axis labels, and a legend if multiple series\n"
            "- Save the figure to 'output_chart.png' using plt.savefig('output_chart.png', bbox_inches='tight', dpi=150)\n"
            "- Call plt.close() at the end\n"
            "- Do NOT call plt.show()"
        ),
        messages=[
            {
                "role": "user",
                "content": (
                    f"Dataset profile:\n{df_profile}\n\n"
                    f"Visualization request: {request}"
                ),
            }
        ],
    )
    return response.content[0].text.strip()


def execute_chart_code(code: str, df: pd.DataFrame, output_path: str) -> dict:
    """Execute generated code in a controlled namespace."""
    namespace = {"df": df, "plt": plt, "pd": pd}
    # Redirect save path to our output location
    code = code.replace("'output_chart.png'", f"'{output_path}'")
    code = code.replace('"output_chart.png"', f'"{output_path}"')
    try:
        exec(code, namespace)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}


def interpret_chart(request: str, df_profile: str) -> str:
    """Ask Claude what the chart should reveal."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=200,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Given this dataset:\n{df_profile}\n\n"
                    f"A chart was created for: '{request}'\n\n"
                    "In 2-3 sentences, describe what key insight this chart is likely to reveal "
                    "and what a viewer should look for."
                ),
            }
        ],
    )
    return response.content[0].text.strip()


# ── MAIN ──────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("CHART & VISUALIZATION CODE GENERATOR")
    print("=" * 60)

    df = pd.read_csv(io.StringIO(SAMPLE_CSV))
    df_profile = get_data_profile(df)

    output_dir = "charts"
    os.makedirs(output_dir, exist_ok=True)

    for i, request in enumerate(VISUALIZATION_REQUESTS, 1):
        print(f"\n{'─' * 60}")
        print(f"Request {i}: \"{request}\"")

        print("\n⏳ Generating visualization code...")
        code = generate_chart_code(df_profile, request)
        print("\n📝 Generated Code:")
        print(code)

        output_path = os.path.join(output_dir, f"chart_{i:02d}.png")
        print(f"\n⏳ Executing code → {output_path}")
        result = execute_chart_code(code, df.copy(), output_path)

        if result["success"]:
            print(f"✅ Chart saved to {output_path}")
        else:
            print(f"⚠️  Execution error: {result['error']}")

        print("\n🔍 Chart Interpretation:")
        interpretation = interpret_chart(request, df_profile)
        print(interpretation)

    print(f"\n{'─' * 60}")
    print("\n--- Observation ---")
    print("Claude generates boilerplate-free, executable visualization code on demand.")
    print("The interpret step closes the loop — turning a chart into an insight.")
    print("In production, add a retry loop around execute_chart_code to self-heal errors.")


if __name__ == "__main__":
    main()
