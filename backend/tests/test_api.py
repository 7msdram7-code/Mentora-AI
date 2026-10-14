import pytest
from app.models import Mastery

def test_api_health(client):
    """Test health endpoint."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"

def test_api_subjects_and_graph(client):
    """Test listing subjects and subject graph."""
    res = client.get("/api/subjects")
    assert res.status_code == 200
    subs = res.json()
    assert len(subs) >= 1
    
    # Primary subject is data_structures_hashing
    hash_sub = next((s for s in subs if s["id"] == "data_structures_hashing"), subs[0])
    assert hash_sub["id"] == "data_structures_hashing"

    res_graph = client.get(f"/api/subjects/{hash_sub['id']}/graph?student_id=demo_student")
    assert res_graph.status_code == 200
    graph = res_graph.json()
    assert len(graph["nodes"]) == 9
    assert len(graph["edges"]) >= 8

def test_11_duplicate_submissions_idempotency(client, db_session):
    """Test 11: Duplicate submissions do not apply mastery changes twice."""
    payload = {
        "student_id": "demo_student",
        "question_id": 1,
        "answer": "25",
        "time_sec": 12.0
    }

    # First submission
    res1 = client.post("/api/answers", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["correct"] is False
    assert data1["root_topic"] == "modulo"

    # Check modulo mastery after 1st submission: 0.5 * 0.6 = 0.3
    m_root = db_session.query(Mastery).filter(
        Mastery.student_id == "demo_student",
        Mastery.topic_id == "modulo"
    ).first()
    assert m_root.p == pytest.approx(0.30, abs=1e-3)

    # Immediately submit duplicate answer
    res2 = client.post("/api/answers", json=payload)
    assert res2.status_code == 200

    db_session.refresh(m_root)
    # Mastery score must NOT be reduced again! It remains 0.30
    assert m_root.p == pytest.approx(0.30, abs=1e-3)

def test_12_counter_example_answer_updates_target(client, db_session):
    """Test 12: Answering counter-example updates modulo (0.3 -> 0.475)."""
    # 1. Answer Q1 wrong with '25'
    client.post("/api/answers", json={
        "student_id": "demo_student",
        "question_id": 1,
        "answer": "25",
        "time_sec": 12.0
    })

    m_root = db_session.query(Mastery).filter(
        Mastery.student_id == "demo_student",
        Mastery.topic_id == "modulo"
    ).first()
    assert m_root.p == pytest.approx(0.30, abs=1e-3)
    assert m_root.status == "RED"

    # 2. Answer counter-example (Q101) correctly with '5'
    res_ce = client.post("/api/answers", json={
        "student_id": "demo_student",
        "question_id": 101,
        "answer": "5",
        "time_sec": 8.0,
        "parent_attempt_id": 1
    })
    assert res_ce.status_code == 200
    data_ce = res_ce.json()
    assert data_ce["correct"] is True
    assert data_ce["addressed_misconception"] is True

    # Modulo recovered: 0.3 + (1 - 0.3) * 0.25 = 0.475 (AMBER)
    db_session.refresh(m_root)
    assert m_root.p == pytest.approx(0.475, abs=1e-3)
    assert m_root.status == "AMBER"

def test_13_demo_reset_and_load_repeatable(client, db_session):
    """Test 13: Demo reset and load are repeatable without duplicating records."""
    # Reset
    res_reset = client.post("/api/demo/reset")
    assert res_reset.status_code == 200

    # Load
    res_load = client.post("/api/demo/load")
    assert res_load.status_code == 200
    data_load = res_load.json()
    assert data_load["student_id"] == "demo_student"
    assert data_load["scripted_question_id"] == 1
    assert data_load["subject_id"] == "data_structures_hashing"
    assert data_load["mastery_summary"]["modulo"] == 0.5
    assert data_load["mastery_summary"]["hash_table"] == 0.5

    # Run load again to verify idempotency
    res_load2 = client.post("/api/demo/load")
    assert res_load2.status_code == 200
    data_load2 = res_load2.json()
    assert data_load2["mastery_summary"]["modulo"] == 0.5
