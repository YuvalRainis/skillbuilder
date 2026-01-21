const API_BASE = "http://127.0.0.1:8000";

export type Message = {
  id: number;
  sender: "user" | "manager" | "coach" | "system";
  text: string;
  timestamp: string;
};

export type TimelineItem = {
  id: number;
  title: string;
  coach_summary: string;
  status: "planned" | "in_progress" | "completed";
  difficulty?: string;
  skill_focus?: string;
  estimated_time?: string;
  task_type?: "simulation" | "analysis" | "interpretation" | "planning" | "technique";
  task_content?: string;
  grade?: number | null;
  created_at?: string;
};

async function handleFetchError(response: Response, endpoint: string) {
  if (!response.ok) {
    throw new Error(`API error at ${endpoint}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Create a new user session
export async function createSession() {
  try {
    // Clear old session
    localStorage.removeItem("session_id");
    const res = await fetch(`${API_BASE}/session`, {
      method: "POST",
    });
    return handleFetchError(res, "/session");
  } catch (error) {
    console.error("createSession error:", error);
    throw error;
  }
}

// Get timeline for a session
export async function getTimeline(sessionId: string) {
  try {
    const res = await fetch(`${API_BASE}/timeline/${sessionId}`);
    return handleFetchError(res, `/timeline/${sessionId}`);
  } catch (error) {
    console.error("getTimeline error:", error);
    throw error;
  }
}

// Fetch all messages for a session and task
export async function getMessages(sessionId: string, taskTitle: string): Promise<Message[]> {
  try {
    const res = await fetch(`${API_BASE}/messages/${sessionId}/${encodeURIComponent(taskTitle)}`);
    return handleFetchError(res, `/messages/${sessionId}/${encodeURIComponent(taskTitle)}`);
  } catch (error) {
    console.error("getMessages error:", error);
    throw error;
  }
}

// Send a message to the backend (Manager + Coach)
export async function sendMessage(sessionId: string, taskTitle: string, text: string) {
  try {
    const res = await fetch(`${API_BASE}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        task_title: taskTitle,
        text: text,
      }),
    });
    return handleFetchError(res, "/message");
  } catch (error) {
    console.error("sendMessage error:", error);
    throw error;
  }
}

// Send reflection and complete current task
export async function sendReflection(data: {
  session_id: string;
  difficulty: number;
  confidence: number;
  comment: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/reflect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleFetchError(res, "/reflect");
  } catch (error) {
    console.error("sendReflection error:", error);
    throw error;
  }
}

// Get task description
export async function getTaskDescription(taskTitle: string, difficulty: string = "●●") {
  try {
    const res = await fetch(`${API_BASE}/task-description/${encodeURIComponent(taskTitle)}?difficulty=${difficulty}`);
    return handleFetchError(res, "/task-description");
  } catch (error) {
    console.error("getTaskDescription error:", error);
    throw error;
  }
}

// Get task insights
export async function getTaskInsights(taskTitle: string, taskDescription: string = "") {
  try {
    const res = await fetch(`${API_BASE}/task-insights/${encodeURIComponent(taskTitle)}?task_description=${encodeURIComponent(taskDescription)}`);
    return handleFetchError(res, "/task-insights");
  } catch (error) {
    console.error("getTaskInsights error:", error);
    throw error;
  }
}

// Get all available tasks for selection
export async function getAvailableTasks(sessionId: string) {
  try {
    console.log(`[getAvailableTasks] Requesting for sessionId: ${sessionId}`);
    const res = await fetch(`${API_BASE}/available-tasks/${sessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[getAvailableTasks] Server error ${res.status}: ${errorText}`);
      throw new Error(`API error: ${res.status}`);
    }
    
    const data = await res.json();
    console.log(`[getAvailableTasks] Success:`, data);
    return data;
  } catch (error) {
    console.error("[getAvailableTasks] Error:", error);
    throw error;
  }
}

// Select a specific task to work on
export async function selectTask(sessionId: string, taskId: number) {
  try {
    console.log(`[selectTask] Selecting task ${taskId} for session ${sessionId}`);
    const res = await fetch(`${API_BASE}/select-task/${sessionId}/${taskId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[selectTask] Server error ${res.status}: ${errorText}`);
      throw new Error(`API error: ${res.status}`);
    }
    
    const data = await res.json();
    console.log(`[selectTask] Success:`, data);
    return data;
  } catch (error) {
    console.error("[selectTask] Error:", error);
    throw error;
  }
}

// Choose another task with similar difficulty
export async function chooseAnotherTask(sessionId: string) {
  try {
    console.log(`[chooseAnotherTask] Requesting with sessionId: ${sessionId}`);
    const res = await fetch(`${API_BASE}/choose-another`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        text: "choose-another"
      }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[chooseAnotherTask] Server error ${res.status}: ${errorText}`);
      throw new Error(`API error at /choose-another: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log(`[chooseAnotherTask] Success:`, data);
    return data;
  } catch (error) {
    console.error("[chooseAnotherTask] Error:", error);
    throw error;
  }
}

// Get program length (days) estimate and current day
export async function getProgramLength(sessionId: string) {
  try {
    const res = await fetch(`${API_BASE}/program-length/${sessionId}`);
    return handleFetchError(res, `/program-length/${sessionId}`);
  } catch (error) {
    console.error("getProgramLength error:", error);
    throw error;
  }
}

// Fetch scenario example for a session's active task
export async function getScenarioExample(sessionId: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/scenario-example/${sessionId}`);
    const data = await handleFetchError(res, `/scenario-example/${sessionId}`);
    return data.scenario || "";
  } catch (error) {
    console.error("getScenarioExample error:", error);
    return "";
  }
}

// Fetch feedback for a session's completed task
export async function getTaskFeedback(sessionId: string): Promise<{ feedback: string; grade: number | null }> {
  try {
    const res = await fetch(`${API_BASE}/task-feedback/${sessionId}`);
    const data = await handleFetchError(res, `/task-feedback/${sessionId}`);
    return {
      feedback: data.feedback || "",
      grade: data.grade ?? null,
    };
  } catch (error) {
    console.error("getTaskFeedback error:", error);
    return { feedback: "", grade: null };
  }
}

// ========== NEW TASK TYPE ENDPOINTS ==========

// Get task content based on task type
export async function getTaskContent(sessionId: string, taskTitle?: string) {
  try {
    const params = new URLSearchParams();
    if (taskTitle) {
      params.append("task_title", taskTitle);
    }
    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/task-content/${sessionId}?${queryString}` : `${API_BASE}/task-content/${sessionId}`;
    console.log("[getTaskContent] Fetching from:", url);
    const res = await fetch(url);
    const data = await handleFetchError(res, `/task-content/${sessionId}`);
    console.log("[getTaskContent] Response:", data);
    return data;
  } catch (error) {
    console.error("getTaskContent error:", error);
    return { task_type: "simulation", content: {} };
  }
}

// Evaluate analysis task response
export async function evaluateAnalysis(sessionId: string, taskTitle: string, question: string, response: string) {
  try {
    const res = await fetch(`${API_BASE}/evaluate-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        task_title: taskTitle,
        question,
        response,
      }),
    });
    return handleFetchError(res, "/evaluate-analysis");
  } catch (error) {
    console.error("evaluateAnalysis error:", error);
    throw error;
  }
}

// Evaluate interpretation task response
export async function evaluateInterpretation(sessionId: string, taskTitle: string, position: string, response: string) {
  try {
    const res = await fetch(`${API_BASE}/evaluate-interpretation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        task_title: taskTitle,
        position,
        response,
      }),
    });
    return handleFetchError(res, "/evaluate-interpretation");
  } catch (error) {
    console.error("evaluateInterpretation error:", error);
    throw error;
  }
}

// Evaluate planning task response
export async function evaluatePlan(sessionId: string, taskTitle: string, scenario: string, constraints: string, response: string) {
  try {
    const res = await fetch(`${API_BASE}/evaluate-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        task_title: taskTitle,
        scenario,
        constraints,
        response,
      }),
    });
    return handleFetchError(res, "/evaluate-plan");
  } catch (error) {
    console.error("evaluatePlan error:", error);
    throw error;
  }
}

// Evaluate technique task response
export async function evaluateTechnique(
  sessionId: string,
  taskTitle: string,
  techniqueName: string,
  instruction: string,
  otherPersonStatement: string,
  response: string
) {
  try {
    const res = await fetch(`${API_BASE}/evaluate-technique`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        task_title: taskTitle,
        technique_name: techniqueName,
        instruction,
        other_person_statement: otherPersonStatement,
        response,
      }),
    });
    return handleFetchError(res, "/evaluate-technique");
  } catch (error) {
    console.error("evaluateTechnique error:", error);
    throw error;
  }
}
