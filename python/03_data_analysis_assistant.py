"""
Sample 03: CSV Data Analysis Assistant
---------------------------------------
Demonstrates how to pair pandas with Claude to create a natural
language data analysis assistant. The script:
  1. Loads a CSV (or generates sample data if none provided)
  2. Computes descriptive statistics via pandas
  3. Passes the stats + a sample of the data to Claude
  4. Lets Claude generate natural language insights and flag anomalies
  5. Suggests follow-up questions the analyst should explore

Use case: Quickly surface insights from a dataset without writing
custom analysis code — useful for stakeholder briefings or exploratory
data analysis handoffs.
"""

import anthropic
import os
import pandas as pd
import io
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── SAMPLE DATA (replace with pd.read_csv("your_file.csv")) ───────────────
SAMPLE_CSV = """date,region,product,units_sold,revenue,return_rate,customer_satisfaction
2024-01-01,Northeast,Widget A,1200,48000,0.03,4.2
2024-01-01,Southeast,Widget A,800,32000,0.05,3.9
2024-01-01,West,Widget B,2100,126000,0.02,4.7
2024-01-01,Midwest,Widget B,950,57000,0.04,4.1
2024-02-01,Northeast,Widget A,1350,54000,0.03,4.3
2024-02-01,Southeast,Widget A,760,30400,0.08,3.5
2024-02-01,West,Widget B,2300,138000,0.01,4.8
2024-02-01,Midwest,Widget B,1100,66000,0.03,4.4
2024-03-01,Northeast,Widget A,1400,56000,0.02,4.4
2024-03-01,Southeast,Widget A,820,32800,0.12,3.1
2024-03-01,West,Widget B,2450,147000,0.02,4.9
2024-03-01,Midwest,Widget B,1250,75000,0.03,4.5
2024-04-01,Northeast,Widget A,1300,52000,0.03,4.2
2024-04-01,Southeast,Widget A,700,28000,0.15,2.9
2024-04-01,West,Widget B,2600,156000,0.01,4.9
2024-04-01,Midwest,Widget B,1400,84000,0.02,4.6
"""


def load_data() -> pd.DataFrame:
    return pd.read_csv(io.StringIO(SAMPLE_CSV), parse_dates=["date"])


def compute_stats(df: pd.DataFrame) -> dict:
    """Generate a rich statistical profile of the dataframe."""
    numeric_cols = df.select_dtypes(include="number").columns.tolist()

    stats = {
        "shape": {"rows": len(df), "columns": len(df.columns)},
        "columns": df.columns.tolist(),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "descriptive_stats": df[numeric_cols].describe().round(2).to_dict(),
        "missing_values": df.isnull().sum().to_dict(),
        "sample_rows": df.head(4).to_dict(orient="records"),
    }

    # Add group-level aggregations if categorical columns exist
    cat_cols = df.select_dtypes(include="object").columns.tolist()
    if cat_cols and numeric_cols:
        group_col = cat_cols[0]
        stats["group_summary"] = (
            df.groupby(group_col)[numeric_cols].mean().round(2).to_dict()
        )

    return stats


def analyze_with_claude(stats: dict, user_question: str = None) -> str:
    """Ask Claude to generate insights from computed statistics."""
    stats_str = str(stats)
    base_prompt = (
        "You are a senior data analyst. You have been given statistical summaries "
        "of a dataset. Your job is to:\n"
        "1. Identify the 3 most important insights from the data\n"
        "2. Flag any anomalies, outliers, or trends that warrant attention\n"
        "3. Suggest 3 follow-up analyses the team should run next\n\n"
        "Be specific. Reference actual numbers from the stats. "
        "Write for a business audience — no jargon.\n\n"
        f"Dataset Statistics:\n{stats_str}"
    )

    if user_question:
        base_prompt += f"\n\nAlso answer this specific question: {user_question}"

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=600,
        messages=[{"role": "user", "content": base_prompt}],
    )
    return response.content[0].text.strip()


def trend_analysis(df: pd.DataFrame) -> str:
    """Ask Claude to identify trends over time."""
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    time_series = (
        df.groupby("date")[numeric_cols].sum().reset_index().to_dict(orient="records")
    )

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=400,
        messages=[
            {
                "role": "user",
                "content": (
                    "Analyze the trend in this time series data. "
                    "Identify growth rates, inflection points, and any concerning patterns. "
                    "Be specific with numbers.\n\n"
                    f"Time Series Data:\n{time_series}"
                ),
            }
        ],
    )
    return response.content[0].text.strip()


# ── MAIN ──────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("CSV DATA ANALYSIS ASSISTANT")
    print("=" * 60)

    df = load_data()
    print(f"\n✅ Data loaded: {df.shape[0]} rows × {df.shape[1]} columns")
    print(f"   Columns: {', '.join(df.columns.tolist())}\n")

    stats = compute_stats(df)

    print("⏳ Generating insights...\n")
    insights = analyze_with_claude(
        stats,
        user_question="Which region should we be most concerned about and why?"
    )
    print("📊 AI Insights:")
    print(insights)

    print("\n⏳ Running trend analysis...\n")
    trends = trend_analysis(df)
    print("📈 Trend Analysis:")
    print(trends)

    print("\n--- Observation ---")
    print("pandas handles the computation; Claude handles interpretation.")
    print("This separation keeps analysis reproducible while making insights accessible.")
    print("Swap SAMPLE_CSV for pd.read_csv('your_file.csv') to use your own data.")


if __name__ == "__main__":
    main()
