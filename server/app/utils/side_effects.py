"""
app/utils/side_effects.py
=========================
Side effect lookup — only CONFIRMED and PROBABLE effects are shown.
POSSIBLE (animal studies only) are used internally for scoring but never displayed.
Each effect must have a source URL the user can verify.

Cross-ingredient interaction rules:
  E211 + E300 (sodium benzoate + vitamin C) → benzene formation
  E621 + E627 (MSG + disodium guanylate)    → amplified sensitivity
"""

import json

INTERACTION_RULES = [
    {
        "ingredients": {"211", "300"},
        "warning": "This product contains both Sodium Benzoate (E211) and Vitamin C (E300). Together they can form benzene, a known carcinogen. This combination is common in fruit-flavoured drinks.",
        "evidence_level": "CONFIRMED",
        "source": "FDA 2006; PMID 16929236",
    },
    {
        "ingredients": {"621", "627"},
        "warning": "MSG (E621) and Disodium Guanylate (E627) together multiply the flavour-enhancing effect. People sensitive to MSG will have stronger reactions.",
        "evidence_level": "CONFIRMED",
        "source": "EFSA 2017 MSG re-evaluation",
    },
]


def get_side_effects(matched_ingredients: list[dict]) -> list[dict]:
    """
    Return confirmed/probable side effects from matched ingredients
    + any cross-ingredient interaction warnings.
    """
    effects = []
    present_ins = {i.get("ins_no", "") for i in matched_ingredients}

    for ing in matched_ingredients:
        raw_se = ing.get("side_effects")
        if not raw_se:
            continue
        if isinstance(raw_se, str):
            try:
                raw_se = json.loads(raw_se)
            except Exception:
                continue
        for se in (raw_se or []):
            if se.get("evidence_level") in ("CONFIRMED", "PROBABLE"):
                effects.append({
                    "ingredient":     ing.get("name_english", ""),
                    "effect":         se.get("effect", ""),
                    "condition":      se.get("condition", ""),
                    "population":     se.get("population", "All consumers"),
                    "evidence_level": se.get("evidence_level"),
                    "source":         se.get("source", ""),
                    "source_url":     se.get("source_url", ""),
                })

    # Check interaction rules
    for rule in INTERACTION_RULES:
        if rule["ingredients"].issubset(present_ins):
            effects.append({
                "ingredient":     "Interaction",
                "effect":         rule["warning"],
                "condition":      "When both ingredients are present",
                "population":     "All consumers",
                "evidence_level": rule["evidence_level"],
                "source":         rule["source"],
                "source_url":     "",
            })

    # Sort CONFIRMED first
    effects.sort(key=lambda x: 0 if x["evidence_level"] == "CONFIRMED" else 1)
    return effects
