"""
app/services/nutrition_fallback.py
==================================
Fallback nutrition lookup via the USDA FoodData Central API.
Used when OCR returns no nutrition data at all (label cut off / not visible).

Free tier: 3600 requests/hour with a key, or 30 req/day with DEMO_KEY (no signup).
Get a free key (instant, no credit card): https://fdc.nal.usda.gov/api-guide.html
"""

import os
import requests

USDA_API_KEY = os.getenv("USDA_API_KEY", "DEMO_KEY")
USDA_SEARCH  = "https://api.nal.usda.gov/fdc/v1/foods/search"


def lookup_nutrition_by_name(product_name: str, brand: str = "") -> dict | None:
    """
    Search USDA for a product and return approximate per-100g nutrition.
    Returns None if there is no usable query, no match, or the API fails.
    """
    query = f"{brand} {product_name}".strip()
    if not query:
        return None
    try:
        resp = requests.get(
            USDA_SEARCH,
            params={
                "query":    query,
                "api_key":  USDA_API_KEY,
                "pageSize": 1,
                "dataType": ["Branded", "Survey (FNDDS)"],
            },
            timeout=5,
        )
        foods = resp.json().get("foods", [])
        if not foods:
            return None
        nutrients = {
            n.get("nutrientName"): n.get("value")
            for n in foods[0].get("foodNutrients", [])
        }
        result = {
            "energy_kcal": nutrients.get("Energy"),
            "protein_g":   nutrients.get("Protein"),
            "fat_g":       nutrients.get("Total lipid (fat)"),
            "sugar_g":     nutrients.get("Sugars, total including NLEA"),
            "sodium_g":    (nutrients.get("Sodium, Na") or 0) / 1000,
            "fiber_g":     nutrients.get("Fiber, total dietary"),
            "source":      "usda_fallback",
        }
        # Only return if at least one real value was found
        if any(v for k, v in result.items() if k != "source"):
            return result
        return None
    except Exception:
        return None
