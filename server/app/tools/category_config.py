"""
app/tools/category_config.py
=============================
Per-category scoring configuration.

Each category has:
  label              — display name
  penalty_multiplier — scales all ingredient + nutrition penalties
  sugar_thresholds   — low/high g per serving that trigger penalties
  sodium_thresholds  — low/high mg per serving
  sat_fat_threshold  — g per serving that triggers sat-fat penalty
  bonuses            — dict of bonus conditions and point values
  context            — sentence explaining why this category is scored this way
"""

CATEGORY_CONFIG: dict = {
    "health_drink": {
        "label":              "Health Drink",
        "penalty_multiplier": 1.5,   # strictest — claims health benefits
        "sugar_thresholds":   {"low": 5,   "high": 10},
        "sodium_thresholds":  {"low": 200, "high": 400},
        "sat_fat_threshold":  3,
        "bonuses": {"protein_gt_15g": 10, "fiber_gt_5g": 8, "no_sweeteners": 15},
        "context": "Claims health benefits — strictest scrutiny applied",
    },
    "cold_drink": {
        "label":              "Cold Drink / Beverage",
        "penalty_multiplier": 1.2,
        "sugar_thresholds":   {"low": 5,   "high": 10},
        "sodium_thresholds":  {"low": 50,  "high": 100},
        "sat_fat_threshold":  1,
        "bonuses": {},
        "context": "Liquid sugar absorbs faster — stricter sugar thresholds",
    },
    "biscuit": {
        "label":              "Biscuit / Cookie",
        "penalty_multiplier": 1.0,
        "sugar_thresholds":   {"low": 10,  "high": 20},
        "sodium_thresholds":  {"low": 400, "high": 700},
        "sat_fat_threshold":  5,
        "bonuses": {"fiber_gt_5g": 5},
        "context": "Processed snack — check first 3 ingredients",
    },
    "breakfast_cereal": {
        "label":              "Breakfast Cereal",
        "penalty_multiplier": 1.2,
        "sugar_thresholds":   {"low": 8,   "high": 15},
        "sodium_thresholds":  {"low": 300, "high": 500},
        "sat_fat_threshold":  3,
        "bonuses": {"fiber_gt_5g": 8, "protein_gt_15g": 5},
        "context": "Eaten every morning — sugar and fibre content are critical",
    },
    "instant_noodles": {
        "label":              "Instant Noodles",
        "penalty_multiplier": 1.1,
        "sugar_thresholds":   {"low": 3,   "high": 6},
        "sodium_thresholds":  {"low": 400, "high": 600},
        "sat_fat_threshold":  4,
        "bonuses": {},
        "context": "Ultra-processed by definition — NOVA 4 penalty always applies",
    },
    "dairy": {
        "label":              "Dairy Product",
        "penalty_multiplier": 1.0,
        "sugar_thresholds":   {"low": 5,   "high": 12},
        "sodium_thresholds":  {"low": 200, "high": 400},
        "sat_fat_threshold":  6,
        "bonuses": {"protein_gt_15g": 5},
        "context": "Natural dairy is clean — watch for added sugar and carrageenan",
    },
    "protein_powder": {
        "label":              "Protein Powder / Supplement",
        "penalty_multiplier": 1.3,   # consumed daily — cumulative exposure matters
        "sugar_thresholds":   {"low": 3,   "high": 8},
        "sodium_thresholds":  {"low": 150, "high": 300},
        "sat_fat_threshold":  3,
        "bonuses": {"protein_gt_15g": 15, "no_sweeteners": 20, "ingredients_lt_8": 10},
        "context": "Consumed daily — ingredient quality and sweetener-free are critical",
    },
    "chips_namkeen": {
        "label":              "Chips & Namkeen",
        "penalty_multiplier": 1.0,
        "sugar_thresholds":   {"low": 3,   "high": 8},
        "sodium_thresholds":  {"low": 400, "high": 600},
        "sat_fat_threshold":  5,
        "bonuses": {},
        "context": "Fried snack — focus on oil quality and flavour enhancers",
    },
    "sauce_ketchup": {
        "label":              "Sauce / Ketchup",
        "penalty_multiplier": 1.0,
        "sugar_thresholds":   {"low": 15,  "high": 25},
        "sodium_thresholds":  {"low": 500, "high": 800},
        "sat_fat_threshold":  2,
        "bonuses": {},
        "context": "Hidden sugar and sodium — check serving size carefully",
    },
    "baby_food": {
        "label":              "Baby Food",
        "penalty_multiplier": 2.0,   # highest — immature immune system
        "sugar_thresholds":   {"low": 2,   "high": 4},
        "sodium_thresholds":  {"low": 50,  "high": 100},
        "sat_fat_threshold":  2,
        "bonuses": {"ingredients_lt_8": 15},
        "context": "For children under 2 — zero tolerance for additives",
    },
    "chocolate": {
        "label":              "Chocolate",
        "penalty_multiplier": 0.9,   # sugar is expected in chocolate — lighter touch
        "sugar_thresholds":   {"low": 15,  "high": 30},
        "sodium_thresholds":  {"low": 200, "high": 400},
        "sat_fat_threshold":  10,
        "bonuses": {"fiber_gt_5g": 5},
        "context": "Sugar is expected — focus on palm oil and cocoa content",
    },
    "general": {
        "label":              "General / Other",
        "penalty_multiplier": 1.0,
        "sugar_thresholds":   {"low": 10,  "high": 20},
        "sodium_thresholds":  {"low": 400, "high": 800},
        "sat_fat_threshold":  5,
        "bonuses": {},
        "context": "Standard scoring — no category-specific rules",
    },
}
