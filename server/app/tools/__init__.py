"""
app/tools/__init__.py
=====================
LLM tool definitions used for function calling via Groq API.

Tools:
  calculate_food_score  — deterministic LabelScan Score (0-100)
  compare_products      — deterministic product comparison with winner
  calculate_bmi         — BMI using Indian ICMR thresholds

The LLM decides WHEN to call a tool and WHAT inputs to pass.
The actual computation always runs in Python — never in the LLM.
This prevents hallucination of any numerical values.
"""
from app.tools.score_engine  import calculate_food_score,  CALCULATE_FOOD_SCORE_SCHEMA
from app.tools.compare_tool  import compare_products,       COMPARE_PRODUCTS_SCHEMA
from app.tools.bmi_tool      import calculate_bmi,          CALCULATE_BMI_SCHEMA

__all__ = [
    "calculate_food_score",  "CALCULATE_FOOD_SCORE_SCHEMA",
    "compare_products",      "COMPARE_PRODUCTS_SCHEMA",
    "calculate_bmi",         "CALCULATE_BMI_SCHEMA",
]
