import pytest
from unittest.mock import patch
from app.llm import LLMClient
from app.extractor import generate_draft_from_extracted_pages

def test_14_invalid_llm_json_triggers_fallback():
    """Test 14: Invalid LLM JSON triggers safe deterministic fallback without crashing."""
    client = LLMClient()
    client.use_mock = False
    client.gemini_key = "dummy_key"

    # Mock _call_llm_json to return invalid broken JSON
    with patch.object(client, "_call_llm_json", return_value="INVALID_NON_JSON_OUTPUT_ERROR"):
        diag = client.diagnose(
            question_text="What is 10 - 2 * 3?",
            correct_answer="4",
            student_answer="24",
            tested_topic_id="order_of_operations",
            available_topics=["order_of_operations", "arithmetic_basics"]
        )
        assert diag is not None
        assert diag.root_topic == "order_of_operations"
        assert diag.mistake_type in ["concept_gap", "wrong_mental_model", "careless_slip", "missing_prerequisite"]

def test_notes_draft_generation():
    """Test generating a draft topic graph from extracted note pages."""
    pages = [
        {"page": 1, "text": "Basic arithmetic includes addition and subtraction. Multiplication repeats addition."},
        {"page": 2, "text": "Order of operations PEMDAS dictates multiplication precedes addition."}
    ]
    draft = generate_draft_from_extracted_pages("Mathematics Problem Solving Notes", pages)
    assert draft is not None
    assert len(draft.topics) >= 3
    assert len(draft.questions) >= 1
