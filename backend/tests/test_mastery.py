import pytest
from app.mastery import (
    clamp_p,
    calculate_status,
    apply_correct_update,
    apply_wrong_update,
    apply_root_cause_update,
    apply_careless_slip_update,
    update_mastery_for_attempt,
    get_or_create_mastery
)
from app.models import Mastery

def test_1_initial_mastery_is_half(db_session):
    """Test 1: Initial mastery is 0.5 for all seeded topics."""
    student_id = "test_student_init"
    mastery = get_or_create_mastery(db_session, student_id, "order_of_operations")
    assert mastery.p == 0.5
    assert mastery.status == "AMBER"
    assert mastery.diagnostic_role == "OK"

def test_2_status_boundaries():
    """Test 2: Status boundaries at 0.4 and 0.7."""
    assert calculate_status(0.39) == "RED"
    assert calculate_status(0.3999) == "RED"
    assert calculate_status(0.40) == "AMBER"
    assert calculate_status(0.50) == "AMBER"
    assert calculate_status(0.6999) == "AMBER"
    assert calculate_status(0.70) == "GREEN"
    assert calculate_status(0.85) == "GREEN"

def test_3_correct_answer_formula():
    """Test 3: Correct answer update formula p = p + (1 - p) * 0.25."""
    p_initial = 0.5
    p_next = apply_correct_update(p_initial)
    expected = 0.5 + (1.0 - 0.5) * 0.25  # 0.625
    assert p_next == pytest.approx(0.625, abs=1e-4)

    # From 0.625
    p_next2 = apply_correct_update(p_next)
    expected2 = 0.625 + (1.0 - 0.625) * 0.25  # 0.7188
    assert p_next2 == pytest.approx(0.7188, abs=1e-4)
    assert calculate_status(p_next2) == "GREEN"

def test_4_wrong_answer_formula():
    """Test 4: Normal wrong answer update formula p_tested = p_tested * 0.8."""
    p_initial = 0.5
    p_next = apply_wrong_update(p_initial)
    assert p_next == pytest.approx(0.40, abs=1e-4)

    # Further wrong answer
    p_next2 = apply_wrong_update(p_next)
    assert p_next2 == pytest.approx(0.32, abs=1e-4)
    assert calculate_status(p_next2) == "RED"

def test_5_root_cause_propagation(db_session):
    """Test 5: Wrong answer pointing to a different root topic updates root by * 0.6."""
    student_id = "test_student_prop"
    # Tested: word_problems (0.5), Root: order_of_operations (0.5)
    res = update_mastery_for_attempt(
        db=db_session,
        student_id=student_id,
        tested_topic_id="word_problems",
        is_correct=False,
        time_sec=10.0,
        mistake_type="concept_gap",
        root_topic_id="order_of_operations"
    )

    m_tested = db_session.query(Mastery).filter(
        Mastery.student_id == student_id,
        Mastery.topic_id == "word_problems"
    ).first()
    m_root = db_session.query(Mastery).filter(
        Mastery.student_id == student_id,
        Mastery.topic_id == "order_of_operations"
    ).first()

    # Tested should be 0.5 * 0.8 = 0.4
    assert m_tested.p == pytest.approx(0.40, abs=1e-4)
    assert m_tested.diagnostic_role == "SYMPTOM"

    # Root should be 0.5 * 0.6 = 0.3 (RED)
    assert m_root.p == pytest.approx(0.30, abs=1e-4)
    assert m_root.status == "RED"
    assert m_root.diagnostic_role == "ROOT CAUSE"

def test_6_careless_slips_do_not_propagate(db_session):
    """Test 6: Careless slips reduce tested topic by 0.05 and do not propagate to root."""
    student_id = "test_student_slip"
    # Order of operations starts at 0.5
    m_root = get_or_create_mastery(db_session, student_id, "order_of_operations")
    m_root.p = 0.5

    # Tested topic starts at 0.6
    m_tested = get_or_create_mastery(db_session, student_id, "word_problems")
    m_tested.p = 0.6
    db_session.commit()

    update_mastery_for_attempt(
        db=db_session,
        student_id=student_id,
        tested_topic_id="word_problems",
        is_correct=False,
        time_sec=12.0,
        mistake_type="careless_slip",
        root_topic_id="order_of_operations"
    )

    db_session.refresh(m_tested)
    db_session.refresh(m_root)

    # Tested decreased by absolute 0.05: 0.6 -> 0.55
    assert m_tested.p == pytest.approx(0.55, abs=1e-4)
    # Root topic is completely unchanged!
    assert m_root.p == 0.5
    assert m_root.diagnostic_role != "ROOT CAUSE"

def test_7_fast_mistake_on_mastered_topic_is_careless_slip(db_session):
    """Test 7: Wrong answer under 5 sec on previously mastered topic follows careless-slip rule."""
    student_id = "test_student_fast"
    m_tested = get_or_create_mastery(db_session, student_id, "word_problems")
    m_tested.p = 0.85
    m_tested.status = "GREEN"
    db_session.commit()

    # Student answers in 3.5 seconds
    res = update_mastery_for_attempt(
        db=db_session,
        student_id=student_id,
        tested_topic_id="word_problems",
        is_correct=False,
        time_sec=3.5,
        mistake_type="concept_gap",
        root_topic_id="order_of_operations"
    )

    db_session.refresh(m_tested)
    # Deducted absolute 0.05: 0.85 - 0.05 = 0.80
    assert m_tested.p == pytest.approx(0.80, abs=1e-4)
    assert res["is_careless"] is True

    # Check order_of_operations was NOT propagated to
    m_root = db_session.query(Mastery).filter(
        Mastery.student_id == student_id,
        Mastery.topic_id == "order_of_operations"
    ).first()
    assert (m_root is None or m_root.p == 0.5)
