import os
import json
import pandas as pd
from datetime import datetime, timedelta

# Mocking the current date of the hackathon simulation
CURRENT_SIMULATION_DATE = datetime(2026, 6, 15).date()
PRIME_DAY_DATE = datetime(2026, 7, 15).date()

# =====================================================================
# 👥 10 DUMMY USER PROFILES WITH COMPREHENSIVE ORDER HISTORY
# =====================================================================
# Each user profile now contains a history of items they previously ordered,
# along with the exact purchase date, so we can calculate live depletion.
USER_DATABASE = {
    "USER_001": {
        "name": "Aarav (Single Bachelor)", 
        "household_size": 1, 
        "modifiers": {},
        "order_history": [
            {"product_id": "PROD_001", "purchase_date": "2026-05-10"}, # Shampoo
            {"product_id": "PROD_010", "purchase_date": "2026-06-01"}, # Body Wash
            {"product_id": "PROD_035", "purchase_date": "2026-04-15"}  # Dishwash Gel
        ]
    },
    "USER_002": {
        "name": "Ananya (Nuclear Family)", 
        "household_size": 4, 
        "modifiers": {},
        "order_history": [
            {"product_id": "PROD_001", "purchase_date": "2026-06-01"}, 
            {"product_id": "PROD_035", "purchase_date": "2026-06-05"},
            {"product_id": "PROD_012", "purchase_date": "2026-05-20"}  
        ]
    },
    "USER_003": {
        "name": "Kabir (Heavy Consumer)", 
        "household_size": 2, 
        "modifiers": {"PROD_001": 0.70}, # Finished 30% faster
        "order_history": [
            {"product_id": "PROD_001", "purchase_date": "2026-05-28"}, 
            {"product_id": "PROD_010", "purchase_date": "2026-06-10"}
        ]
    },
    "USER_004": {
        "name": "Diya (Slow Consumer)", 
        "household_size": 1, 
        "modifiers": {"PROD_001": 1.50}, # Lasts 50% longer
        "order_history": [
            {"product_id": "PROD_001", "purchase_date": "2026-05-01"}
        ]
    },
    "USER_005": {
        "name": "Vivaan (Joint Family)", 
        "household_size": 6, 
        "modifiers": {},
        "order_history": [
            {"product_id": "PROD_001", "purchase_date": "2026-06-10"},
            {"product_id": "PROD_035", "purchase_date": "2026-06-12"},
            {"product_id": "PROD_010", "purchase_date": "2026-06-08"}
        ]
    },
    "USER_006": {
        "name": "Isha (Gym & Fitness Buff)", 
        "household_size": 1, 
        "modifiers": {"PROD_010": 0.50},
        "order_history": [
            {"product_id": "PROD_010", "purchase_date": "2026-06-05"}
        ]
    },
    "USER_007": {
        "name": "Arjun (Roommates)", 
        "household_size": 3, 
        "modifiers": {},
        "order_history": [
            {"product_id": "PROD_035", "purchase_date": "2026-05-25"}
        ]
    },
    "USER_008": {
        "name": "Meera (Eco-conscious)", 
        "household_size": 2, 
        "modifiers": {"PROD_001": 1.30},
        "order_history": [
            {"product_id": "PROD_001", "purchase_date": "2026-05-15"}
        ]
    },
    "USER_009": {
        "name": "Rohan (New Parent)", 
        "household_size": 3, 
        "modifiers": {},
        "order_history": [
            {"product_id": "PROD_001", "purchase_date": "2026-06-01"}
        ]
    },
    "USER_010": {
        "name": "Sanya (Frequent Traveler)", 
        "household_size": 1, 
        "modifiers": {},
        "order_history": [
            {"product_id": "PROD_001", "purchase_date": "2026-04-20"}
        ]
    }
}

def load_local_dataset():
    """Loads the json dataset straight into a Pandas DataFrame."""
    file_name = "restock_iq_dataset_150.json"
    if not os.path.exists(file_name):
        print(f"❌ Error: Cannot find {file_name} in current folder.")
        return None
        
    with open(file_name, "r", encoding="utf-8") as f:
        data = json.load(f)
    products_list = data["products"] if isinstance(data, dict) and "products" in data else data
    return pd.DataFrame(products_list)


def generate_history_based_dashboard(df, user_id):
    """
    Core Recommendation Engine.
    1. Evaluates User Order History to determine what items are running out.
    2. Blends upcoming Sale parameters to trigger smart stock-up deals.
    """
    user_profile = USER_DATABASE.get(user_id)
    if not user_profile:
        return None
        
    household_size = user_profile["household_size"]
    user_mods = user_profile["modifiers"]
    history = user_profile["order_history"]
    
    replenishment_recommendations = []
    
    # -----------------------------------------------------------------
    # PARAMETER 1: EVALUATING USER ORDER HISTORY (TRACKING DEPLETION)
    # -----------------------------------------------------------------
    for order in history:
        pid = order["product_id"]
        purchase_dt = datetime.strptime(order["purchase_date"], "%Y-%m-%d").date()
        
        # Pull product info from catalog
        p_row = df[df["product_id"] == pid]
        if p_row.empty:
            continue
        product = p_row.iloc[0].to_dict()
        
        # Calculate dynamic lifespan based on constraints
        base_lifespan = float(product["consumption"]["avg_lifespan_days_per_person"])
        
        if product["household"]["scales_with_household_size"]:
            calculated_lifespan = base_lifespan / household_size
        else:
            calculated_lifespan = base_lifespan
            
        # Apply feedback loops if present
        personal_multiplier = user_mods.get(pid, 1.0)
        final_lifespan_days = calculated_lifespan * personal_multiplier
        
        # Calculate countdown tracking parameters relative to CURRENT simulation date
        depletion_date = purchase_dt + timedelta(days=int(final_lifespan_days))
        days_remaining = (depletion_date - CURRENT_SIMULATION_DATE).days
        
        # Determine status tier based on countdown velocity
        if days_remaining <= 5:
            urgency = "CRITICAL (Refill Now!)"
        elif days_remaining <= 15:
            urgency = "HIGH (Running Low)"
        else:
            urgency = "STABLE"
            
        replenishment_recommendations.append({
            "product_id": pid,
            "name": product["name"],
            "category": product["category"],
            "purchase_date": order["purchase_date"],
            "days_remaining": days_remaining,
            "urgency": urgency,
            "commonly_bought": product.get("commonly_bought_together", [])
        })
        
    # Sort history parameters so the most depleted items float to the very top
    replenishment_recommendations = sorted(replenishment_recommendations, key=lambda x: x["days_remaining"])

    # -----------------------------------------------------------------
    # PARAMETER 2: BLENDING SALE-AWARE RECOMMENDATIONS (MAX 3 DEALS)
    # -----------------------------------------------------------------
    # The algorithm looks at the highest priority expiring item from history,
    # reads its 'commonly_bought_together' cross-sell list, and presents them as Sale-Aware suggestions.
    sale_deals = []
    
    if replenishment_recommendations:
        top_expiring_item = replenishment_recommendations[0]
        co_purchase_targets = top_expiring_item["commonly_bought"]
        
        # Query items frequently paired with our running-out item
        deals_df = df[df["product_id"].isin(co_purchase_targets)].head(3)
        
        for _, row in deals_df.iterrows():
            item = row.to_dict()
            orig_price = float(item.get("price", 15.0) if item.get("price") else 10.0)
            sale_price = round(orig_price * 0.85, 2) # Dynamic 15% markdown parameter
            
            # Check if this item falls inside Prime Day window calculations
            sale_deals.append({
                "name": item["name"],
                "category": item["category"],
                "original_price": orig_price,
                "prime_day_price": sale_price,
                "nudge": f"Since your {top_expiring_item['name']} is ending, bundle this during Prime Day on {PRIME_DAY_DATE} for 15% off!"
            })
            
    return replenishment_recommendations, sale_deals


# =====================================================================
# 🚀 USER-HISTORY ENGINE DASHBOARD RUNNER
# =====================================================================
if __name__ == "__main__":
    products_df = load_local_dataset()
    
    if products_df is not None:
        print("="*85)
        print(f"📊   RESTOCK IQ: MULTI-USER HISTORY & MULTI-PARAMETER ENGINE SIMULATION")
        print(f"     Current Simulation Timeline Anchor: {CURRENT_SIMULATION_DATE}")
        print("="*85)
        
        # Let's check 3 highly contrasting user histories to see how the dashboard shifts
        target_test_users = ["USER_001", "USER_003", "USER_005"]
        
        for uid in target_test_users:
            profile = USER_DATABASE[uid]
            replenishments, deals = generate_history_based_dashboard(products_df, uid)
            
            print(f"\n👤 ACTIVE ACCOUNT ACCESSED: {profile['name']}")
            print(f"   ⚙️ Account Context: Household Size = {profile['household_size']} | Total Historic Orders Logged = {len(profile['order_history'])}")
            print("-" * 85)
            
            print("   ⏳ [PARAMETER 1 RESULT: LIVE PRODUCT REORDER COUNTDOWN]")
            for item in replenishments:
                print(f"      • {item['name']} (Bought: {item['purchase_date']})")
                print(f"        👉 Days left: {item['days_remaining']} days | Status: {item['urgency']}")
                
            print("\n   🔥 [PARAMETER 2 RESULT: COMPANION SALE-AWARE BUNDLES (MAX 3 DEALS)]")
            if deals:
                for idx, deal in enumerate(deals, 1):
                    print(f"      {idx}. [PRIME DEAL] {deal['name']} (${deal['prime_day_price']})")
                    print(f"         📢 Context Nudge: {deal['nudge']}")
            else:
                print("      No current items matching depletion criteria for sale grouping.")
            print("="*85)