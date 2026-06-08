"""
app/services/matcher_custom.py  (FIXED v2)
===========================================
Fix: INVERT_SUGAR is now a separate entry at harm_level 2.
     Previously HFCS entry was used for invert sugar syrup — wrong.
     Invert sugar = sucrose split into glucose + fructose.
     It is NOT the same as high-fructose corn syrup from corn starch.
"""

CUSTOM_ENTRIES: dict[str, dict] = {

    "MAIDA": {
        "ins_no":           "MAIDA",
        "e_number":         None,
        "name_english":     "Refined Wheat Flour (Maida)",
        "name_hindi":       "मैदा",
        "functional_class": "Base ingredient",
        "harm_level":       4,
        "harm_severity":    "HIGH",
        "color_code":       "RED",
        "harm_reason":      (
            "Highly refined flour. All bran and germ removed. "
            "Zero dietary fibre, very high glycaemic index — "
            "spikes blood sugar rapidly. First ingredient in most "
            "Indian biscuits and snacks."
        ),
        "expert_concern":   "YES",
        "side_effects":     [],
        "fssai_permitted":  True,
        "source":           "Custom entry — LabelScan AI",
    },

    "PALM_OIL": {
        "ins_no":           "PALM_OIL",
        "e_number":         None,
        "name_english":     "Palm Oil",
        "name_hindi":       "पाम तेल",
        "functional_class": "Fat/Oil",
        "harm_level":       3,
        "harm_severity":    "MEDIUM-HIGH",
        "color_code":       "ORANGE",
        "harm_reason":      (
            "High in saturated fat (~50% of total fat). "
            "Linked to increased LDL cholesterol at high consumption. "
            "Used extensively in Indian packaged foods due to low cost."
        ),
        "expert_concern":   "YES",
        "side_effects":     [],
        "fssai_permitted":  True,
        "source":           "Custom entry — LabelScan AI",
    },

    "HYDRO_VEG_OIL": {
        "ins_no":           "HYDRO_VEG_OIL",
        "e_number":         None,
        "name_english":     "Hydrogenated Vegetable Oil (Vanaspati)",
        "name_hindi":       "वनस्पति (हाइड्रोजेनेटेड तेल)",
        "functional_class": "Fat/Oil",
        "harm_level":       4,
        "harm_severity":    "HIGH",
        "color_code":       "RED",
        "harm_reason":      (
            "Contains industrial trans fats. Raises LDL, lowers HDL. "
            "WHO has called for complete global elimination. "
            "Linked to heart disease, stroke, and type 2 diabetes."
        ),
        "expert_concern":   "YES",
        "side_effects":     [
            {
                "effect":         "Increases cardiovascular disease risk",
                "condition":      "Regular consumption",
                "population":     "All consumers",
                "evidence_level": "CONFIRMED",
                "source":         "WHO REPLACE initiative 2018",
                "source_url":     "https://www.who.int/news-room/detail/14-05-2018-who-plan-to-eliminate-industrially-produced-trans-fatty-acids-from-global-food-supply",
            }
        ],
        "fssai_permitted":  True,
        "source":           "Custom entry — LabelScan AI",
    },

    "INTERESTER_FAT": {
        "ins_no":           "INTERESTER_FAT",
        "e_number":         None,
        "name_english":     "Interesterified Fat",
        "name_hindi":       "इंटरएस्टरीफाइड वसा",
        "functional_class": "Fat/Oil",
        "harm_level":       3,
        "harm_severity":    "MEDIUM-HIGH",
        "color_code":       "ORANGE",
        "harm_reason":      (
            "Chemically modified fat used as a trans fat replacement. "
            "Limited long-term human data. Some studies suggest similar "
            "metabolic concerns to trans fat."
        ),
        "expert_concern":   "YES",
        "side_effects":     [],
        "fssai_permitted":  True,
        "source":           "Custom entry — LabelScan AI",
    },

    "HFCS": {
        "ins_no":           "HFCS",
        "e_number":         None,
        "name_english":     "High Fructose Corn Syrup",
        "name_hindi":       "हाई फ्रुक्टोज कॉर्न सिरप",
        "functional_class": "Sweetener",
        "harm_level":       4,
        "harm_severity":    "HIGH",
        "color_code":       "RED",
        "harm_reason":      (
            "Industrially produced from corn starch with elevated fructose content. "
            "Linked to non-alcoholic fatty liver disease, obesity, and insulin "
            "resistance. Common in Indian cold drinks and confectionery."
        ),
        "expert_concern":   "YES",
        "side_effects":     [
            {
                "effect":         "Linked to non-alcoholic fatty liver disease",
                "condition":      "Regular high consumption",
                "population":     "All consumers, especially children",
                "evidence_level": "PROBABLE",
                "source":         "Stanhope KL, J Clin Invest 2018",
                "source_url":     "https://pubmed.ncbi.nlm.nih.gov/29408797",
            }
        ],
        "fssai_permitted":  True,
        "source":           "Custom entry — LabelScan AI",
    },

    # FIX: INVERT_SUGAR is separate from HFCS — harm_level 2 not 4
    "INVERT_SUGAR": {
        "ins_no":           "INVERT_SUGAR",
        "e_number":         None,
        "name_english":     "Invert Sugar Syrup",
        "name_hindi":       "इनवर्ट शुगर सिरप",
        "functional_class": "Sweetener",
        "harm_level":       2,
        "harm_severity":    "LOW-MEDIUM",
        "color_code":       "YELLOW",
        "harm_reason":      (
            "Sucrose enzymatically split into glucose and fructose. "
            "A refined liquid sugar — more processed than granulated sugar "
            "but not the same as high-fructose corn syrup. "
            "Adds to total sugar intake; moderate concern."
        ),
        "expert_concern":   "NO",
        "side_effects":     [],
        "fssai_permitted":  True,
        "source":           "Custom entry",
    },
}