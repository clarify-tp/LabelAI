"""
app/tools/bmi_tool.py
=====================
The calculate_bmi LLM tool.

Uses Indian ICMR thresholds (overweight >= 23, obese >= 25)
NOT Western WHO thresholds (overweight >= 25, obese >= 30).

This is a hard product requirement — Indians face higher metabolic
disease risk at lower BMI values than Western populations.
ICMR specifically recommends these lower cut-offs.
"""


def calculate_bmi(height_cm: float, weight_kg: float) -> dict:
    """
    Calculate BMI using Indian ICMR thresholds.

    Returns BMI value, WHO category, and Indian ICMR category.
    """
    height_cm = float(height_cm)
    weight_kg = float(weight_kg)
    if not height_cm or not weight_kg or height_cm <= 0 or weight_kg <= 0:
        return {"error": "Invalid height or weight values"}

    height_m = height_cm / 100.0
    bmi = round(weight_kg / (height_m ** 2), 1)

    # WHO thresholds (for reference only — not used for advice)
    who_category = (
        "Underweight" if bmi < 18.5
        else "Normal weight" if bmi < 25
        else "Overweight" if bmi < 30
        else "Obese"
    )

    # Indian ICMR thresholds (used for all advice in this app)
    indian_category = (
        "Underweight" if bmi < 18.5
        else "Normal" if bmi < 23
        else "Overweight" if bmi < 25
        else "Obese"
    )

    # Health risk based on Indian thresholds
    risk_level = (
        "Low" if bmi < 18.5
        else "Normal" if bmi < 23
        else "Moderate" if bmi < 25
        else "High" if bmi < 30
        else "Very High"
    )

    return {
        "bmi":             bmi,
        "who_category":    who_category,
        "indian_category": indian_category,
        "risk_level":      risk_level,
        "note": (
            "Indian ICMR thresholds used (overweight ≥23, obese ≥25). "
            "These are lower than Western WHO thresholds because Indians "
            "face higher metabolic risk at lower BMI values."
        ),
    }


# ─── JSON Schema for LLM tool calling ────────────────────────────────────────
CALCULATE_BMI_SCHEMA = {
    "type": "function",
    "function": {
        "name": "calculate_bmi",
        "description": (
            "Calculate BMI using Indian ICMR thresholds. "
            "Call this when user asks about BMI or weight status. "
            "Never compute BMI yourself."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "height_cm": {"type": "number", "description": "Height in centimetres"},
                "weight_kg": {"type": "number", "description": "Weight in kilograms"},
            },
            "required": ["height_cm", "weight_kg"],
        },
    },
}
