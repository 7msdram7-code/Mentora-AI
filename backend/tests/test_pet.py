import pytest
from app.routers.pet import ensure_pet_setup, award_learning_points
from app.models import StudentProfile, PetProfile, PetCosmetic, StudentInventory, PointTransaction

def test_1_pet_setup_and_profile(client, db_session):
    """Test 1: Pet setup creates student profile with 150 starter points and default pet."""
    res = client.get("/api/pet?student_id=test_student_1")
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == "test_student_1"
    assert data["points_balance"] == 150
    assert data["level"] == 2
    assert data["pet"]["pet_name"] == "Lumi"
    assert data["pet"]["color_theme"] == "violet"

def test_2_shop_catalogue_structure(client, db_session):
    """Test 2: Style shop returns outfits, accessories, and visual effects with status flags."""
    res = client.get("/api/pet/shop?student_id=test_student_2")
    assert res.status_code == 200
    shop = res.json()
    assert len(shop) >= 8

    categories = {item["category"] for item in shop}
    assert "outfit" in categories
    assert "accessory" in categories
    assert "effect" in categories

def test_3_atomic_purchase_and_balance_deduction(client, db_session):
    """Test 3: Purchasing an item deducts points and adds item to inventory."""
    # Ensure profile
    client.get("/api/pet?student_id=test_buyer")

    # Buy Cyber Hoodie (price: 75 pts, initial: 150 pts -> remaining: 75 pts)
    res_buy = client.post("/api/pet/purchase", json={
        "student_id": "test_buyer",
        "cosmetic_id": "outfit_cyber"
    })
    assert res_buy.status_code == 200
    buy_data = res_buy.json()
    assert buy_data["status"] == "success"
    assert buy_data["new_balance"] == 75

    # Verify inventory in database
    inv = db_session.query(StudentInventory).filter(
        StudentInventory.student_id == "test_buyer",
        StudentInventory.cosmetic_id == "outfit_cyber"
    ).first()
    assert inv is not None

def test_4_prevent_duplicate_purchase(client, db_session):
    """Test 4: Cannot re-purchase an already owned cosmetic item."""
    client.get("/api/pet?student_id=test_dup")
    client.post("/api/pet/purchase", json={
        "student_id": "test_dup",
        "cosmetic_id": "outfit_cyber"
    })

    # Second purchase attempt should fail
    res_dup = client.post("/api/pet/purchase", json={
        "student_id": "test_dup",
        "cosmetic_id": "outfit_cyber"
    })
    assert res_dup.status_code == 400
    assert "already own" in res_dup.json()["detail"].lower()

def test_5_insufficient_points_error(client, db_session):
    """Test 5: Purchase fails if student points balance is insufficient."""
    client.get("/api/pet?student_id=test_poor")
    student = db_session.query(StudentProfile).filter(StudentProfile.student_id == "test_poor").first()
    student.points_balance = 10  # Only 10 points
    db_session.commit()

    res = client.post("/api/pet/purchase", json={
        "student_id": "test_poor",
        "cosmetic_id": "outfit_hero"  # costs 100
    })
    assert res.status_code == 400
    assert "insufficient" in res.json()["detail"].lower()

def test_6_equip_and_unequip_cosmetics(client, db_session):
    """Test 6: Students can equip and unequip owned items on their 3D pet."""
    client.get("/api/pet?student_id=test_equip")
    # Buy sunglasses
    client.post("/api/pet/purchase", json={
        "student_id": "test_equip",
        "cosmetic_id": "acc_sunglasses"
    })

    # Equip
    res_eq = client.post("/api/pet/equip", json={
        "student_id": "test_equip",
        "cosmetic_id": "acc_sunglasses",
        "category": "accessory",
        "action": "equip"
    })
    assert res_eq.status_code == 200

    pet = db_session.query(PetProfile).filter(PetProfile.student_id == "test_equip").first()
    assert pet.equipped_accessory == "acc_sunglasses"

    # Unequip
    res_uneq = client.post("/api/pet/equip", json={
        "student_id": "test_equip",
        "cosmetic_id": None,
        "category": "accessory",
        "action": "unequip"
    })
    assert res_uneq.status_code == 200
    db_session.refresh(pet)
    assert pet.equipped_accessory is None

def test_7_pet_interaction_and_happiness(client, db_session):
    """Test 7: Clicking pet triggers reaction animation and boosts happiness."""
    res = client.post("/api/pet/interact?student_id=demo_student")
    assert res.status_code == 200
    data = res.json()
    assert data["happiness"] >= 85
    assert data["reaction"] in ["wave", "happy_jump", "cheer", "sparkle_twirl"]

def test_8_idempotent_learning_rewards(client, db_session):
    """Test 8: Learning points are awarded idempotently for activities."""
    student_id = "test_learner"
    ensure_pet_setup(db_session, student_id)

    # First reward: +25 for counter-example
    awarded1 = award_learning_points(
        db=db_session,
        student_id=student_id,
        amount=25,
        reason="Resolved Misconception",
        activity_type="recovery",
        reference_id="attempt_999"
    )
    assert awarded1 is True

    student = db_session.query(StudentProfile).filter(StudentProfile.student_id == student_id).first()
    assert student.points_balance == 175  # 150 + 25

    # Second reward with same reference_id: must NOT duplicate!
    awarded2 = award_learning_points(
        db=db_session,
        student_id=student_id,
        amount=25,
        reason="Resolved Misconception",
        activity_type="recovery",
        reference_id="attempt_999"
    )
    assert awarded2 is False
    assert student.points_balance == 175
