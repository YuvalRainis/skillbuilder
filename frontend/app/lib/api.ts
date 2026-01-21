export async function getScenario(sessionId: string) {
  const res = await fetch(`${API_URL}/scenario/${sessionId}`);
  return res.json();
}
const API_URL = "http://127.0.0.1:8000";

export async function createSession() {
  const res = await fetch(`${API_URL}/session`, { method: "POST" });
  return res.json();
}

export async function getTimeline(sessionId: string) {
  const res = await fetch(`${API_URL}/timeline/${sessionId}`);
  return res.json();
}

export async function sendMessage(sessionId: string, text: string) {
  const res = await fetch(`${API_URL}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, text }),
  });
  return res.json();
}

export async function submitReflection(data: {
  session_id: string;
  difficulty: number;
  confidence: number;
  comment: string;
}) {
  const res = await fetch(`${API_URL}/reflect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
