"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMessages, sendMessage, getTimeline, getTaskContent } from "@/lib/api";
import type { Message } from "@/lib/api";
import AnalysisTask from "@/app/components/AnalysisTask";
import InterpretationTask from "@/app/components/InterpretationTask";
import PlanningTask from "@/app/components/PlanningTask";
import TechniqueTask from "@/app/components/TechniqueTask";

type TimelineItem = {
  id: number;
  title: string;
  coach_summary: string;
  status: "planned" | "in_progress" | "completed";
  task_type?: string;
};

export default function Practice() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskParam = searchParams.get("task"); // Get task from query parameter
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Store messages per taskId
  // Use composite key: sessionId + taskId
  const [messagesByTask, setMessagesByTask] = useState<{ [key: string]: Message[] }>({});
  const [messages, setMessages] = useState<Message[]>([]); // For current task display
  const [currentTask, setCurrentTask] = useState<TimelineItem | null>(null);
  const [taskType, setTaskType] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [coachTips, setCoachTips] = useState<string[]>([]);
  const [showCoachSidebar, setShowCoachSidebar] = useState(false); // Start hidden
  const [showCoachBubble, setShowCoachBubble] = useState(true); // Show bubble when tips are hidden
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleEndTask = async () => {
    if (sessionId && currentTask) {
      try {
        // Mark task as completed in backend BEFORE going to feedback
        console.log(`[handleEndTask] Marking task ${currentTask.id} as completed...`);
        const completeResponse = await fetch(`http://localhost:8000/complete-task/${sessionId}/${currentTask.id}`, {
          method: "POST"
        });
        const completeResult = await completeResponse.json();
        console.log(`[handleEndTask] Task completion response:`, completeResult);
      } catch (err) {
        console.error("[handleEndTask] Error marking task complete", err);
      }
    }
    
    // Now get feedback and navigate
    if (sessionId) {
      const { getTaskFeedback } = await import("@/lib/api");
      const result = await getTaskFeedback(sessionId);
      // Clear selected task from localStorage
      localStorage.removeItem("selected_task_title");
      console.log("[handleEndTask] Navigating to feedback page...");
      
      // Build query params with task info
      const params = new URLSearchParams({
        feedback: result.feedback || "",
        grade: result.grade?.toString() || "",
        taskTitle: currentTask?.title || "",
        taskType: currentTask?.task_type || "",
      });
      
      // Redirect to feedback page with all params
      router.push(`/feedback?${params.toString()}`);
    } else {
      router.push(`/feedback?feedback=${encodeURIComponent("Session not found. Please start a session first.")}&grade=`);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        console.log("[Practice Init] taskParam:", taskParam);
        const stored = localStorage.getItem("session_id");
        if (!stored) {
          router.push("/");
          return;
        }

        setSessionId(stored);

        let msgs: Message[] = [];
        const timeline = await getTimeline(stored);
        
        // Use task from query parameter if available, otherwise use in_progress
        let active = null;
        if (taskParam) {
          console.log("[Practice Init] Looking for task:", decodeURIComponent(taskParam));
          active = timeline.find((t: TimelineItem) => t.title === decodeURIComponent(taskParam));
          console.log("[Practice Init] Found task:", active?.title);
        }
        if (!active) {
          console.log("[Practice Init] Falling back to in_progress task");
          active = timeline.find((t: TimelineItem) => t.status === "in_progress");
        }
        
        console.log("[Practice Init] Active task:", active?.title, "Type:", active?.task_type);
        setCurrentTask(active || null);

        // Use task_type from timeline (set during session creation)
        // Only fetch content if task_type is not set
        if (active) {
          let taskTypeToUse = active.task_type || "simulation";
          console.log("[Practice Init] Task type from timeline:", taskTypeToUse);
          
          // If it's a non-simulation task, also fetch and store the content
          if (taskTypeToUse !== "simulation") {
            try {
              console.log("[Practice Init] Getting task content for:", active.title);
              const taskData = await getTaskContent(stored, active.title);
              console.log("[Practice Init] Task data received:", taskData);
              // Content is loaded, taskType is confirmed
            } catch (err) {
              console.error("[Practice Init] Error fetching content:", err);
              // Continue anyway, task_type from timeline is reliable
            }
          }
          
          setTaskType(taskTypeToUse);

          // Only load messages for simulation tasks
          if (active.task_type === "simulation" || !active.task_type) {
            msgs = await getMessages(stored, active.title);
            let taskMsgs = msgs;
            // If no messages yet, request a scenario example from backend
            if (msgs.length === 0) {
              const { getScenarioExample } = await import("@/lib/api");
              const scenario = await getScenarioExample(stored);
              taskMsgs = [
                {
                  id: 0,
                  sender: "manager",
                  text: scenario || "Scenario unavailable.",
                  timestamp: new Date().toISOString(),
                },
              ];
            } else {
              // If the first message is a system message (preserved from reset), use it as scenario
              // Otherwise, fetch and prepend it
              const { getScenarioExample } = await import("@/lib/api");
              const firstMsg = msgs[0];
              
              // If first message is system (scenario), keep it as is
              if (firstMsg?.sender === "system") {
                taskMsgs = msgs;
              } else if (!firstMsg?.text?.toLowerCase().includes("you are")) {
                // No scenario found, fetch one
                const scenario = await getScenarioExample(stored);
                if (scenario) {
                  taskMsgs = [
                    {
                      id: 0,
                      sender: "system",
                      text: scenario,
                      timestamp: new Date().toISOString(),
                    },
                    ...msgs,
                  ];
                } else {
                  taskMsgs = msgs;
                }
              }
            }
            const key = `${stored}_${active.id}`;
            setMessagesByTask((prev) => ({ ...prev, [key]: taskMsgs }));
            setMessages(taskMsgs);
          }
        }
        setLoading(false);
      } catch (err) {
        setError("Failed to load practice session.");
        setLoading(false);
      }
    }
    init();
  }, [taskParam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When currentTask changes, update messages to the correct task's chat
  useEffect(() => {
    if (currentTask && sessionId) {
      const key = `${sessionId}_${currentTask.id}`;
      setMessages(messagesByTask[key] || []);
    }
  }, [currentTask, sessionId, messagesByTask]);

  const handleSendMessage = async () => {
    if (!draftMessage.trim() || !sessionId || sending || !currentTask) return;

    setSending(true);
    try {
      const response = await sendMessage(sessionId, currentTask.title, draftMessage);
      setMessages((prev) => {
        // Preserve system message (scenario) if it exists
        const scenarioMsg = prev.length > 0 && (prev[0].sender === "system" || prev[0].text?.toLowerCase().includes("you are")) ? prev[0] : null;
        const newMsgs = scenarioMsg
          ? [scenarioMsg, ...response.messages]
          : response.messages;
        // Save to messagesByTask with composite key
        const key = `${sessionId}_${currentTask.id}`;
        setMessagesByTask((prevMap) => ({ ...prevMap, [key]: newMsgs }));
        return newMsgs;
      });
      if (response.coach_tips) setCoachTips(response.coach_tips);
      setDraftMessage("");
    } finally {
      setSending(false);
    }
  };

  const handleTaskComplete = async () => {
    // Go back to home page when task is complete
    if (sessionId && currentTask) {
      try {
        // Mark task as completed in backend
        console.log(`[handleTaskComplete] Marking task ${currentTask.id} as completed...`);
        const response = await fetch(`http://localhost:8000/complete-task/${sessionId}/${currentTask.id}`, {
          method: "POST"
        });
        const result = await response.json();
        console.log(`[handleTaskComplete] Backend response:`, result);
        
        if (result.success) {
          console.log(`[handleTaskComplete] Task marked successfully. Next task: ${result.next_task}`);
        }
      } catch (err) {
        console.error("[handleTaskComplete] Error marking task complete", err);
      }
    }
    
    // Set flag to trigger home page refresh effect and clear selected task
    if (typeof window !== "undefined") {
      localStorage.setItem("refresh_timeline", "true");
      localStorage.removeItem("selected_task_title");
    }
    console.log("[handleTaskComplete] Set refresh_timeline flag and cleared selected_task_title");
    
    // Navigate back to home
    console.log("[handleTaskComplete] Navigating to home...");
    router.push("/");
  };

  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;
  if (error) return <div style={{ padding: 40, color: "red" }}>{error}</div>;

  // Render task-specific UI based on task type
  // Only render non-simulation tasks if taskType is explicitly set and matches
  if (taskType === "analysis" && sessionId && currentTask) {
    return <AnalysisTask sessionId={sessionId} taskTitle={currentTask.title} taskId={currentTask.id} onTaskComplete={handleTaskComplete} />;
  } else if (taskType === "interpretation" && sessionId && currentTask) {
    return <InterpretationTask sessionId={sessionId} taskTitle={currentTask.title} taskId={currentTask.id} onTaskComplete={handleTaskComplete} />;
  } else if (taskType === "planning" && sessionId && currentTask) {
    return <PlanningTask sessionId={sessionId} taskTitle={currentTask.title} taskId={currentTask.id} onTaskComplete={handleTaskComplete} />;
  } else if (taskType === "technique" && sessionId && currentTask) {
    return <TechniqueTask sessionId={sessionId} taskTitle={currentTask.title} taskId={currentTask.id} onTaskComplete={handleTaskComplete} />;
  }

  // Default: simulation task (chat interface)
  return (
    <main
      style={{
        minHeight: "100vh",
        background: 'none',
        color: '#333',
        fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
      }}
    >
      {/* Header with navigation buttons and timer */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "20px 40px",
          borderRadius: "0 0 24px 24px",
          boxShadow: '0 4px 24px 0 rgba(120, 120, 255, 0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
              {/* Feedback Modal */}
              {/* Feedback modal removed; feedback now shown on /feedback page */}
        <div>
          <h1 style={{ margin: 0, color: "#fff", fontSize: 28, fontWeight: 900, letterSpacing: 1.1, textShadow: '0 2px 16px #e0e7ff, 0 1px 4px #667eea44' }}>
            {currentTask?.title || "Practice Session"}
          </h1>
          <p style={{ color: "#f5d6ff", fontSize: 16, fontWeight: 600, textShadow: '0 1px 8px #764ba2, 0 1px 2px #667eea' }}>{currentTask?.coach_summary}</p>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "10px 18px",
              background: "linear-gradient(90deg, #ff7eb3 0%, #667eea 60%, #764ba2 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 900,
              boxShadow: '0 2px 8px #ff7eb388',
              letterSpacing: 0.5,
              transition: 'all 0.2s',
            }}
          >
            Home
          </button>
          <button
            onClick={handleEndTask}
            style={{
              padding: "10px 18px",
              background: "linear-gradient(90deg, #764ba2 0%, #ff7eb3 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 900,
              boxShadow: '0 2px 8px #764ba288',
              letterSpacing: 0.5,
              transition: 'all 0.2s',
            }}
          >
            End Conversation
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
          padding: "24px 40px",
          maxHeight: "calc(100vh - 120px)",
        }}
      >
        {/* Chat */}
        <div
          style={{
            flex: 1,
            background: "linear-gradient(135deg, #fcc0e2 0%, #ffffff 100%)",
            borderRadius: 24,
            border: "2.5px solid #ffffff",
            boxShadow: "0 8px 32px 0 rgba(144, 6, 70, 0.13), 0 1.5px 16px 0 rgba(255, 120, 220, 0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
            position: 'relative',
          }}
        >
          <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
            {messages.length === 0 ? (
              <div style={{
                textAlign: "left",
                opacity: 0.95,
                fontWeight: 700,
                color: '#764ba2',
                fontSize: 18,
                background: 'linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)',
                borderRadius: 16,
                padding: '24px 20px',
                boxShadow: '0 2px 12px #e0e7ff44',
                marginBottom: 12,
                maxWidth: '700px',
                margin: '0 auto',
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  <span style={{ color: '#764ba2' }}>You're speaking with:</span> Sarah, Your Direct Manager
                </div>
                <div style={{ fontSize: 15, marginBottom: 8, color: '#667eea' }}>
                  <b>Sarah, Your Direct Manager</b>
                </div>
                <div style={{ fontSize: 15, marginBottom: 8, color: '#333' }}>
                  <i>Thanks for meeting with me today, Sarah. I wanted to take some time to discuss my performance over the past 18 months and the contributions I’ve made to the team. I believe that my results and growth warrant a conversation about my salary, and I’d like to propose a 15% raise.</i>
                </div>
                <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>04:23 PM</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: '#ff7eb3' }}>
                  Coach Insight
                </div>
                <div style={{ fontSize: 15, marginBottom: 8 }}>
                  <b>Strategic guidance before you respond</b>
                </div>
                <div style={{ fontSize: 15, marginBottom: 8 }}>
                  <b>Observation:</b> You've done a great job initiating the conversation and clearly stating your proposal. However, as you prepare for pushback, it's important to remain composed and reinforce your value beyond just your request. You might sense Sarah's initial hesitation, which is typical in budget-conscious discussions.
                </div>
                <div style={{ fontSize: 15, marginBottom: 8 }}>
                  <b>Strategy Options:</b>
                  <ul style={{ marginTop: 4, marginBottom: 4 }}>
                    <li>Concrete Examples: Prepare specific examples of how your contributions have positively impacted the team's performance—think about metrics, projects, or initiatives that directly link your work to the company’s success.</li>
                    <li>Value Alignment: Frame your request in terms of the added value you bring to the team and how a raise would not just reflect your past contributions but also motivate you to deliver even more.</li>
                    <li>Follow-Up Questions: If Sarah expresses resistance, consider asking questions that prompt her to share her perspective and to explore options together, such as, "What are your thoughts on how my contributions align with team goals from your perspective?"</li>
                  </ul>
                </div>
                <div style={{ fontSize: 15, marginBottom: 8 }}>
                  <b>Reflection Prompt:</b> How can you express your contributions in a way that aligns with the goals of the organization while also addressing potential budget constraints?
                </div>
                <div style={{ fontSize: 15, marginTop: 16, color: '#764ba2' }}>
                  <i>Now, try responding to Sarah or reflecting on your approach. Your coach will guide you step by step!</i>
                </div>
              </div>
            ) : (
              <>
                {/* Show system message (scenario) at the top if present */}
                {messages[0]?.sender === "system" && (
                  <div style={{
                    textAlign: "left",
                    opacity: 0.95,
                    fontWeight: 700,
                    color: '#764ba2',
                    fontSize: 18,
                    background: 'linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)',
                    borderRadius: 16,
                    padding: '24px 20px',
                    boxShadow: '0 2px 12px #e0e7ff44',
                    marginBottom: 12,
                    maxWidth: '700px',
                  }}>
                    {messages[0].text.split('\n').map((line: string, idx: number) => (
                      <div key={idx} style={{ marginBottom: 8, fontSize: 15 }}>
                        {line}
                      </div>
                    ))}
                  </div>
                )}
                {/* Show regular chat messages (user and manager only) */}
                {messages.map((m) => (
                  m.sender !== "coach" && m.sender !== "system" && (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "70%",
                          padding: "14px 18px",
                          borderRadius: 16,
                          background:
                            m.sender === "user"
                              ? "linear-gradient(90deg, #ff7eb3 0%, #667eea 60%, #764ba2 100%)"
                              : "linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)",
                          color:
                            m.sender === "user" ? "#fff" : "#764ba2",
                          fontSize: 16,
                          fontWeight: 700,
                          boxShadow: m.sender === "user" ? "0 2px 12px #ff7eb388, 0 0 8px #764ba2cc" : "0 2px 8px #e0e7ff88",
                          marginBottom: 2,
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  )
                ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              borderTop: "1.5px solid #e0e7ff",
              padding: 18,
              display: "flex",
              gap: 10,
              background: "linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)",
              borderRadius: '0 0 18px 18px',
              boxShadow: '0 2px 8px #e0e7ff44',
            }}
          >
            <input
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Your response…"
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "2px solid #e0e7ff",
                borderRadius: 10,
                fontSize: 16,
                outline: "none",
                fontWeight: 700,
                color: '#764ba2',
                background: 'linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)',
                boxShadow: '0 1px 4px #e0e7ff44',
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!draftMessage.trim()}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(90deg, #ff7eb3 0%, #667eea 60%, #764ba2 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 900,
                boxShadow: '0 2px 8px #ff7eb388',
                letterSpacing: 0.5,
                transition: 'all 0.2s',
              }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Show AI Coach Tips Button (floating on chat or as bubble) */}
        {!showCoachSidebar && showCoachBubble && (
          <div
            style={{
              position: 'fixed',
              bottom: 40,
              right: 40,
            }}
          >
            <button
              onClick={() => {
                setShowCoachSidebar(true);
                setShowCoachBubble(false);
              }}
              style={{
                padding: "14px 20px",
                background: "linear-gradient(135deg, #ff7eb3 0%, #667eea 60%, #764ba2 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 50,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 900,
                boxShadow: '0 4px 16px #ff7eb388',
                letterSpacing: 0.5,
                transition: 'all 0.3s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 20px #ff7eb388';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px #ff7eb388';
              }}
            >
              💡 Show AI Coach Tips
            </button>
          </div>
        )}

        {/* Tips Coach Sidebar */}
        {showCoachSidebar && (
          <aside
            style={{
              width: 320,
              background: "linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)",
              border: "2.5px solid #e0e7ff",
              borderRadius: 20,
              padding: 24,
              color: "#764ba2",
              boxShadow: "0 8px 32px 0 rgba(120, 120, 255, 0.13), 0 1.5px 16px 0 rgba(255, 120, 220, 0.08)",
              fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 'calc(100vh - 180px)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 22, color: '#ff7eb3', fontWeight: 900, letterSpacing: 1 }}>💡 Tips Coach</h3>
              <button
                onClick={() => {
                  setShowCoachSidebar(false);
                  setShowCoachBubble(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff7eb3',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#764ba2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#ff7eb3';
                }}
                title="Minimize tips to bubble"
              >
                ✕
              </button>
            </div>
            {coachTips.length === 0 ? (
              <div style={{ opacity: 0.8, fontWeight: 600, fontSize: 16 }}>
                Strategic guidance will appear here after you send a message and receive a response.
              </div>
            ) : (
              <ul style={{ paddingLeft: 18, fontSize: 16, fontWeight: 700, color: '#764ba2', margin: 0 }}>
                {coachTips.map((t, i) => (
                  <li key={i} style={{ marginBottom: 10 }}>{t}</li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}