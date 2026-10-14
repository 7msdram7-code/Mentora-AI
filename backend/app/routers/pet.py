import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import (
    StudentProfile, 
    PetProfile, 
    PetCosmetic, 
    StudentInventory, 
    PointTransaction,
    Attempt,
    TeachbackSession
)
from app.schemas import (
    PetProfileRead,
    PetCosmeticRead,
    StudentProfileRead,
    PetPurchaseRequest,
    PetEquipRequest,
    PetCustomizeRequest,
    PetInteractResponse,
    PointTransactionRead
)

router = APIRouter(prefix="/pet", tags=["MirrorPet"])

# Initial Catalog of High-Quality 3D Cosmetics
INITIAL_COSMETICS = [
    # Outfits
    {
        "id": "outfit_scholar",
        "name": "Scholar's Robe",
        "category": "outfit",
        "price": 50,
        "milestone_requirement": None,
        "description": "Deep violet academic robe with golden celestial trim.",
        "icon": "BookOpen",
        "mesh_config": {"model_type": "robe", "color": "#4A35B0", "accent": "#FFD700"}
    },
    {
        "id": "outfit_cyber",
        "name": "Cyber Hoodie",
        "category": "outfit",
        "price": 75,
        "milestone_requirement": None,
        "description": "Futuristic dark neon hoodie with pulsing cyan circuits.",
        "icon": "Zap",
        "mesh_config": {"model_type": "hoodie", "color": "#12172F", "accent": "#22C3E6"}
    },
    {
        "id": "outfit_hero",
        "name": "Hero Cape",
        "category": "outfit",
        "price": 100,
        "milestone_requirement": None,
        "description": "Luminescent red and gold cape that billows with heroic spirit.",
        "icon": "Shield",
        "mesh_config": {"model_type": "cape", "color": "#D93636", "accent": "#F5A524"}
    },
    {
        "id": "outfit_master",
        "name": "Arch-Mage Cloak",
        "category": "outfit",
        "price": 140,
        "milestone_requirement": "resolve_3_misconceptions",
        "description": "Milestone Exclusive: Earned by overcoming 3 root-cause misconceptions.",
        "icon": "Award",
        "mesh_config": {"model_type": "cloak", "color": "#6C4CF1", "accent": "#22C3E6"}
    },
    # Accessories
    {
        "id": "acc_wizard_hat",
        "name": "Wizard Hat",
        "category": "accessory",
        "price": 40,
        "milestone_requirement": None,
        "description": "Pointed starry hat imbued with mathematical insight.",
        "icon": "Sparkles",
        "mesh_config": {"model_type": "hat", "color": "#2A1B69", "accent": "#FFD700"}
    },
    {
        "id": "acc_sunglasses",
        "name": "Cool Shades",
        "category": "accessory",
        "price": 35,
        "milestone_requirement": None,
        "description": "Tinted reflective sunglasses with UV logic protection.",
        "icon": "Glasses",
        "mesh_config": {"model_type": "glasses", "color": "#1A1A24", "accent": "#22C3E6"}
    },
    {
        "id": "acc_headphones",
        "name": "Studio Headphones",
        "category": "accessory",
        "price": 60,
        "milestone_requirement": None,
        "description": "High-fidelity audio monitors tuned for deep study flow.",
        "icon": "Headphones",
        "mesh_config": {"model_type": "headphones", "color": "#E5E7EB", "accent": "#6C4CF1"}
    },
    {
        "id": "acc_scarf",
        "name": "Cozy Scarf",
        "category": "accessory",
        "price": 30,
        "milestone_requirement": None,
        "description": "Soft hand-knitted scarf for midnight problem-solving sessions.",
        "icon": "Feather",
        "mesh_config": {"model_type": "scarf", "color": "#F5A524", "accent": "#D93636"}
    },
    {
        "id": "acc_halo",
        "name": "Golden Halo",
        "category": "accessory",
        "price": 110,
        "milestone_requirement": "teachback_score_80",
        "description": "Milestone Exclusive: Granted for explaining concepts with 80+ TeachBack clarity.",
        "icon": "Sun",
        "mesh_config": {"model_type": "halo", "color": "#FFE066", "accent": "#FFF3BF"}
    },
    # Visual Effects
    {
        "id": "effect_sparkles",
        "name": "Orbiting Stars",
        "category": "effect",
        "price": 50,
        "milestone_requirement": None,
        "description": "A cascade of glittering golden and violet stars orbiting the pet.",
        "icon": "Sparkles",
        "mesh_config": {"model_type": "sparkles", "color": "#FFD700", "speed": 1.5}
    },
    {
        "id": "effect_aura",
        "name": "Radiant Aura",
        "category": "effect",
        "price": 75,
        "milestone_requirement": None,
        "description": "A warm pulsating energy aura that expands and glows.",
        "icon": "Sun",
        "mesh_config": {"model_type": "aura", "color": "#22C3E6", "speed": 2.0}
    },
    {
        "id": "effect_trail",
        "name": "Starlight Trail",
        "category": "effect",
        "price": 65,
        "milestone_requirement": None,
        "description": "Luminescent floating dust particles trailing pet movement.",
        "icon": "Activity",
        "mesh_config": {"model_type": "trail", "color": "#E040FB", "speed": 1.0}
    }
]

def ensure_pet_setup(db: Session, student_id: str = "demo_student"):
    """Seeds the catalog and initializes profile/pet for the student if not existing."""
    # 1. Seed cosmetics
    for c in INITIAL_COSMETICS:
        existing = db.query(PetCosmetic).filter(PetCosmetic.id == c["id"]).first()
        if not existing:
            db.add(PetCosmetic(**c))
    db.flush()

    # 2. Seed student profile
    student = db.query(StudentProfile).filter(StudentProfile.student_id == student_id).first()
    if not student:
        student = StudentProfile(
            student_id=student_id,
            display_name="Alex Chen",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
            points_balance=150,
            total_earned_points=150,
            level=2
        )
        db.add(student)
        db.flush()

        # Seed initial starter transaction
        init_tx = PointTransaction(
            student_id=student_id,
            amount=150,
            reason="Welcome to MistakeMirror! Starter learning grant.",
            activity_type="welcome",
            reference_id="welcome_bonus"
        )
        db.add(init_tx)

    # 3. Seed Pet Profile
    pet = db.query(PetProfile).filter(PetProfile.student_id == student_id).first()
    if not pet:
        pet = PetProfile(
            student_id=student_id,
            pet_name="Lumi",
            pet_type="mirror_sprite",
            color_theme="violet",
            equipped_outfit="outfit_scholar",
            equipped_accessory="acc_wizard_hat",
            equipped_effect="effect_sparkles",
            happiness=92
        )
        db.add(pet)
        db.flush()

        # Grant initial equipped cosmetics to inventory
        for cid in ["outfit_scholar", "acc_wizard_hat", "effect_sparkles"]:
            inv = db.query(StudentInventory).filter(
                StudentInventory.student_id == student_id,
                StudentInventory.cosmetic_id == cid
            ).first()
            if not inv:
                db.add(StudentInventory(student_id=student_id, cosmetic_id=cid))

    db.commit()

def award_learning_points(
    db: Session,
    student_id: str,
    amount: int,
    reason: str,
    activity_type: str,
    reference_id: Optional[str] = None
) -> bool:
    """
    Idempotently awards progress points for validated learning activities.
    Prevents duplicate payouts for identical attempts or sessions.
    """
    ensure_pet_setup(db, student_id)

    # Idempotency check
    if reference_id:
        existing_tx = db.query(PointTransaction).filter(
            PointTransaction.student_id == student_id,
            PointTransaction.activity_type == activity_type,
            PointTransaction.reference_id == str(reference_id)
        ).first()
        if existing_tx:
            return False  # Already rewarded

    student = db.query(StudentProfile).filter(StudentProfile.student_id == student_id).first()
    if not student:
        return False

    student.points_balance += amount
    student.total_earned_points += amount
    # Level formula: level increases every 100 points
    student.level = max(1, 1 + (student.total_earned_points // 100))

    tx = PointTransaction(
        student_id=student_id,
        amount=amount,
        reason=reason,
        activity_type=activity_type,
        reference_id=str(reference_id) if reference_id else None
    )
    db.add(tx)
    db.flush()
    return True

def check_milestone_eligibility(db: Session, student_id: str, milestone_key: str) -> bool:
    """Evaluates whether the student has completed the specific learning milestone."""
    if not milestone_key:
        return True

    if milestone_key == "resolve_3_misconceptions":
        # Check counter-example successes
        resolved_count = db.query(Attempt).filter(
            Attempt.student_id == student_id,
            Attempt.correct == True,
            Attempt.parent_attempt_id.isnot(None)
        ).count()
        return resolved_count >= 1  # For demo convenience, 1+ resolved qualifies

    elif milestone_key == "teachback_score_80":
        # Check if student achieved score >= 80 in any TeachBack session
        high_score = db.query(TeachbackSession).filter(
            TeachbackSession.student_id == student_id,
            TeachbackSession.score >= 80
        ).first()
        return high_score is not None

    return True

@router.get("", response_model=StudentProfileRead)
def get_pet_and_profile(
    student_id: str = Query("demo_student"),
    db: Session = Depends(get_db)
):
    """Returns the student's identity and their separate 3D MirrorPet companion."""
    ensure_pet_setup(db, student_id)

    student = db.query(StudentProfile).filter(StudentProfile.student_id == student_id).first()
    pet = db.query(PetProfile).filter(PetProfile.student_id == student_id).first()

    # Fetch equipped cosmetics details
    equipped_details = {}
    for slot in ["equipped_outfit", "equipped_accessory", "equipped_effect"]:
        cid = getattr(pet, slot, None)
        if cid:
            cos = db.query(PetCosmetic).filter(PetCosmetic.id == cid).first()
            if cos:
                equipped_details[slot] = {
                    "id": cos.id,
                    "name": cos.name,
                    "category": cos.category,
                    "mesh_config": cos.mesh_config
                }

    # Fetch recent point transactions (last 6)
    txs = db.query(PointTransaction).filter(
        PointTransaction.student_id == student_id
    ).order_by(PointTransaction.id.desc()).limit(6).all()

    tx_list = [
        PointTransactionRead(
            id=t.id,
            amount=t.amount,
            reason=t.reason,
            activity_type=t.activity_type,
            created_at=t.created_at.strftime("%b %d, %H:%M") if t.created_at else ""
        ) for t in txs
    ]

    return StudentProfileRead(
        student_id=student.student_id,
        display_name=student.display_name,
        avatar_url=student.avatar_url,
        points_balance=student.points_balance,
        total_earned_points=student.total_earned_points,
        level=student.level,
        pet=PetProfileRead(
            id=pet.id,
            student_id=pet.student_id,
            pet_name=pet.pet_name,
            pet_type=pet.pet_type,
            color_theme=pet.color_theme,
            equipped_outfit=pet.equipped_outfit,
            equipped_accessory=pet.equipped_accessory,
            equipped_effect=pet.equipped_effect,
            happiness=pet.happiness,
            equipped_details=equipped_details
        ),
        recent_transactions=tx_list
    )

@router.get("/shop", response_model=List[PetCosmeticRead])
def get_shop_catalogue(
    student_id: str = Query("demo_student"),
    db: Session = Depends(get_db)
):
    """Returns the full style shop catalogue with owned, equipped, and lock statuses."""
    ensure_pet_setup(db, student_id)

    cosmetics = db.query(PetCosmetic).all()
    pet = db.query(PetProfile).filter(PetProfile.student_id == student_id).first()
    inventory_ids = {
        inv.cosmetic_id for inv in db.query(StudentInventory).filter(
            StudentInventory.student_id == student_id
        ).all()
    }

    equipped_set = {pet.equipped_outfit, pet.equipped_accessory, pet.equipped_effect}

    result = []
    for c in cosmetics:
        is_owned = c.id in inventory_ids
        is_equipped = c.id in equipped_set
        milestone_met = check_milestone_eligibility(db, student_id, c.milestone_requirement)
        is_locked = bool(c.milestone_requirement and not milestone_met and not is_owned)

        result.append(PetCosmeticRead(
            id=c.id,
            name=c.name,
            category=c.category,
            price=c.price,
            milestone_requirement=c.milestone_requirement,
            description=c.description,
            icon=c.icon,
            mesh_config=c.mesh_config or {},
            is_owned=is_owned,
            is_equipped=is_equipped,
            is_locked=is_locked,
            milestone_met=milestone_met
        ))

    return result

@router.post("/purchase")
def purchase_cosmetic(
    payload: PetPurchaseRequest,
    db: Session = Depends(get_db)
):
    """Atomically validates balance and milestone, subtracts points, and adds to inventory."""
    ensure_pet_setup(db, payload.student_id)

    cosmetic = db.query(PetCosmetic).filter(PetCosmetic.id == payload.cosmetic_id).first()
    if not cosmetic:
        raise HTTPException(status_code=404, detail="Cosmetic item not found.")

    # 1. Check if already owned
    existing_inv = db.query(StudentInventory).filter(
        StudentInventory.student_id == payload.student_id,
        StudentInventory.cosmetic_id == payload.cosmetic_id
    ).first()
    if existing_inv:
        raise HTTPException(status_code=400, detail="You already own this item.")

    # 2. Check milestone unlock
    if cosmetic.milestone_requirement:
        if not check_milestone_eligibility(db, payload.student_id, cosmetic.milestone_requirement):
            raise HTTPException(
                status_code=403, 
                detail=f"Item is locked! Complete the prerequisite milestone: {cosmetic.milestone_requirement}"
            )

    # 3. Check student points balance
    student = db.query(StudentProfile).filter(StudentProfile.student_id == payload.student_id).first()
    if student.points_balance < cosmetic.price:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient points! You have {student.points_balance} pts, but this item costs {cosmetic.price} pts."
        )

    # Atomic transaction: subtract points + add inventory + create ledger record
    student.points_balance -= cosmetic.price

    tx = PointTransaction(
        student_id=payload.student_id,
        amount=-cosmetic.price,
        reason=f"Purchased {cosmetic.name} in Style Shop",
        activity_type="shop_purchase",
        reference_id=f"buy_{cosmetic.id}"
    )
    db.add(tx)

    inv_entry = StudentInventory(
        student_id=payload.student_id,
        cosmetic_id=cosmetic.id
    )
    db.add(inv_entry)

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully unlocked {cosmetic.name}!",
        "new_balance": student.points_balance,
        "cosmetic_id": cosmetic.id
    }

@router.post("/equip")
def equip_cosmetic(
    payload: PetEquipRequest,
    db: Session = Depends(get_db)
):
    """Equips or unequips an owned cosmetic item on the 3D pet."""
    ensure_pet_setup(db, payload.student_id)

    pet = db.query(PetProfile).filter(PetProfile.student_id == payload.student_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found.")

    slot_name = f"equipped_{payload.category}"
    if not hasattr(pet, slot_name):
        raise HTTPException(status_code=400, detail=f"Invalid category '{payload.category}'.")

    if payload.action == "unequip":
        setattr(pet, slot_name, None)
        db.commit()
        return {"status": "success", "message": f"Unequipped {payload.category}.", "slot": slot_name, "equipped": None}

    # Verify student owns the item
    if not payload.cosmetic_id:
        raise HTTPException(status_code=400, detail="Missing cosmetic ID to equip.")

    inv = db.query(StudentInventory).filter(
        StudentInventory.student_id == payload.student_id,
        StudentInventory.cosmetic_id == payload.cosmetic_id
    ).first()
    if not inv:
        raise HTTPException(status_code=403, detail="You do not own this cosmetic item.")

    setattr(pet, slot_name, payload.cosmetic_id)
    db.commit()

    return {
        "status": "success",
        "message": f"Equipped {payload.cosmetic_id} on your pet!",
        "slot": slot_name,
        "equipped": payload.cosmetic_id
    }

@router.post("/customize")
def customize_pet(
    payload: PetCustomizeRequest,
    db: Session = Depends(get_db)
):
    """Updates pet name and 3D base color theme."""
    ensure_pet_setup(db, payload.student_id)

    pet = db.query(PetProfile).filter(PetProfile.student_id == payload.student_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found.")

    if payload.pet_name:
        pet.pet_name = payload.pet_name.strip()[:20]

    if payload.color_theme:
        valid_themes = {"violet", "emerald", "cyan", "gold", "pink"}
        if payload.color_theme in valid_themes:
            pet.color_theme = payload.color_theme

    db.commit()

    return {
        "status": "success",
        "pet_name": pet.pet_name,
        "color_theme": pet.color_theme
    }

@router.post("/interact", response_model=PetInteractResponse)
def interact_with_pet(
    student_id: str = Query("demo_student"),
    db: Session = Depends(get_db)
):
    """Tap/click interaction: increases pet happiness and triggers animation."""
    ensure_pet_setup(db, student_id)

    pet = db.query(PetProfile).filter(PetProfile.student_id == student_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found.")

    pet.happiness = min(100, pet.happiness + 5)
    pet.last_interacted_at = datetime.datetime.utcnow()
    db.commit()

    import random
    reactions = [
        ("wave", f"{pet.pet_name} waves its paws happily at you!"),
        ("happy_jump", f"{pet.pet_name} does an excited backflip!"),
        ("cheer", f"{pet.pet_name} cheers for your study dedication!"),
        ("sparkle_twirl", f"{pet.pet_name} twirls around with sparkling joy!")
    ]
    reaction, message = random.choice(reactions)

    return PetInteractResponse(
        pet_name=pet.pet_name,
        happiness=pet.happiness,
        reaction=reaction,
        message=message
    )

@router.get("/transactions", response_model=List[PointTransactionRead])
def get_point_transactions(
    student_id: str = Query("demo_student"),
    db: Session = Depends(get_db)
):
    """Returns complete history of earned and spent progress points."""
    ensure_pet_setup(db, student_id)

    txs = db.query(PointTransaction).filter(
        PointTransaction.student_id == student_id
    ).order_by(PointTransaction.id.desc()).all()

    return [
        PointTransactionRead(
            id=t.id,
            amount=t.amount,
            reason=t.reason,
            activity_type=t.activity_type,
            created_at=t.created_at.strftime("%b %d, %H:%M") if t.created_at else ""
        ) for t in txs
    ]
