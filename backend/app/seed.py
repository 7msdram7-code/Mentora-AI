"""
Seed Data for MistakeMirror.
Includes primary subject: Data Structures — Hashing (9 topics, 20+ rich MCQ questions, scripted Q1)
and secondary subject: Simple Maths Problem Solving.
"""
from sqlalchemy.orm import Session
from app.models import Subject, Topic, TopicPrerequisite, Question, Mastery, Attempt, TeachbackSession, TeachbackMessage

SUBJECT_ID = "data_structures_hashing"

# 1. DATA STRUCTURES — HASHING
HASHING_TOPICS = [
    {"id": "arrays", "name": "Arrays", "pages": [1, 2], "prereqs": []},
    {"id": "modulo", "name": "Modulo Arithmetic", "pages": [3, 4], "prereqs": []},
    {"id": "linked_lists", "name": "Linked Lists", "pages": [5, 6], "prereqs": []},
    {"id": "hash_function", "name": "Hash Functions", "pages": [7, 8], "prereqs": ["modulo", "arrays"]},
    {"id": "hash_table", "name": "Hash Tables", "pages": [9, 10], "prereqs": ["hash_function"]},
    {"id": "chaining", "name": "Separate Chaining", "pages": [11, 12], "prereqs": ["hash_table", "linked_lists"]},
    {"id": "linear_probing", "name": "Linear Probing", "pages": [13, 14], "prereqs": ["hash_table"]},
    {"id": "load_factor", "name": "Load Factor", "pages": [15, 16], "prereqs": ["hash_table"]},
    {"id": "rehashing", "name": "Rehashing", "pages": [17, 18], "prereqs": ["load_factor"]},
]

HASHING_QUESTIONS = [
    # Scripted Question 1: Tested Topic: hash_table, Root Topic: modulo
    {
        "id": 1,
        "topic_id": "hash_table",
        "text": "Insert key 25 into a table of size 10 using h(k) = k % 10. Which index?",
        "options": [
            {
                "id": "5",
                "text": "5",
                "mistake_tag": None,
                "misconception": None,
                "root_topic": None
            },
            {
                "id": "25",
                "text": "25",
                "mistake_tag": "forgot_mod_wrap",
                "misconception": "You answered 25 because you treated the hash value as the original key. The root cause is misunderstanding modulo wrap-around. Let's test that belief with another example.",
                "root_topic": "modulo"
            },
            {
                "id": "2",
                "text": "2",
                "mistake_tag": "used_first_digit",
                "misconception": "You extracted the first digit instead of calculating the modulo remainder.",
                "root_topic": "hash_function"
            },
            {
                "id": "0",
                "text": "0",
                "mistake_tag": "used_last_two_digits_wrongly",
                "misconception": "You evaluated the boundary without calculating the remainder.",
                "root_topic": "hash_function"
            }
        ],
        "correct_option": "5",
        "difficulty": "medium",
        "is_counterexample": False
    },
    # Scripted Counter-Example Question: Topic: modulo
    {
        "id": 101,
        "topic_id": "modulo",
        "text": "What is 25 % 10? Calculate the integer remainder when 25 is divided by 10.",
        "options": [
            {
                "id": "5",
                "text": "5 (because 25 = 2 * 10 + 5, so the remainder is 5)",
                "mistake_tag": None,
                "misconception": None,
                "root_topic": None
            },
            {
                "id": "25",
                "text": "25 (the dividend key itself)",
                "mistake_tag": "assumed_no_wrap",
                "misconception": "The remainder must always be strictly less than the divisor 10.",
                "root_topic": "modulo"
            },
            {
                "id": "2",
                "text": "2 (the quotient 25 // 10)",
                "mistake_tag": "confused_quotient_remainder",
                "misconception": "2 is the quotient of integer division, not the remainder.",
                "root_topic": "modulo"
            }
        ],
        "correct_option": "5",
        "difficulty": "easy",
        "is_counterexample": True
    },
    # Topic: Modulo Arithmetic Q2
    {
        "id": 102,
        "topic_id": "modulo",
        "text": "For any positive integer k, what is the valid range of values produced by k % 10?",
        "options": [
            {"id": "A", "text": "0 to 9 inclusive", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "1 to 10 inclusive", "mistake_tag": "off_by_one_modulo", "misconception": "Array indices and modulo begin at 0, not 1.", "root_topic": "modulo"},
            {"id": "C", "text": "0 to 10 inclusive", "mistake_tag": "included_modulus_boundary", "misconception": "The remainder can never equal the divisor itself.", "root_topic": "modulo"}
        ],
        "correct_option": "A",
        "difficulty": "easy",
        "is_counterexample": False
    },
    # Topic: Arrays Q1
    {
        "id": 103,
        "topic_id": "arrays",
        "text": "What is the time complexity of accessing an element in an array by its numeric index?",
        "options": [
            {"id": "A", "text": "O(1) constant time", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "O(n) linear time", "mistake_tag": "confused_lookup_with_search", "misconception": "Index arithmetic calculates memory offset directly in O(1).", "root_topic": "arrays"},
            {"id": "C", "text": "O(log n)", "mistake_tag": "binary_search_confusion", "misconception": "Array index lookup requires no binary comparison.", "root_topic": "arrays"}
        ],
        "correct_option": "A",
        "difficulty": "easy",
        "is_counterexample": False
    },
    # Topic: Arrays Q2
    {
        "id": 104,
        "topic_id": "arrays",
        "text": "Why do hash tables use arrays as their underlying storage buffer?",
        "options": [
            {"id": "A", "text": "Because arrays provide instant O(1) random access via slot indices", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "Because arrays dynamically resize with zero memory overhead", "mistake_tag": "misunderstood_array_sizing", "misconception": "Arrays require full reallocation to resize.", "root_topic": "arrays"},
            {"id": "C", "text": "Because arrays eliminate hash collisions automatically", "mistake_tag": "collision_fallacy", "misconception": "Arrays alone cannot prevent two keys hashing to the same slot.", "root_topic": "hash_table"}
        ],
        "correct_option": "A",
        "difficulty": "medium",
        "is_counterexample": False
    },
    # Topic: Linked Lists Q1
    {
        "id": 105,
        "topic_id": "linked_lists",
        "text": "In separate chaining, what data structure is traditionally maintained at each array bucket?",
        "options": [
            {"id": "A", "text": "A linked list of collision nodes", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "A fixed binary search tree", "mistake_tag": "uncommon_chain_primitive", "misconception": "Standard separate chaining uses lightweight linked lists.", "root_topic": "linked_lists"},
            {"id": "C", "text": "A single primitive integer", "mistake_tag": "ignored_collision_chaining", "misconception": "A primitive integer cannot hold multiple colliding keys.", "root_topic": "chaining"}
        ],
        "correct_option": "A",
        "difficulty": "easy",
        "is_counterexample": False
    },
    # Topic: Linked Lists Q2
    {
        "id": 106,
        "topic_id": "linked_lists",
        "text": "What is the worst-case time complexity to search a linked list of length k at a bucket?",
        "options": [
            {"id": "A", "text": "O(k) traversal through nodes", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "O(1) instant jump", "mistake_tag": "confused_pointer_hop", "misconception": "Pointers must be followed sequentially.", "root_topic": "linked_lists"},
            {"id": "C", "text": "O(k^2)", "mistake_tag": "quadratic_exaggeration", "misconception": "Single linked list traversal is linear in length k.", "root_topic": "linked_lists"}
        ],
        "correct_option": "A",
        "difficulty": "medium",
        "is_counterexample": False
    },
    # Topic: Hash Functions Q1
    {
        "id": 107,
        "topic_id": "hash_function",
        "text": "What is the essential mathematical property of a deterministic hash function?",
        "options": [
            {"id": "A", "text": "Identical keys must always produce the exact same hash code", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "It generates a completely random number on every call", "mistake_tag": "random_generator_fallacy", "misconception": "Random output prevents retrieving stored items on subsequent lookups.", "root_topic": "hash_function"},
            {"id": "C", "text": "It guarantees that no two distinct keys ever share a hash code", "mistake_tag": "collision_free_myth", "misconception": "By Pigeonhole Principle, collisions are inevitable when keyspace exceeds table size.", "root_topic": "hash_function"}
        ],
        "correct_option": "A",
        "difficulty": "easy",
        "is_counterexample": False
    },
    # Topic: Hash Functions Q2
    {
        "id": 108,
        "topic_id": "hash_function",
        "text": "Given a table of size 7, what index does key 19 map to under h(k) = k % 7?",
        "options": [
            {"id": "A", "text": "5 (since 19 = 2 * 7 + 5)", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "2 (the quotient 19 // 7)", "mistake_tag": "quotient_instead_of_remainder", "misconception": "Hash functions use the remainder, not the quotient.", "root_topic": "modulo"},
            {"id": "C", "text": "7 (the divisor)", "mistake_tag": "boundary_remainder_error", "misconception": "Indices in size 7 are strictly in {0, 1, ..., 6}.", "root_topic": "modulo"}
        ],
        "correct_option": "A",
        "difficulty": "medium",
        "is_counterexample": False
    },
    # Topic: Hash Tables Q2
    {
        "id": 109,
        "topic_id": "hash_table",
        "text": "What is the average-case time complexity of insert, search, and delete in a well-distributed hash table?",
        "options": [
            {"id": "A", "text": "O(1) constant average time", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "O(log n) logarithmic time", "mistake_tag": "tree_confusion", "misconception": "Logarithmic time applies to balanced BSTs, not direct hash tables.", "root_topic": "hash_table"},
            {"id": "C", "text": "O(n) linear time", "mistake_tag": "assumed_worst_case", "misconception": "O(n) occurs only in catastrophic worst-case when all keys collide into a single bucket.", "root_topic": "hash_table"}
        ],
        "correct_option": "A",
        "difficulty": "easy",
        "is_counterexample": False
    },
    # Topic: Separate Chaining Q1
    {
        "id": 110,
        "topic_id": "chaining",
        "text": "When two keys k1 and k2 hash to index 3 in separate chaining, how is the collision resolved?",
        "options": [
            {"id": "A", "text": "Both entries are stored as separate linked nodes in the bucket list at index 3", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "k2 overwrites and destroys k1", "mistake_tag": "destructive_write_belief", "misconception": "Hash tables resolve collisions without data loss.", "root_topic": "chaining"},
            {"id": "C", "text": "k2 is placed at index 4 automatically", "mistake_tag": "confused_chaining_with_open_addressing", "misconception": "Probing belongs to open addressing, not separate chaining.", "root_topic": "linear_probing"}
        ],
        "correct_option": "A",
        "difficulty": "medium",
        "is_counterexample": False
    },
    # Topic: Separate Chaining Q2
    {
        "id": 111,
        "topic_id": "chaining",
        "text": "If table size is 10 and 50 keys are inserted with separate chaining, what happens?",
        "options": [
            {"id": "A", "text": "The table operates with an average chain length of 5.0 nodes per bucket", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "The table crashes because load factor exceeds 1.0", "mistake_tag": "chaining_capacity_myth", "misconception": "Separate chaining can store arbitrarily many items (load factor > 1).", "root_topic": "load_factor"},
            {"id": "C", "text": "All 40 excess elements are discarded", "mistake_tag": "dropped_element_fallacy", "misconception": "Chaining dynamically extends bucket lists to preserve all entries.", "root_topic": "chaining"}
        ],
        "correct_option": "A",
        "difficulty": "medium",
        "is_counterexample": False
    },
    # Topic: Linear Probing Q1
    {
        "id": 112,
        "topic_id": "linear_probing",
        "text": "In linear probing, when slot h(k) is occupied, where does the algorithm check next?",
        "options": [
            {"id": "A", "text": "(h(k) + 1) % table_size", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "(h(k) + 1) without modulo wrap-around", "mistake_tag": "forgot_probing_wrap", "misconception": "Probing past the array end must wrap around to index 0 using modulo.", "root_topic": "modulo"},
            {"id": "C", "text": "(h(k))^2 quadratic offset", "mistake_tag": "confused_quadratic_probing", "misconception": "Linear probing increments by 1 step sequentially.", "root_topic": "linear_probing"}
        ],
        "correct_option": "A",
        "difficulty": "easy",
        "is_counterexample": False
    },
    # Topic: Linear Probing Q2
    {
        "id": 113,
        "topic_id": "linear_probing",
        "text": "What major performance problem arises in linear probing when multiple adjacent slots become full?",
        "options": [
            {"id": "A", "text": "Primary clustering, which leads to longer probe sequences", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "Infinite loops during insertion", "mistake_tag": "infinite_loop_belief", "misconception": "Probing terminates once an empty slot is encountered or table is confirmed full.", "root_topic": "linear_probing"},
            {"id": "C", "text": "Memory leaks in garbage collection", "mistake_tag": "unrelated_runtime_issue", "misconception": "Clustering is an algorithmic latency issue, not a memory leak.", "root_topic": "linear_probing"}
        ],
        "correct_option": "A",
        "difficulty": "medium",
        "is_counterexample": False
    },
    # Topic: Load Factor Q1
    {
        "id": 114,
        "topic_id": "load_factor",
        "text": "How is the load factor (alpha) of a hash table defined?",
        "options": [
            {"id": "A", "text": "alpha = n / m (number of stored items divided by number of table slots)", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "alpha = m / n (slots divided by elements)", "mistake_tag": "inverted_ratio", "misconception": "Load factor measures density: items per slot.", "root_topic": "load_factor"},
            {"id": "C", "text": "alpha = n * m", "mistake_tag": "multiplied_capacity", "misconception": "Load factor is an occupancy ratio, not a product.", "root_topic": "load_factor"}
        ],
        "correct_option": "A",
        "difficulty": "easy",
        "is_counterexample": False
    },
    # Topic: Load Factor Q2
    {
        "id": 115,
        "topic_id": "load_factor",
        "text": "In open addressing (e.g., linear probing), what is the theoretical upper limit of the load factor alpha?",
        "options": [
            {"id": "A", "text": "alpha <= 1.0 (each slot can hold at most one item)", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "alpha can be arbitrarily large (e.g. 5.0)", "mistake_tag": "confused_open_addressing_with_chaining", "misconception": "Without external chaining, open addressing runs out of slots when alpha reaches 1.0.", "root_topic": "chaining"},
            {"id": "C", "text": "alpha <= 0.25 strictly", "mistake_tag": "excessive_pessimism", "misconception": "Open addressing commonly operates safely up to alpha = 0.70.", "root_topic": "load_factor"}
        ],
        "correct_option": "A",
        "difficulty": "medium",
        "is_counterexample": False
    },
    # Topic: Rehashing Q1
    {
        "id": 116,
        "topic_id": "rehashing",
        "text": "When a hash table exceeds its load factor threshold and doubles its array size, what must happen to the existing items?",
        "options": [
            {"id": "A", "text": "Every item must be re-inserted by recalculating h(k) % new_table_size", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "Existing items remain at their original indices without re-evaluation", "mistake_tag": "direct_copy_fallacy", "misconception": "Because the modulus M changed, key % M changes index. Direct copying produces unfindable keys.", "root_topic": "modulo"},
            {"id": "C", "text": "All items are hashed to index 0", "mistake_tag": "reset_myth", "misconception": "Rehashing redistributes items across the new capacity.", "root_topic": "rehashing"}
        ],
        "correct_option": "A",
        "difficulty": "medium",
        "is_counterexample": False
    },
    # Topic: Rehashing Q2
    {
        "id": 117,
        "topic_id": "rehashing",
        "text": "Why is the amortized cost of insertions in a dynamic hash table still O(1) despite occasional O(n) rehashing?",
        "options": [
            {"id": "A", "text": "Because table doubling occurs exponentially less frequently as size increases", "mistake_tag": None, "misconception": None, "root_topic": None},
            {"id": "B", "text": "Because rehashing runs in O(1) time", "mistake_tag": "instant_rehash_myth", "misconception": "Rehashing n items requires O(n) operations.", "root_topic": "rehashing"},
            {"id": "C", "text": "Because only new elements are rehashed", "mistake_tag": "partial_rehash_error", "misconception": "All existing elements must be relocated to the expanded table.", "root_topic": "rehashing"}
        ],
        "correct_option": "A",
        "difficulty": "hard",
        "is_counterexample": False
    }
]

# 2. SECONDARY SUBJECT: SIMPLE MATHS PROBLEM SOLVING (PRESERVED)
MATHS_TOPICS = [
    {"id": "arithmetic_basics", "name": "Basic Arithmetic", "pages": [1, 2], "prereqs": []},
    {"id": "multiplication", "name": "Multiplication & Division", "pages": [3, 4], "prereqs": ["arithmetic_basics"]},
    {"id": "negative_numbers", "name": "Negative Numbers & Signs", "pages": [5, 6], "prereqs": ["arithmetic_basics"]},
    {"id": "order_of_operations", "name": "Order of Operations (PEMDAS)", "pages": [7, 8], "prereqs": ["arithmetic_basics", "multiplication"]},
    {"id": "fractions_decimals", "name": "Fractions & Decimals", "pages": [9, 10], "prereqs": ["multiplication"]},
    {"id": "percentages", "name": "Percentages & Ratios", "pages": [11, 12], "prereqs": ["fractions_decimals"]},
    {"id": "linear_equations", "name": "Simple Equations", "pages": [13, 14], "prereqs": ["order_of_operations", "negative_numbers"]},
    {"id": "word_problems", "name": "Math Word Problems", "pages": [15, 16], "prereqs": ["linear_equations", "percentages"]},
    {"id": "proportions_scaling", "name": "Proportions & Unit Rates", "pages": [17, 18], "prereqs": ["percentages"]},
]

def seed_database(db: Session, force_reset_demo: bool = False):
    """
    Seeds both Data Structures — Hashing (primary demo subject) and Simple Maths.
    Initializes demo_student masteries at baseline p = 0.50 (AMBER).
    """
    # 1. Primary Subject: Data Structures — Hashing
    sub_hash = db.query(Subject).filter(Subject.id == SUBJECT_ID).first()
    if not sub_hash:
        sub_hash = Subject(
            id=SUBJECT_ID,
            name="Data Structures — Hashing",
            description="Core concepts of hash functions, collision resolution, modulo wrap-around, and dynamic tables."
        )
        db.add(sub_hash)
        db.flush()

    # Seed Hashing Topics
    for t_data in HASHING_TOPICS:
        t_obj = db.query(Topic).filter(Topic.id == t_data["id"]).first()
        if not t_obj:
            t_obj = Topic(
                id=t_data["id"],
                subject_id=SUBJECT_ID,
                name=t_data["name"],
                pages=t_data["pages"]
            )
            db.add(t_obj)
    db.flush()

    # Seed Hashing Prerequisite edges
    for t_data in HASHING_TOPICS:
        for p_id in t_data["prereqs"]:
            edge = db.query(TopicPrerequisite).filter(
                TopicPrerequisite.topic_id == t_data["id"],
                TopicPrerequisite.prerequisite_id == p_id
            ).first()
            if not edge:
                edge = TopicPrerequisite(
                    topic_id=t_data["id"],
                    prerequisite_id=p_id
                )
                db.add(edge)
    db.flush()

    # Seed Hashing Questions
    for q_data in HASHING_QUESTIONS:
        q_obj = db.query(Question).filter(Question.id == q_data["id"]).first()
        if not q_obj:
            q_obj = Question(
                id=q_data["id"],
                topic_id=q_data["topic_id"],
                type="mcq",
                text=q_data["text"],
                options=q_data["options"],
                correct_option=q_data["correct_option"],
                difficulty=q_data["difficulty"],
                is_counterexample=q_data.get("is_counterexample", False)
            )
            db.add(q_obj)
        else:
            # Update scripted question metadata if existing
            q_obj.topic_id = q_data["topic_id"]
            q_obj.text = q_data["text"]
            q_obj.options = q_data["options"]
            q_obj.correct_option = q_data["correct_option"]
    db.flush()

    # 2. Secondary Subject: Simple Maths (Preserved)
    sub_math = db.query(Subject).filter(Subject.id == "simple_maths").first()
    if not sub_math:
        sub_math = Subject(
            id="simple_maths",
            name="Simple Maths Problem Solving",
            description="Foundations of basic arithmetic, order of operations, and proportional reasoning."
        )
        db.add(sub_math)
        db.flush()

    for t_data in MATHS_TOPICS:
        t_obj = db.query(Topic).filter(Topic.id == t_data["id"]).first()
        if not t_obj:
            t_obj = Topic(
                id=t_data["id"],
                subject_id="simple_maths",
                name=t_data["name"],
                pages=t_data["pages"]
            )
            db.add(t_obj)
    db.flush()

    # 3. Initialize or Reset demo_student Masteries
    student_id = "demo_student"
    if force_reset_demo:
        # Clear prior attempts and teachback sessions
        db.query(Attempt).filter(Attempt.student_id == student_id).delete()
        db.query(TeachbackMessage).filter(
            TeachbackMessage.session_id.in_(
                db.query(TeachbackSession.id).filter(TeachbackSession.student_id == student_id)
            )
        ).delete(synchronize_session=False)
        db.query(TeachbackSession).filter(TeachbackSession.student_id == student_id).delete()
        db.flush()

    # Set all topics to baseline p = 0.50, AMBER, OK
    all_topic_ids = [t["id"] for t in HASHING_TOPICS] + [t["id"] for t in MATHS_TOPICS]
    for tid in all_topic_ids:
        mastery = db.query(Mastery).filter(
            Mastery.student_id == student_id,
            Mastery.topic_id == tid
        ).first()
        if not mastery:
            mastery = Mastery(
                student_id=student_id,
                topic_id=tid,
                p=0.5,
                status="AMBER",
                diagnostic_role="OK"
            )
            db.add(mastery)
        elif force_reset_demo:
            mastery.p = 0.5
            mastery.status = "AMBER"
            mastery.diagnostic_role = "OK"

    # 4. Initialize MirrorPet and Student Profile
    try:
        from app.routers.pet import ensure_pet_setup
        ensure_pet_setup(db, student_id)
    except Exception:
        pass

    db.commit()
