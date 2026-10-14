"""
Graph Engine for MistakeMirror.
Provides Depth-First Search prerequisite traversal, cycle avoidance,
weakest path finding, and DAG validation.
"""
from typing import List, Dict, Set, Optional, Tuple, Any
from sqlalchemy.orm import Session
from app.models import Topic, TopicPrerequisite, Mastery
from app.mastery import get_or_create_mastery

def get_prerequisite_map(db: Session, subject_id: Optional[str] = None) -> Dict[str, List[str]]:
    """
    Builds adjacency mapping: topic_id -> list of prerequisite topic_ids.
    Optionally filters by subject_id.
    """
    query = db.query(TopicPrerequisite)
    if subject_id:
        query = query.join(Topic, Topic.id == TopicPrerequisite.topic_id).filter(Topic.subject_id == subject_id)
    edges = query.all()
    
    prereq_map: Dict[str, List[str]] = {}
    for edge in edges:
        if edge.topic_id not in prereq_map:
            prereq_map[edge.topic_id] = []
        prereq_map[edge.topic_id].append(edge.prerequisite_id)
    return prereq_map

def find_path_dfs(
    start: str,
    target: str,
    adj_forward: Dict[str, List[str]],
    visited: Optional[Set[str]] = None
) -> Optional[List[str]]:
    """
    Finds a path from `start` to `target` in the dependency forward direction
    (i.e., from prerequisite -> dependent).
    Guarantees cycle avoidance using `visited`.
    """
    if visited is None:
        visited = set()
    
    if start == target:
        return [start]
    
    visited.add(start)
    # Sort for deterministic tie-breaking
    neighbors = sorted(adj_forward.get(start, []))
    for neighbor in neighbors:
        if neighbor not in visited:
            subpath = find_path_dfs(neighbor, target, adj_forward, visited)
            if subpath:
                return [start] + subpath
    return None

def trace_prerequisite_chain(
    db: Session,
    student_id: str,
    tested_topic_id: str,
    root_topic_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Traces the prerequisite chain from the root prerequisite toward the tested topic.
    Returns list of dicts with: id, name, p, status, role.
    """
    # 1. Fetch all topics and build forward map: prerequisite -> dependent
    topics = db.query(Topic).all()
    topic_dict = {t.id: t.name for t in topics}

    edges = db.query(TopicPrerequisite).all()
    forward_map: Dict[str, List[str]] = {}
    for edge in edges:
        if edge.prerequisite_id not in forward_map:
            forward_map[edge.prerequisite_id] = []
        forward_map[edge.prerequisite_id].append(edge.topic_id)

    # If root_topic_id is specified and distinct
    chain_ids: List[str] = []
    if root_topic_id and root_topic_id in topic_dict and root_topic_id != tested_topic_id:
        path = find_path_dfs(root_topic_id, tested_topic_id, forward_map, set())
        if path:
            chain_ids = path
        else:
            # If no direct dependency path found, connect root and tested directly
            chain_ids = [root_topic_id, tested_topic_id]
    else:
        # If no root specified or invalid, trace from weakest prerequisite
        # Build backwards map: topic -> prerequisites
        backward_map: Dict[str, List[str]] = {}
        for edge in edges:
            if edge.topic_id not in backward_map:
                backward_map[edge.topic_id] = []
            backward_map[edge.topic_id].append(edge.prerequisite_id)

        # DFS find all reachable prerequisites
        reachable_prereqs: Set[str] = set()
        stack = [tested_topic_id]
        seen = {tested_topic_id}
        while stack:
            curr = stack.pop()
            for p in backward_map.get(curr, []):
                if p not in seen:
                    seen.add(p)
                    reachable_prereqs.add(p)
                    stack.append(p)

        if reachable_prereqs:
            # Find weakest prerequisite by score, tie-breaking by topic_id alphabetically
            scores = []
            for pid in sorted(reachable_prereqs):
                m = get_or_create_mastery(db, student_id, pid)
                scores.append((m.p, pid))
            scores.sort(key=lambda x: (x[0], x[1]))
            weakest_prereq = scores[0][1]
            path = find_path_dfs(weakest_prereq, tested_topic_id, forward_map, set())
            chain_ids = path if path else [weakest_prereq, tested_topic_id]
        else:
            chain_ids = [tested_topic_id]

    # Build output nodes
    result = []
    for idx, tid in enumerate(chain_ids):
        m = get_or_create_mastery(db, student_id, tid)
        name = topic_dict.get(tid, tid)
        
        # Determine diagnostic role along trace
        if idx == 0 and len(chain_ids) > 1:
            role = "ROOT CAUSE"
        elif idx == len(chain_ids) - 1:
            role = "SYMPTOM"
        else:
            role = "PREREQUISITE"

        result.append({
            "id": tid,
            "name": name,
            "p": m.p,
            "status": m.status,
            "role": role
        })

    return result

def validate_dag(topics: List[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
    """
    Validates a proposed topic graph:
    - Unique topic IDs
    - All prerequisite IDs must exist in topics
    - No cycles (must be a valid DAG)
    """
    topic_ids = set()
    for t in topics:
        tid = t.get("id")
        if not tid:
            return False, "Topic missing ID."
        if tid in topic_ids:
            return False, f"Duplicate topic ID: {tid}"
        topic_ids.add(tid)

    # Check prerequisite references
    adj: Dict[str, List[str]] = {tid: [] for tid in topic_ids}
    for t in topics:
        tid = t["id"]
        for p in t.get("prerequisites", []):
            if p not in topic_ids:
                return False, f"Topic '{tid}' references unknown prerequisite '{p}'"
            adj[tid].append(p)

    # Cycle detection using 3-state DFS (0 = unvisited, 1 = visiting, 2 = visited)
    state: Dict[str, int] = {tid: 0 for tid in topic_ids}

    def has_cycle(node: str) -> bool:
        state[node] = 1  # visiting
        for neighbor in adj.get(node, []):
            if state[neighbor] == 1:
                return True
            if state[neighbor] == 0:
                if has_cycle(neighbor):
                    return True
        state[node] = 2  # visited
        return False

    for tid in sorted(topic_ids):
        if state[tid] == 0:
            if has_cycle(tid):
                return False, "Cycle detected in topic prerequisite graph."

    return True, None
