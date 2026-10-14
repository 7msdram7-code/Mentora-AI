import httpx

base = 'http://127.0.0.1:8000/api'
client = httpx.Client(timeout=10.0)

print("--- Step 1: Checking Backend Health ---")
h = client.get(f"{base}/health").json()
print("Health status:", h)
assert h["status"] == "ok"
assert h["database"] == "connected"

print("\n--- Step 2: Loading Scripted Demo (Data Structures — Hashing) ---")
d = client.post(f"{base}/demo/load").json()
print("Demo subject:", d["subject_name"])
print("Scripted Question ID:", d["scripted_question_id"])
assert d["scripted_question_id"] == 1
assert d["subject_id"] == "data_structures_hashing"

print("\n--- Step 3: Fetching Next Question ---")
q = client.get(f"{base}/questions/next?student_id=demo_student&subject_id=data_structures_hashing&question_id=1").json()
print("Question text:", q["text"])
print("Presented options (without revealing correct answer):")
for opt in q["options"]:
    print(f"  [{opt['id']}] {opt['text']}")
assert "25" in q["text"]
assert q["topic_id"] == "hash_table"

print("\n--- Step 4: Submitting Misconception Answer '25' ---")
ans = client.post(f"{base}/answers", json={
    "student_id": "demo_student",
    "question_id": 1,
    "answer": "25",
    "time_sec": 12.0
}).json()
print("Correct:", ans["correct"])
print("Identified Root Topic:", ans["root_topic"], f"({ans['root_topic_name']})")
print("Diagnosis Explanation:", ans["explanation"])
print("Generated Counter-Example:", ans["counter_example"]["text"])
assert ans["correct"] is False
assert ans["root_topic"] == "modulo"
assert "modulo wrap-around" in ans["explanation"]
assert ans["counter_example"] is not None

print("\n--- Step 5: Verifying Knowledge Graph Telemetry ---")
g = client.get(f"{base}/subjects/data_structures_hashing/graph?student_id=demo_student").json()
nodes = {n["id"]: n for n in g["nodes"]}
print(f"Modulo Arithmetic Mastery: {nodes['modulo']['mastery']} | Status: {nodes['modulo']['status']} | Role: {nodes['modulo']['diagnostic_role']}")
print(f"Hash Tables Mastery: {nodes['hash_table']['mastery']} | Status: {nodes['hash_table']['status']} | Role: {nodes['hash_table']['diagnostic_role']}")
assert nodes["modulo"]["status"] == "RED"
assert nodes["modulo"]["mastery"] == 0.3
assert nodes["modulo"]["diagnostic_role"] == "ROOT CAUSE"
assert nodes["hash_table"]["mastery"] == 0.4
assert nodes["hash_table"]["diagnostic_role"] == "SYMPTOM"

print("\n--- Step 6: Submitting Correct Counter-Example Answer '5' ---")
ce_id = ans["counter_example"]["id"] or 101
ce_ans = client.post(f"{base}/answers", json={
    "student_id": "demo_student",
    "question_id": ce_id,
    "answer": "5",
    "time_sec": 7.0,
    "parent_attempt_id": 1
}).json()
print("Counter-Example Correct:", ce_ans["correct"])
print("Addressed Misconception:", ce_ans["addressed_misconception"])
assert ce_ans["correct"] is True
assert ce_ans["addressed_misconception"] is True

g2 = client.get(f"{base}/subjects/data_structures_hashing/graph?student_id=demo_student").json()
nodes2 = {n["id"]: n for n in g2["nodes"]}
print(f"Recovered Modulo Arithmetic Mastery: {nodes2['modulo']['mastery']} | Status: {nodes2['modulo']['status']}")
assert nodes2["modulo"]["mastery"] == 0.475
assert nodes2["modulo"]["status"] == "AMBER"  # Not forced to green!

print("\n--- Step 7: Testing Teach-Back Chat Session ---")
tb_start = client.post(f"{base}/teachback/start", json={
    "student_id": "demo_student",
    "topic_id": "modulo",
    "language": "en"
}).json()
session_id = tb_start["session_id"]
print("Junior Initial Question:", tb_start["junior_message"])

tb_msg = client.post(f"{base}/teachback/message", json={
    "session_id": session_id,
    "user_message": "Modulo arithmetic gives the integer remainder after division. In a table of size 10, any key modulo 10 wraps to a slot from 0 to 9.",
    "language": "en"
}).json()
print("Junior Naive Follow-up:", tb_msg["reply"])

tb_finish = client.post(f"{base}/teachback/finish", json={
    "session_id": session_id,
    "language": "en"
}).json()
print(f"Teach-back Score: {tb_finish['score']} / 100")
print("Feedback:", tb_finish["feedback"])

print("\n--- Step 8: Testing Spaced-Repetition Revision Plan ---")
rev = client.get(f"{base}/revision-plan?student_id=demo_student").json()
print(f"Total Revision Cards: {len(rev['cards'])}")
top_card = rev["cards"][0]
print(f"Top Priority Card: {top_card['topic_name']} ({top_card['suggested_days']}-day interval)")

print("\n--- Step 9: Testing Tamil Bilingual Support ---")
ta_ans = client.post(f"{base}/answers", json={
    "student_id": "demo_student_ta",
    "question_id": 1,
    "answer": "25",
    "time_sec": 10.0,
    "language": "ta"
}).json()
print("Tamil Explanation:", ta_ans["explanation"].encode("ascii", "backslashreplace").decode("ascii"))
assert len(ta_ans["explanation"]) > 10

print("\n--- Step 10: Testing Learning Progress Analytics ---")
prog = client.get(f"{base}/progress?student_id=demo_student").json()
print(f"Overall Mastery: {prog['overall_mastery']}%")
print(f"Resolution Rate: {prog['performance']['resolution_rate']}%")
print(f"Total Topics: {len(prog['topics'])}")
assert len(prog["topics"]) >= 9
assert prog["performance"]["misconceptions_resolved"] >= 1

print("\n--- Step 11: Testing MirrorPet Profile & Earned Points ---")
profile = client.get(f"{base}/pet?student_id=demo_student").json()
print(f"Student: {profile['display_name']} | Avatar: {profile['avatar_url']}")
print(f"Points Balance: {profile['points_balance']} pts | Level: {profile['level']}")
print(f"MirrorPet: {profile['pet']['pet_name']} ({profile['pet']['pet_type']}) | Theme: {profile['pet']['color_theme']}")
assert profile["pet"]["pet_name"] is not None
assert profile["points_balance"] >= 25  # Earned points from misconception recovery & answers!

print("\n--- Step 12: Testing Pet Shop Purchase, Equipping & Interaction ---")
shop = client.get(f"{base}/pet/shop?student_id=demo_student").json()
print(f"Available Shop Items: {len(shop)}")
assert len(shop) >= 10

# Try to purchase acc_sunglasses (price 35) or whatever points allow
affordable_item = next((item for item in shop if not item["is_owned"] and not item["is_locked"] and item["price"] <= profile["points_balance"]), None)
if affordable_item:
    cid = affordable_item["id"]
    print(f"Purchasing item: {affordable_item['name']} ({affordable_item['price']} pts)...")
    purch = client.post(f"{base}/pet/purchase", json={
        "student_id": "demo_student",
        "cosmetic_id": cid
    }).json()
    assert purch["status"] == "success"
    print(f"Purchase successful! New points balance: {purch['new_balance']}")

    # Equip the purchased item
    eq = client.post(f"{base}/pet/equip", json={
        "student_id": "demo_student",
        "category": affordable_item["category"],
        "cosmetic_id": cid,
        "action": "equip"
    }).json()
    assert eq["status"] == "success"
    print(f"Equipped {cid} successfully! Slot: {eq['slot']} -> {eq['equipped']}")

# Test interaction
interact = client.post(f"{base}/pet/interact?student_id=demo_student").json()
print(f"Pet interaction response: {interact['message']} (Happiness: {interact['happiness']}, Reaction: {interact['reaction']})")
assert interact["happiness"] >= 80

# Verify transaction history
txs = client.get(f"{base}/pet/transactions?student_id=demo_student").json()
print(f"Recorded Transactions: {len(txs)}")
assert len(txs) >= 1
for tx in txs[:3]:
    print(f"  [{tx['activity_type'].upper()}] {tx['amount']:+d} pts | {tx['reason']}")

print("\n=======================================================")
print(" ALL 12 DEMO FLOW VERIFICATION STEPS PASSED (100% OK!) ")
print("=======================================================")

