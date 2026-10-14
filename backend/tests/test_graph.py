import pytest
from app.graph import (
    trace_prerequisite_chain,
    find_path_dfs,
    validate_dag
)

def test_8_prerequisite_trace_ordering(db_session):
    """Test 8: Prerequisite trace returns ordered path from root prerequisite to tested topic."""
    student_id = "test_student_trace"
    # Given root: order_of_operations, tested: word_problems
    # Dependency: order_of_operations -> linear_equations -> word_problems
    trace = trace_prerequisite_chain(
        db=db_session,
        student_id=student_id,
        tested_topic_id="word_problems",
        root_topic_id="order_of_operations"
    )

    ids = [node["id"] for node in trace]
    assert ids[0] == "order_of_operations"
    assert ids[-1] == "word_problems"
    assert trace[0]["role"] == "ROOT CAUSE"
    assert trace[-1]["role"] == "SYMPTOM"

def test_9_cycles_do_not_cause_infinite_loop():
    """Test 9: Cycles in graph do not cause infinite recursion."""
    # Graph with cycle: A -> B -> C -> A
    adj = {
        "A": ["B"],
        "B": ["C"],
        "C": ["A"]
    }
    path = find_path_dfs("A", "D", adj, set())
    assert path is None

    path_to_c = find_path_dfs("A", "C", adj, set())
    assert path_to_c == ["A", "B", "C"]

def test_10_invalid_root_topic_safe(db_session):
    """Test 10: Invalid root-topic IDs are handled safely without crashing."""
    student_id = "test_student_invalid"
    trace = trace_prerequisite_chain(
        db=db_session,
        student_id=student_id,
        tested_topic_id="word_problems",
        root_topic_id="non_existent_topic_123"
    )
    assert len(trace) >= 1
    ids = [node["id"] for node in trace]
    assert "word_problems" in ids

def test_15_uploaded_graph_validation():
    """Test 15: Uploaded-note graph validation rejects invalid dependencies and cycles."""
    # 1. Valid DAG
    valid_topics = [
        {"id": "A", "name": "Topic A", "prerequisites": []},
        {"id": "B", "name": "Topic B", "prerequisites": ["A"]},
        {"id": "C", "name": "Topic C", "prerequisites": ["B"]}
    ]
    ok, err = validate_dag(valid_topics)
    assert ok is True
    assert err is None

    # 2. Cycle: A -> B -> C -> A
    cyclic_topics = [
        {"id": "A", "name": "Topic A", "prerequisites": ["C"]},
        {"id": "B", "name": "Topic B", "prerequisites": ["A"]},
        {"id": "C", "name": "Topic C", "prerequisites": ["B"]}
    ]
    ok, err = validate_dag(cyclic_topics)
    assert ok is False
    assert "Cycle" in err

    # 3. Non-existent prerequisite reference
    dangling_topics = [
        {"id": "A", "name": "Topic A", "prerequisites": ["NON_EXISTENT"]}
    ]
    ok, err = validate_dag(dangling_topics)
    assert ok is False
    assert "unknown prerequisite" in err
