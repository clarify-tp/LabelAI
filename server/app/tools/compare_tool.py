"""
app/tools/compare_tool.py
=========================
The compare_products LLM tool — deterministic product comparison.

The LLM calls this tool when comparison is requested.
The tool picks the winner based on scores — the LLM never picks the winner itself.
The LLM only explains WHY the winner is better in the LabelScan AI voice.

Normalisation:
  All nutrition values are converted to per-100g before comparison.
  Comparing a 30g serving vs 200g serving without normalisation is meaningless.
"""

import hashlib


def compare_products(products: list[dict]) -> dict:
    """
    Deterministic product comparison.

    Parameters
    ----------
    products : list of product dicts, each with:
        barcode, product_name, brand, food_pharmer_score,
        nutrition (per-100g values), matched_ingredients,
        claims_on_pack (list of health claims printed on pack)

    Returns
    -------
    dict with:
        winner_barcode, winner_name,
        metric_matrix (per-metric winners),
        ingredient_diff (harmful ingredients unique to each product),
        most_deceptive (product with biggest gap: health claims vs score),
        normalised_products (all values per-100g for UI display)
    """
    if not products or len(products) < 2:
        return {"error": "Need at least 2 products to compare"}

    # ── Normalise all nutrition to per-100g ────────────────────────────────────
    normalised = []
    for p in products:
        n = p.get("nutrition", {})
        normalised.append({
            "barcode":      p.get("barcode", ""),
            "product_name": p.get("product_name", "Unknown"),
            "brand":        p.get("brand", ""),
            "score":        p.get("food_pharmer_score") or 0,
            "sugar_100g":   n.get("sugars_100g") or 0,
            "sodium_100g":  (n.get("sodium_100g") or 0) * 1000,   # g → mg
            "fat_100g":     n.get("fat_100g") or 0,
            "protein_100g": n.get("protein_100g") or 0,
            "harmful_ingredients": [
                i.get("name_english", "")
                for i in (p.get("matched_ingredients") or [])
                if i.get("harm_level", 1) >= 3
            ],
            "claims_on_pack": p.get("claims_on_pack") or [],
        })

    # ── Build metric matrix ────────────────────────────────────────────────────
    metrics = {
        "score":       {"higher_is_better": True,  "label": "LabelScan Score"},
        "sugar_100g":  {"higher_is_better": False, "label": "Sugar per 100g"},
        "sodium_100g": {"higher_is_better": False, "label": "Sodium per 100g"},
        "fat_100g":    {"higher_is_better": False, "label": "Fat per 100g"},
        "protein_100g":{"higher_is_better": True,  "label": "Protein per 100g"},
    }

    metric_matrix = {}
    for metric, cfg in metrics.items():
        values = [{"barcode": p["barcode"], "value": p[metric]} for p in normalised]
        if cfg["higher_is_better"]:
            winner = max(values, key=lambda x: x["value"])
        else:
            winner = min(values, key=lambda x: x["value"])
        metric_matrix[metric] = {
            "label":          cfg["label"],
            "values":         values,
            "winner_barcode": winner["barcode"],
        }

    # ── Overall winner: highest score ──────────────────────────────────────────
    overall_winner = max(normalised, key=lambda p: p["score"])

    # ── Ingredient diff: unique harmful ingredients per product ────────────────
    all_harmful_sets = {
        p["barcode"]: set(p["harmful_ingredients"])
        for p in normalised
    }
    ingredient_diff = {}
    for p in normalised:
        others_harmful = set()
        for bc, s in all_harmful_sets.items():
            if bc != p["barcode"]:
                others_harmful |= s
        unique_to_this = all_harmful_sets[p["barcode"]] - others_harmful
        ingredient_diff[p["barcode"]] = list(unique_to_this)

    # ── Most deceptive: biggest gap between health claims and score ────────────
    # A product claiming "healthy", "nutritious", "natural" but scoring low is deceptive
    HEALTH_KEYWORDS = {"health", "nutritious", "natural", "organic", "protein", "energy", "vitamin"}

    def deception_score(p):
        claims = " ".join(p["claims_on_pack"]).lower()
        has_health_claim = any(kw in claims for kw in HEALTH_KEYWORDS)
        gap = (100 - p["score"]) if has_health_claim else 0
        return gap

    most_deceptive = max(normalised, key=deception_score)
    deception_gap  = deception_score(most_deceptive)

    return {
        "winner_barcode":    overall_winner["barcode"],
        "winner_name":       overall_winner["product_name"],
        "winner_score":      overall_winner["score"],
        "metric_matrix":     metric_matrix,
        "ingredient_diff":   ingredient_diff,
        "most_deceptive":    most_deceptive["barcode"] if deception_gap > 20 else None,
        "most_deceptive_gap": deception_gap,
        "normalised_products": normalised,
        "normalisation_note": "All values shown per 100g for fair comparison",
    }


# ─── JSON Schema for LLM tool calling ────────────────────────────────────────
COMPARE_PRODUCTS_SCHEMA = {
    "type": "function",
    "function": {
        "name": "compare_products",
        "description": (
            "Compare 2-4 food products deterministically. "
            "Call this tool when user asks to compare products. "
            "Do NOT pick a winner yourself — the tool picks it by score."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "products": {
                    "type": "array",
                    "description": "List of product objects to compare",
                    "items": {
                        "type": "object",
                        "properties": {
                            "barcode":            {"type": "string"},
                            "product_name":       {"type": "string"},
                            "brand":              {"type": "string"},
                            "food_pharmer_score": {"type": "integer"},
                            "nutrition":          {"type": "object"},
                            "matched_ingredients":{"type": "array"},
                            "claims_on_pack":     {"type": "array"},
                        },
                    },
                },
            },
            "required": ["products"],
        },
    },
}
