"""
clear_score_cache.py
=====================
Run this ONCE after applying all the matcher and humanise fixes.

What it does:
  1. Clears food_pharmer_score, score_band, verdict_text on ALL products
     so every product gets rescored on next scan with the fixed:
       - Correct serving sizes (biscuits 15g, drinks 200ml)
       - Fixed ingredient matching (MAIDA, PALM OIL now detected)
       - Fixed INS extraction from compound strings

  2. Optionally clears only specific products by barcode
     (use --barcode flag for targeted clears)

  3. Prints a summary of how many rows were cleared.

Usage:
  python clear_score_cache.py              # clear all products
  python clear_score_cache.py --dry-run    # show count without clearing
  python clear_score_cache.py --barcode 8901063093706  # clear one product

Run from the server/ directory with venv active:
  cd server
  python clear_score_cache.py
"""

import os
import sys
import argparse

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models.product import Product

app = create_app()


def clear_all(dry_run: bool = False) -> int:
    """Clear cached scores for all products. Returns count of affected rows."""
    with app.app_context():
        # Count rows that have a cached score
        count = db.session.execute(
            db.select(db.func.count(Product.barcode))
            .where(Product.food_pharmer_score.isnot(None))
        ).scalar()

        if dry_run:
            print(f"[dry-run] Would clear {count} cached scores.")
            return count

        # Clear score, band, and verdict — they will be regenerated on next scan
        db.session.execute(
            db.update(Product)
            .where(Product.food_pharmer_score.isnot(None))
            .values(
                food_pharmer_score = None,
                score_band         = None,
                verdict_text       = None,
                data_verified      = False,
            )
        )
        db.session.commit()
        print(f"✅ Cleared cached scores for {count} products.")
        print("   Products will be rescored on next scan with the fixed logic.")
        return count


def clear_one(barcode: str) -> bool:
    """Clear cached score for a specific barcode."""
    with app.app_context():
        product = db.session.get(Product, barcode)
        if not product:
            print(f"❌ Barcode {barcode} not found in database.")
            return False

        product.food_pharmer_score = None
        product.score_band         = None
        product.verdict_text       = None
        product.data_verified      = False
        db.session.commit()

        print(f"✅ Cleared cache for: {product.product_name} ({barcode})")
        print("   Rescan the product to get the corrected score.")
        return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clear Label Padhega AI score cache")
    parser.add_argument("--dry-run",  action="store_true",
                        help="Show count without actually clearing")
    parser.add_argument("--barcode",  type=str, default=None,
                        help="Clear cache for a single barcode only")
    args = parser.parse_args()

    print("\n🧹 Label Padhega AI — Score Cache Cleaner")
    print("=" * 45)

    if args.barcode:
        clear_one(args.barcode)
    else:
        if not args.dry_run:
            confirm = input(
                "\nThis will clear ALL cached scores and verdicts.\n"
                "Products will be rescored on next scan.\n"
                "Type 'yes' to confirm: "
            ).strip().lower()
            if confirm != "yes":
                print("Aborted.")
                sys.exit(0)
        clear_all(dry_run=args.dry_run)

    print("=" * 45)