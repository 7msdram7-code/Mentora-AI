const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchSubjects() {
  const res = await fetch(`${API_BASE}/subjects`);
  return res.json();
}

export async function fetchSubjectGraph(subjectId, studentId = 'demo_student') {
  const res = await fetch(`${API_BASE}/subjects/${subjectId}/graph?student_id=${studentId}`);
  if (!res.ok) throw new Error('Failed to fetch subject graph');
  return res.json();
}

export async function fetchNextQuestion(studentId = 'demo_student', subjectId = 'data_structures_hashing', topicId = null, questionId = null) {
  let url = `${API_BASE}/questions/next?student_id=${studentId}&subject_id=${subjectId}`;
  if (topicId) url += `&topic_id=${topicId}`;
  if (questionId) url += `&question_id=${questionId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch next question');
  return res.json();
}

export async function submitAnswer({ studentId = 'demo_student', questionId, answer, timeSec, language = 'en', parentAttemptId = null }) {
  const res = await fetch(`${API_BASE}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: studentId,
      question_id: questionId,
      answer: String(answer),
      time_sec: Number(timeSec) || 5.0,
      language,
      parent_attempt_id: parentAttemptId
    })
  });
  if (!res.ok) throw new Error('Failed to submit answer');
  return res.json();
}

export async function uploadNotes(file, title = '') {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);

  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function commitDraftSubject(payload) {
  const res = await fetch(`${API_BASE}/notes/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to commit graph' }));
    throw new Error(err.detail || 'Failed to commit graph');
  }
  return res.json();
}

export async function startTeachback(topicId, studentId = 'demo_student', language = 'en') {
  const res = await fetch(`${API_BASE}/teachback/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: studentId,
      topic_id: topicId,
      language
    })
  });
  if (!res.ok) throw new Error('Failed to start teach-back');
  return res.json();
}

export async function sendTeachbackMessage(sessionId, message, language = 'en') {
  const res = await fetch(`${API_BASE}/teachback/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      user_message: message,
      language
    })
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function finishTeachback(sessionId, language = 'en') {
  const res = await fetch(`${API_BASE}/teachback/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      language
    })
  });
  if (!res.ok) throw new Error('Failed to finish teach-back');
  return res.json();
}

export async function fetchRevisionPlan(studentId = 'demo_student') {
  const res = await fetch(`${API_BASE}/revision-plan?student_id=${studentId}`);
  if (!res.ok) throw new Error('Failed to fetch revision plan');
  return res.json();
}

export async function resetDemo() {
  const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo');
  return res.json();
}

export async function loadDemo() {
  const res = await fetch(`${API_BASE}/demo/load`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to load demo');
  return res.json();
}

export async function fetchProgress(studentId = 'demo_student') {
  const res = await fetch(`${API_BASE}/progress?student_id=${studentId}`);
  if (!res.ok) throw new Error('Failed to fetch progress');
  return res.json();
}

// MirrorPet & Profile API
export async function fetchPetAndProfile(studentId = 'demo_student') {
  const res = await fetch(`${API_BASE}/pet?student_id=${studentId}`);
  if (!res.ok) throw new Error('Failed to fetch pet and profile');
  return res.json();
}

export async function fetchShopCatalogue(studentId = 'demo_student') {
  const res = await fetch(`${API_BASE}/pet/shop?student_id=${studentId}`);
  if (!res.ok) throw new Error('Failed to fetch shop catalogue');
  return res.json();
}

export async function purchaseCosmetic(cosmeticId, studentId = 'demo_student') {
  const res = await fetch(`${API_BASE}/pet/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, cosmetic_id: cosmeticId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Purchase failed' }));
    throw new Error(err.detail || 'Purchase failed');
  }
  return res.json();
}

export async function equipCosmetic(category, cosmeticId, action = 'equip', studentId = 'demo_student') {
  const res = await fetch(`${API_BASE}/pet/equip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, cosmetic_id: cosmeticId, category, action })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Equip failed' }));
    throw new Error(err.detail || 'Equip failed');
  }
  return res.json();
}

export async function customizePet(petName, colorTheme, studentId = 'demo_student') {
  const res = await fetch(`${API_BASE}/pet/customize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, pet_name: petName, color_theme: colorTheme })
  });
  if (!res.ok) throw new Error('Failed to customize pet');
  return res.json();
}

export async function interactWithPet(studentId = 'demo_student') {
  const res = await fetch(`${API_BASE}/pet/interact?student_id=${studentId}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to interact with pet');
  return res.json();
}

export async function fetchTransactions(studentId = 'demo_student') {
  const res = await fetch(`${API_BASE}/pet/transactions?student_id=${studentId}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}
