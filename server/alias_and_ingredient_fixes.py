"""
alias_and_ingredient_fixes.py
==============================
Run ONCE after replacing matcher.py to fix two data issues:

  Fix 1 — INVERT SUGAR SYRUP alias in matcher.py
  ------------------------------------------------
  "Invert sugar syrup" and "invert syrup" were mapped to HFCS (harm_level 4).
  This is WRONG. Invert sugar syrup is simply sucrose enzymatically split into
  glucose + fructose — it is a form of sugar used in biscuits and confectionery.
  It is NOT high-fructose corn syrup.

  Correct mapping: create a custom entry INVERT_SUGAR at harm_level 2
  (it IS a refined sugar — more processed than plain sugar, but not as harmful
  as HFCS which is industrially produced from corn with higher fructose ratios).

  Fix 2 — Sucralose (INS 955) harm_level in DB
  ---------------------------------------------
  FSSAI CSV may have loaded sucralose at harm_level 1 or 2.
  Correct value: harm_level 4 (artificial sweetener — may disrupt gut bacteria,
  some studies link to insulin resistance, used daily in supplements).

  Fix 3 — Clear cached scores for products that had wrong ingredient matching
  (Good Day scored 4/100 because invert sugar was treated as HFCS = -20pts
  on top of MAIDA -20 + PALM_OIL -10 + NOVA4 -20 = 70pts penalty = 30 base,
  then additional emulsifier penalties pushed it to 4/100)

Run:
  cd server
  python alias_and_ingredient_fixes.py
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models.ingredient import Ingredient
from app.models.product import Product

app = create_app()


def fix_sucralose():
    """Ensure Sucralose (INS 955) is harm_level 4."""
    with app.app_context():
        sucralose = db.session.get(Ingredient, "955")
        if sucralose:
            old = sucralose.harm_level
            sucralose.harm_level    = 4
            sucralose.harm_severity = "HIGH"
            sucralose.color_code    = "RED"
            sucralose.harm_reason   = (
                "Artificial sweetener. May disrupt gut microbiome. "
                "Some studies link to insulin resistance. "
                "Used daily in supplements — cumulative exposure is the concern. "
                "Commonly flagged in protein powders and diet products."
            )
            sucralose.expert_concern = "YES"
            db.session.commit()
            print(f"  ✅ Sucralose (955): harm_level {old} → 4")
        else:
            # Insert if missing from FSSAI CSV
            db.session.add(Ingredient(
                ins_no           = "955",
                e_number         = "E955",
                name_english     = "Sucralose",
                name_hindi       = "सुक्रालोज़",
                functional_class = "Sweetener",
                harm_level       = 4,
                harm_severity    = "HIGH",
                color_code       = "RED",
                harm_reason      = (
                    "Artificial sweetener. May disrupt gut microbiome. "
                    "Some studies link to insulin resistance. "
                    "Commonly used in protein powders and diet products."
                ),
                expert_concern   = "YES",
                fssai_permitted  = True,
                source           = "FSSAI + LabelScan AI research",
            ))
            db.session.commit()
            print("  ✅ Sucralose (955): inserted with harm_level 4")


def add_invert_sugar_entry():
    """
    Add INVERT_SUGAR as a custom ingredient entry at harm_level 2.
    This replaces the wrong HFCS mapping for invert sugar syrup.
    """
    with app.app_context():
        existing = db.session.get(Ingredient, "INVERT_SUGAR")
        if existing:
            print("  ℹ️  INVERT_SUGAR entry already exists — skipping")
            return

        db.session.add(Ingredient(
            ins_no           = "INVERT_SUGAR",
            e_number         = None,
            name_english     = "Invert Sugar Syrup",
            name_hindi       = "इनवर्ट शुगर सिरप",
            functional_class = "Sweetener",
            harm_level       = 2,
            harm_severity    = "LOW-MEDIUM",
            color_code       = "YELLOW",
            harm_reason      = (
                "Sucrose enzymatically split into glucose and fructose. "
                "A refined liquid sugar — more processed than granulated sugar "
                "but not the same as high-fructose corn syrup. "
                "Used in biscuits and confectionery for texture and sweetness. "
                "Moderate concern — adds to total sugar intake."
            ),
            expert_concern   = "NO",
            fssai_permitted  = True,
            source           = "Custom entry — corrected from HFCS mapping",
        ))
        db.session.commit()
        print("  ✅ INVERT_SUGAR: inserted with harm_level 2")


def clear_good_day_cache():
    """
    Clear cached score for Good Day Butter Jeera so it rescores correctly.
    Barcode: 8901063093706 (from the label scan)
    Also clears any product with 'Good Day' in name as a safety net.
    """
    with app.app_context():
        # Clear by barcode
        barcodes_to_clear = ["8901063093706", "8901063093522"]
        for bc in barcodes_to_clear:
            p = db.session.get(Product, bc)
            if p:
                p.food_pharmer_score = None
                p.score_band         = None
                p.verdict_text       = None
                print(f"  ✅ Cleared cache: {p.product_name} ({bc})")

        # Also clear any Good Day product
        good_day_products = (
            Product.query
            .filter(Product.product_name.ilike("%good day%"))
            .filter(Product.food_pharmer_score.isnot(None))
            .all()
        )
        for p in good_day_products:
            p.food_pharmer_score = None
            p.score_band         = None
            p.verdict_text       = None
            print(f"  ✅ Cleared cache: {p.product_name} ({p.barcode})")

        # Clear any OWN / Only What's Needed whey protein products
        own_products = (
            Product.query
            .filter(
                (Product.brand.ilike("%what%needed%")) |
                (Product.product_name.ilike("%whey protein concentrate%"))
            )
            .all()
        )
        for p in own_products:
            p.food_pharmer_score = None
            p.score_band         = None
            p.verdict_text       = None
            print(f"  ✅ Cleared OWN cache: {p.product_name} ({p.barcode})")

        db.session.commit()


if __name__ == "__main__":
    print("\n🔧 Label Padhega AI — Alias & Ingredient Fixes")
    print("=" * 50)

    print("\n1. Fixing Sucralose (INS 955) harm_level...")
    fix_sucralose()

    print("\n2. Adding INVERT_SUGAR custom entry (harm_level 2)...")
    add_invert_sugar_entry()

    print("\n3. Clearing stale product caches...")
    clear_good_day_cache()

    print("\n" + "=" * 50)
    print("✅ Done!")
    print()
    print("Also update matcher.py aliases:")
    print("  'invert sugar syrup' → 'INVERT_SUGAR'  (was HFCS)")
    print("  'invert syrup'       → 'INVERT_SUGAR'  (was HFCS)")
    print()
    print("Rescan these products to get corrected scores:")
    print("  Good Day Butter Jeera  → expected ~40/100")
    print("  OWN Whey Protein       → expected ~85-90/100")
    print("  Plant Protein Complex  → re-upload photo for correct nutrition")
    print("=" * 50)