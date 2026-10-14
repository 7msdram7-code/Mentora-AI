"""
Provider-independent LLM wrapper with deterministic offline fallbacks,
Pydantic validation, retry logic, and Tamil bilingual support.
Curriculum: Simple Maths Problem Solving
"""
import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

# Output Schemas
class DiagnosisOutput(BaseModel):
    mistake_type: str = Field(description="concept_gap, careless_slip, wrong_mental_model, or missing_prerequisite")
    misconception: str
    root_topic: str
    confidence: float = 0.9

class CounterExampleOutput(BaseModel):
    question: str
    options: List[Dict[str, str]]
    correct: str
    why_belief_fails: str

class TeachbackReplyOutput(BaseModel):
    reply: str

class TeachbackFinishGap(BaseModel):
    topic_id: str
    gap: str

class TeachbackFinishOutput(BaseModel):
    gaps: List[TeachbackFinishGap]
    score: int = Field(ge=0, le=100)
    feedback: str

# Deterministic Fallback Data for Hashing and Maths Problem Solving
OFFLINE_DIAGNOSES = {
    # Scripted Hashing Demo Q1: Insert 25 into table of size 10 using h(k)=k%10 (tested topic: hash_table)
    ("hash_table", "25"): DiagnosisOutput(
        mistake_type="concept_gap",
        misconception="You answered 25 because you treated the hash value as the original key. The root cause is misunderstanding modulo wrap-around. Let's test that belief with another example.",
        root_topic="modulo",
        confidence=0.98
    ),
    ("hash_table", "2"): DiagnosisOutput(
        mistake_type="wrong_mental_model",
        misconception="You extracted the first digit instead of calculating the modulo remainder.",
        root_topic="hash_function",
        confidence=0.95
    ),
    ("hash_table", "0"): DiagnosisOutput(
        mistake_type="concept_gap",
        misconception="You used the last two digits without calculating the remainder.",
        root_topic="hash_function",
        confidence=0.90
    ),
    ("hash_function", "25"): DiagnosisOutput(
        mistake_type="concept_gap",
        misconception="You answered 25 because you treated the hash value as the original key. The root cause is misunderstanding modulo wrap-around. Let's test that belief with another example.",
        root_topic="modulo",
        confidence=0.98
    ),
    # Maths Problem Solving Scripted Q1 "50" answer ($6 + 4 * 5)
    ("word_problems", "50"): DiagnosisOutput(
        mistake_type="concept_gap",
        misconception="You answered 50 because you calculated (6 + 4) * 5 = 10 * 5 = 50, performing addition before multiplication.",
        root_topic="order_of_operations",
        confidence=0.98
    ),
    ("word_problems", "20"): DiagnosisOutput(
        mistake_type="concept_gap",
        misconception="You calculated 4 * 5 = 20 for the notebooks, but forgot to add the flat $6 shipping fee.",
        root_topic="arithmetic_basics",
        confidence=0.92
    ),
    ("order_of_operations", "24"): DiagnosisOutput(
        mistake_type="wrong_mental_model",
        misconception="You calculated (10 - 2) * 3 = 8 * 3 = 24 by evaluating left-to-right rather than multiplying first.",
        root_topic="order_of_operations",
        confidence=0.95
    ),
}

OFFLINE_COUNTEREXAMPLES = {
    "modulo": CounterExampleOutput(
        question="What is 25 % 10? Calculate the integer remainder when 25 is divided by 10.",
        options=[
            {"id": "5", "text": "5 (because 25 = 2 * 10 + 5, so the remainder is 5)"},
            {"id": "25", "text": "25 (the dividend itself)"},
            {"id": "2", "text": "2 (the quotient 25 // 10)"}
        ],
        correct="5",
        why_belief_fails="Modulo arithmetic k % N wraps keys into range [0, N-1]. The index is strictly the remainder, never the original key."
    ),
    "hash_function": CounterExampleOutput(
        question="If table size is 10 and h(k) = k % 10, can any key produce an index of 10 or greater?",
        options=[
            {"id": "A", "text": "No, remainder modulo 10 can only be 0 through 9."},
            {"id": "B", "text": "Yes, large keys produce indices equal to their value."}
        ],
        correct="A",
        why_belief_fails="The modulo operation bounds all indices strictly below the divisor."
    ),
    "order_of_operations": CounterExampleOutput(
        question="If you buy 5 notebooks at $4 each, what is the cost of the notebooks alone before adding the $6 shipping?",
        options=[
            {"id": "A", "text": "$20 (because 5 * 4 = 20, which is then added to the $6 shipping to make $26)"},
            {"id": "B", "text": "$50 (as if the shipping fee were also multiplied by 5)"},
            {"id": "C", "text": "$10"}
        ],
        correct="A",
        why_belief_fails="Multiplication groups repeated quantities into a subtotal ($20) first. Standalone flat fees ($6) are added after, not multiplied."
    ),
    "arithmetic_basics": CounterExampleOutput(
        question="If you have 15 apples, give away 7, and then find 4 more, do you subtract (7 + 4 = 11) from 15?",
        options=[
            {"id": "A", "text": "No, you do 15 - 7 = 8 first, and then add 4 to get 12."},
            {"id": "B", "text": "Yes, addition must always happen before subtraction."}
        ],
        correct="A",
        why_belief_fails="Addition and subtraction have equal precedence and must be performed sequentially from left to right."
    )
}

TAMIL_TRANSLATIONS = {
    "You answered 25 because you treated the hash value as the original key. The root cause is misunderstanding modulo wrap-around. Let's test that belief with another example.":
        "நீங்கள் 25 என்று பதிலளித்தீர்கள், ஏனெனில் hash மதிப்பை அசலான key என நினைத்துவிட்டீர்கள். இதன் root cause modulo wrap-around பற்றிய புரிதல் குறைபாடாகும். மற்றொரு உதாரணத்தைக் கொண்டு அதை சோதிப்போம்.",
    "You answered 50 because you calculated (6 + 4) * 5 = 10 * 5 = 50, adding before multiplying.": 
        "நீங்கள் 50 என்று பதிலளித்தீர்கள், ஏனெனில் பெருக்கலுக்கு (multiplication) முன்பே கூட்டலை (addition) செய்துவிட்டீர்கள்.",
    "The root cause is misunderstanding Order of Operations (PEMDAS). Let's test that belief with another example.":
        "இதன் root cause Order of Operations (PEMDAS / BODMAS) பற்றிய புரிதல் குறைபாடாகும். மற்றொரு உதாரணத்தைக் கொண்டு அதை சோதிப்போம்.",
    "Correct! You have successfully mastered this concept.":
        "சரியானது! நீங்கள் இந்த விதியை வெற்றிகரமாக புரிந்து கொண்டீர்கள்.",
    "Correct! You have successfully addressed the misconception and verified the underlying concept.":
        "சரியானது! நீங்கள் தவறான புரிதலைத் தீர்த்து, அடிப்படைக் கருத்தை உறுதிப்படுத்தியுள்ளீர்கள்.",
    "That is incorrect.":
        "அது தவறானது.",
}

def translate_explanation_to_tamil(text: str) -> str:
    """Translates explanation text into Tamil while preserving technical terms."""
    if text in TAMIL_TRANSLATIONS:
        return TAMIL_TRANSLATIONS[text]
    tamil_prefix = "விளக்கம் (Explanation): "
    return f"{tamil_prefix}{text} (கணித விதி: Order of Operations மற்றும் PEMDAS விதிகளை கவனியுங்கள்)."

class LLMClient:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.use_mock = settings.USE_MOCK_LLM
        self.gemini_key = settings.GEMINI_API_KEY
        self.anthropic_key = settings.ANTHROPIC_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_MODEL
        self.ollama_base_url = settings.OLLAMA_BASE_URL
        self.ollama_model = settings.OLLAMA_MODEL

    def _call_groq(self, system_prompt: str, user_prompt: str) -> str:
        """Calls real open-source Llama-3.3-70B model via Groq API."""
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.groq_model,
            "messages": [
                {"role": "system", "content": system_prompt + "\nReturn ONLY valid JSON."},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }
        with httpx.Client(timeout=20.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    def _call_ollama(self, system_prompt: str, user_prompt: str) -> str:
        """Calls local open-source model through Ollama."""
        url = f"{self.ollama_base_url}/api/generate"
        payload = {
            "model": self.ollama_model,
            "prompt": f"{system_prompt}\n\n{user_prompt}\n\nOutput ONLY valid JSON.",
            "stream": False,
            "format": "json"
        }
        with httpx.Client(timeout=25.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "")

    def _call_gemini(self, system_prompt: str, user_prompt: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    def _call_anthropic(self, system_prompt: str, user_prompt: str) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.anthropic_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1024,
            "system": system_prompt + "\nReturn ONLY valid JSON.",
            "messages": [{"role": "user", "content": user_prompt}],
            "temperature": 0.2
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]

    def _call_llm_json(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        if self.use_mock:
            return None
        if self.provider == "ollama":
            pass
        elif self.provider == "groq" and self.groq_key:
            pass
        elif not self.gemini_key and not self.anthropic_key and not self.groq_key:
            return None

        for attempt in range(2):
            try:
                if self.provider == "groq" and self.groq_key:
                    return self._call_groq(system_prompt, user_prompt)
                elif self.provider == "ollama":
                    return self._call_ollama(system_prompt, user_prompt)
                elif self.provider == "anthropic" and self.anthropic_key:
                    return self._call_anthropic(system_prompt, user_prompt)
                elif self.gemini_key:
                    return self._call_gemini(system_prompt, user_prompt)
            except Exception as e:
                logger.warning(f"LLM call attempt {attempt+1} failed: {e}")
        return None

    def diagnose(
        self,
        question_text: str,
        correct_answer: str,
        student_answer: str,
        tested_topic_id: str,
        available_topics: List[str]
    ) -> DiagnosisOutput:
        """Prompt A: Diagnose student mistake root cause."""
        lookup_key = (tested_topic_id, student_answer.strip())
        if lookup_key in OFFLINE_DIAGNOSES:
            return OFFLINE_DIAGNOSES[lookup_key]

        sys_prompt = (
            "You are an expert diagnostic math tutor. Identify WHY the student gave an incorrect answer. "
            "Return JSON matching: {\"mistake_type\": \"concept_gap|careless_slip|wrong_mental_model|missing_prerequisite\", "
            "\"misconception\": \"One sentence explanation\", \"root_topic\": \"<one of available topics>\", \"confidence\": 0.95}"
        )
        user_prompt = (
            f"Question: {question_text}\n"
            f"Correct Answer: {correct_answer}\n"
            f"Student Answer: {student_answer}\n"
            f"Tested Topic: {tested_topic_id}\n"
            f"Available Topics: {available_topics}"
        )
        raw = self._call_llm_json(sys_prompt, user_prompt)
        if raw:
            try:
                data = json.loads(raw)
                if data.get("root_topic") not in available_topics:
                    data["root_topic"] = tested_topic_id
                return DiagnosisOutput.model_validate(data)
            except Exception as e:
                logger.warning(f"Failed parsing LLM diagnosis: {e}")

        return DiagnosisOutput(
            mistake_type="concept_gap",
            misconception=f"Answer '{student_answer}' indicates an incomplete grasp of {tested_topic_id}.",
            root_topic=tested_topic_id,
            confidence=0.85
        )

    def generate_counter_example(
        self,
        question_text: str,
        student_answer: str,
        misconception: str,
        root_topic: str
    ) -> CounterExampleOutput:
        """Prompt B: Generate counter-example challenging the misconception."""
        if root_topic in OFFLINE_COUNTEREXAMPLES:
            return OFFLINE_COUNTEREXAMPLES[root_topic]

        sys_prompt = (
            "Generate a targeted counter-example math question that directly challenges the student's incorrect belief. "
            "Return JSON matching: {\"question\": \"...\", \"options\": [{\"id\":\"A\", \"text\":\"...\"}], "
            "\"correct\": \"A\", \"why_belief_fails\": \"...\"}"
        )
        user_prompt = (
            f"Original Question: {question_text}\n"
            f"Student's Incorrect Answer: {student_answer}\n"
            f"Identified Misconception: {misconception}\n"
            f"Root Topic: {root_topic}"
        )
        raw = self._call_llm_json(sys_prompt, user_prompt)
        if raw:
            try:
                data = json.loads(raw)
                return CounterExampleOutput.model_validate(data)
            except Exception as e:
                logger.warning(f"Failed parsing counter example: {e}")

        return CounterExampleOutput(
            question=f"In {root_topic}, why does applying the standard operation invalidate the answer '{student_answer}'?",
            options=[
                {"id": "A", "text": "Because mathematical hierarchy mandates resolving higher-precedence operations first."},
                {"id": "B", "text": "Because calculations can be performed in any arbitrary sequence."}
            ],
            correct="A",
            why_belief_fails=f"Foundational rules in {root_topic} govern the exact sequence of steps."
        )

    def teachback_chat(
        self,
        topic_name: str,
        conversation_history: List[Dict[str, str]],
        language: str = "en"
    ) -> str:
        """Prompt D: AI junior student persona questioning user on math concepts."""
        sys_prompt = (
            "You are a curious, slightly confused junior student learning basic mathematics. "
            "Never correct the user directly. Ask naive follow-up questions about their explanation. "
            "Encourage the user to explain their reasoning with concrete numbers (e.g., buying apples or pens). "
            "Keep responses friendly, concise (1-2 sentences), and beginner-friendly."
        )
        user_prompt = f"Topic: {topic_name}\nConversation:\n"
        for m in conversation_history:
            user_prompt += f"{m['sender']}: {m['message']}\n"
        user_prompt += "junior:"

        raw = self._call_llm_json(sys_prompt, user_prompt)
        if raw:
            try:
                if raw.strip().startswith("{"):
                    return json.loads(raw).get("reply", raw)
                return raw.strip()
            except Exception:
                pass

        replies_en = [
            f"Oh, I see! But why can't we just do the math left-to-right as we read it in {topic_name}?",
            "Wait, what happens if there are brackets or parentheses involved? Do those change the order?",
            "Could you give me a simple example with everyday items like buying 3 notebooks and 2 pens?"
        ]
        replies_ta = [
            f"ஓ, புரிகிறது! ஆனால் நாம் {topic_name}-ல் வாசிப்பது போல் இடமிருந்து வலமாக கூட்ட முடியாதா?",
            "ஒரு நிமிடம், அடைப்புக் குறிகள் (brackets) இருந்தால் என்ன நடக்கும்? அது வரிசையை மாற்றுமா?",
            "3 நோட்டுப்புத்தகங்கள் மற்றும் 2 பேனாக்கள் வாங்குவது போன்ற ஒரு எளிய உதாரணம் கூற முடியுமா?"
        ]
        turn = len(conversation_history) // 2
        pool = replies_ta if language == "ta" else replies_en
        return pool[turn % len(pool)]

    def teachback_finish(
        self,
        topic_id: str,
        topic_name: str,
        conversation_history: List[Dict[str, str]]
    ) -> TeachbackFinishOutput:
        """Evaluate teachback session and pinpoint gaps."""
        sys_prompt = (
            "Evaluate the student's mathematical explanation in the teach-back conversation. "
            "Identify knowledge gaps and provide an overall score (0-100). "
            "Return JSON: {\"gaps\": [{\"topic_id\": \"...\", \"gap\": \"...\"}], \"score\": 75, \"feedback\": \"...\"}"
        )
        user_prompt = f"Topic: {topic_name} ({topic_id})\nConversation:\n"
        for m in conversation_history:
            user_prompt += f"{m['sender']}: {m['message']}\n"

        raw = self._call_llm_json(sys_prompt, user_prompt)
        if raw:
            try:
                data = json.loads(raw)
                return TeachbackFinishOutput.model_validate(data)
            except Exception:
                pass

        user_msgs = [m["message"] for m in conversation_history if m["sender"] == "user"]
        total_len = sum(len(m.split()) for m in user_msgs)
        if total_len > 25:
            return TeachbackFinishOutput(
                gaps=[],
                score=88,
                feedback=f"Excellent explanation of {topic_name}! You clearly conveyed why operation precedence matters using relatable examples."
            )
        else:
            return TeachbackFinishOutput(
                gaps=[
                    TeachbackFinishGap(
                        topic_id=topic_id,
                        gap=f"Explanation was brief and did not clearly walk through a numerical example of {topic_name}."
                    )
                ],
                score=65,
                feedback=f"Good start explaining {topic_name}, but try illustrating with a concrete calculation like 6 + 4 * 5 to make it crystal clear."
            )

llm_client = LLMClient()
