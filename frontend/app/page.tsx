"use client";

import { useEffect, useState, useRef } from "react";
import { createSession, getTimeline, TimelineItem, chooseAnotherTask, getTaskDescription, getTaskInsights, getProgramLength, getAvailableTasks, selectTask } from "@/lib/api";
import { useRouter } from "next/navigation";
import Avatar from "./components/Avatar";
import ProgressCard from "./components/ProgressCard";
import CuteFlower from "./components/CuteFlower";
import Confetti from "./components/Confetti";

export default function Home() {
  const router = useRouter();

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [currentTask, setCurrentTask] = useState<TimelineItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [taskInsights, setTaskInsights] = useState<string>("");
  const [choosingAnother, setChoosingAnother] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<TimelineItem[]>([]);
  const [selectingTaskId, setSelectingTaskId] = useState<number | null>(null);

  // Task-based progress (computed from timeline)
  const [completedTasks, setCompletedTasks] = useState<number>(0);
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [averageGrade, setAverageGrade] = useState<number | undefined>(undefined);
  const [userName, setUserName] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState(false);
  const prevCompletedRef = useRef<number>(0);

  useEffect(() => {
    // Listen for custom event when user name is changed in Avatar
    const handleNameChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.name) {
        setUserName(customEvent.detail.name);
      }
    };

    window.addEventListener("userNameChanged", handleNameChanged);
    return () => window.removeEventListener("userNameChanged", handleNameChanged);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const stored = localStorage.getItem("session_id");
        let sessionId: string;

        if (stored) {
          sessionId = stored;
        } else {
          const res = await createSession();
          console.log("Created session:", res);
          sessionId = res.session_id;
          localStorage.setItem("session_id", sessionId);
        }

        console.log("[Home Init] Fetching timeline for session:", sessionId);
        let items: TimelineItem[] = await getTimeline(sessionId);
        // If the stored session exists but the backend has no timeline (stale session id), recreate session
        if (Array.isArray(items) && items.length === 0) {
          console.log("[Home Init] Timeline empty for session, recreating session");
          const recreated = await createSession();
          sessionId = recreated.session_id;
          localStorage.setItem("session_id", sessionId);
          items = await getTimeline(sessionId);
          console.log("[Home Init] Timeline after recreating session:", items);
        }
        console.log("Timeline items:", items);
        console.log("[Home Init] Task statuses:");
        items.forEach((t, idx) => {
          console.log(`  [${idx}] ${t.id}: ${t.title} -> ${t.status}`);
        });
        setTimeline(items);
        
        // Compute progress
        const completed = items.filter((t: TimelineItem) => t.status === "completed").length;
        const total = items.length;
        setCompletedTasks(completed);
        setTotalTasks(total);
        setProgressPercent(total > 0 ? Math.round((completed / total) * 100) : 0);
        console.log("[Home Init] Completed tasks:", completed, "/ Total:", total);
        
        // Calculate average grade
        if (completed > 0) {
          const completedItems = items.filter((t: TimelineItem) => t.status === "completed");
          const gradesSum = completedItems.reduce((sum, t) => sum + (t.grade || 0), 0);
          const avg = gradesSum / completedItems.length;
          setAverageGrade(avg);
          console.log("[Home Init] Average grade:", avg.toFixed(1));
        }
        
        // Confetti if just completed a task
        if (prevCompletedRef.current !== undefined && completed > prevCompletedRef.current) {
          console.log("[Home Init] Completed tasks increased from", prevCompletedRef.current, 'to', completed);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2000);
        }
        prevCompletedRef.current = completed;
        
        // Get user name from localStorage
        setUserName(typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "");

        // Find active task (newly promoted to in_progress)
        const active = items.find((item: TimelineItem) => item.status === "in_progress");
        console.log("[Home Init] Found in_progress task:", active?.title, "(ID:", active?.id, ")");
        
        // Check if user had selected a task previously (from progress list click)
        const selectedTaskTitle = typeof window !== "undefined" ? localStorage.getItem("selected_task_title") : null;
        let taskToShow = active;
        if (selectedTaskTitle) {
          const selectedTask = items.find((item: TimelineItem) => item.title === selectedTaskTitle);
          if (selectedTask && (selectedTask.status === "completed" || selectedTask.status === "in_progress")) {
            taskToShow = selectedTask;
          } else {
            // Clear saved task if it's no longer available or is planned
            localStorage.removeItem("selected_task_title");
          }
        }
        
        setCurrentTask(taskToShow ?? null);

        // Fetch task description and insights
        if (taskToShow) {
          try {
            const desc = await getTaskDescription(taskToShow.title, taskToShow.difficulty || "●●");
            console.log("Task description:", desc);
            setTaskDescription(desc.description);
            
            // Fetch insights
            console.log("Fetching insights for:", taskToShow.title);
            const insights = await getTaskInsights(taskToShow.title, desc.description);
            console.log("Task insights:", insights);
            let insightsText = (insights.insights || "").trim();
            const genericFallbacks = [
              "Master this skill to become a more effective negotiator.",
              "Practice this negotiation skill to improve your abilities."
            ];
            if (!insightsText || genericFallbacks.includes(insightsText)) {
              insightsText = taskToShow.coach_summary || insightsText;
            }
            setTaskInsights(insightsText);
          } catch (err) {
            console.error("Error fetching description/insights:", err);
            setTaskDescription(taskToShow.coach_summary);
            setTaskInsights("Loading insights...");
          }
        }

        setLoading(false);
        // Clear the refresh flag after loading
        if (typeof window !== "undefined") {
          localStorage.removeItem("refresh_timeline");
        }
      } catch (err) {
        console.error("Init error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to connect to backend. Make sure the server is running on http://127.0.0.1:8000"
        );
        setLoading(false);
      }
    }

    init();
  }, []);

  // Listen for refresh_timeline flag (when user returns from feedback page)
  useEffect(() => {
    // Check immediately on mount
    const checkAndRefresh = async () => {
      if (typeof window !== "undefined" && localStorage.getItem("refresh_timeline") === "true") {
        console.log("[Home] Detected refresh_timeline flag, refetching...");
        localStorage.removeItem("refresh_timeline");
        
        try {
          const sessionId = localStorage.getItem("session_id");
          if (!sessionId) return;
          
          const items: TimelineItem[] = await getTimeline(sessionId);
          console.log("[Refresh] Updated timeline:", items);
          setTimeline(items);
          
          // Recompute progress
          const completed = items.filter((t: TimelineItem) => t.status === "completed").length;
          const total = items.length;
          setCompletedTasks(completed);
          setTotalTasks(total);
          setProgressPercent(total > 0 ? Math.round((completed / total) * 100) : 0);
          console.log("[Refresh] Updated completed tasks:", completed);
          
          // Calculate average grade
          if (completed > 0) {
            const completedItems = items.filter((t: TimelineItem) => t.status === "completed");
            const gradesSum = completedItems.reduce((sum, t) => sum + (t.grade || 0), 0);
            const avg = gradesSum / completedItems.length;
            setAverageGrade(avg);
            console.log("[Refresh] Average grade:", avg.toFixed(1));
          }
          
          // Trigger confetti if tasks increased
          if (completed > prevCompletedRef.current) {
            console.log("[Refresh] Tasks completed increased from", prevCompletedRef.current, 'to', completed);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2000);
          }
          prevCompletedRef.current = completed;
          
          // Load next in_progress task
          const active = items.find((item: TimelineItem) => item.status === "in_progress");
          if (active) {
            console.log("[Refresh] Setting current task to:", active.title);
            // Clear any previously selected task to ensure we use the in_progress task
            localStorage.removeItem("selected_task_title");
            setCurrentTask(active);
          }
        } catch (err) {
          console.error("[Refresh] Error refetching timeline:", err);
        }
      }
    };
    
    // Check immediately
    checkAndRefresh();
    
    // Also set up an interval to check periodically (every 300ms for responsiveness)
    const interval = setInterval(checkAndRefresh, 300);
    
    return () => clearInterval(interval);
  }, []);

  // Load task details when currentTask changes (from clicking on progress list or from init)
  useEffect(() => {
    async function loadTaskDetails() {
      if (!currentTask) return;

      console.log("[LoadTaskDetails] Loading for:", currentTask.title, "Type:", currentTask.task_type);

      try {
        const desc = await getTaskDescription(currentTask.title, currentTask.difficulty || "●●");
        setTaskDescription(desc.description);
        
        const insights = await getTaskInsights(currentTask.title, desc.description);
        let insightsText = (insights.insights || "").trim();
        const genericFallbacks = [
          "Master this skill to become a more effective negotiator.",
          "Practice this negotiation skill to improve your abilities."
        ];
        if (!insightsText || genericFallbacks.includes(insightsText)) {
          insightsText = currentTask.coach_summary || insightsText;
        }
        setTaskInsights(insightsText);
        
        // Save selected task to localStorage so we remember it
        localStorage.setItem("selected_task_title", currentTask.title);
        console.log("[LoadTaskDetails] Saved to localStorage:", currentTask.title);
      } catch (err) {
        console.error("Error fetching task details:", err);
        setTaskDescription(currentTask.coach_summary);
        setTaskInsights("Loading insights...");
      }
    }

    loadTaskDetails();
  }, [currentTask]);

  const handleChooseAnother = async () => {
    const sessionId = localStorage.getItem("session_id");
    if (!sessionId) return;

    setChoosingAnother(true);
    try {
      // Fetch available tasks to show in modal
      const result = await getAvailableTasks(sessionId);
      if (result.tasks) {
        setAvailableTasks(result.tasks);
        setShowTaskModal(true);
      }
    } catch (err) {
      console.error("Error fetching available tasks:", err);
    } finally {
      setChoosingAnother(false);
    }
  };

  const handleSelectTask = async (taskId: number) => {
    const sessionId = localStorage.getItem("session_id");
    if (!sessionId) return;

    setSelectingTaskId(taskId);
    try {
      // Select the task
      console.log(`[handleSelectTask] Selecting task ${taskId}`);
      const result = await selectTask(sessionId, taskId);
      console.log("Task selection result:", result);
      
      // Refresh timeline
      const items = await getTimeline(sessionId);
      setTimeline(items);
      
      // Find and set the new active task
      const active = items.find((item: TimelineItem) => item.status === "in_progress");
      console.log("[handleSelectTask] New active task:", active?.title);
      setCurrentTask(active ?? null);
      
      // Clear the selected_task_title from localStorage so it uses the new active task
      localStorage.removeItem("selected_task_title");
      console.log("[handleSelectTask] Cleared selected_task_title from localStorage");
      
      // Fetch task description and insights
      if (active) {
        try {
          const desc = await getTaskDescription(active.title, active.difficulty || "●●");
          setTaskDescription(desc.description);
          
          const insights = await getTaskInsights(active.title, desc.description);
          let insightsText = (insights.insights || "").trim();
          const genericFallbacks = [
            "Master this skill to become a more effective negotiator.",
            "Practice this negotiation skill to improve your abilities."
          ];
          if (!insightsText || genericFallbacks.includes(insightsText)) {
            insightsText = active.coach_summary || insightsText;
          }
          setTaskInsights(insightsText);
          console.log("[handleSelectTask] Task details loaded");
        } catch (err) {
          console.error("Error fetching task details:", err);
          setTaskDescription(active.coach_summary);
        }
      }
      
      // Close modal
      setShowTaskModal(false);
    } catch (err) {
      console.error("Error selecting task:", err);
    } finally {
      setSelectingTaskId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: "red" }}>
        <h2>Connection Error</h2>
        <p>{error}</p>
        <p style={{ fontSize: 14, marginTop: 16 }}>
          Make sure the backend server is running:
        </p>
        <code style={{ background: "#f0f0f0", padding: "8px 12px", display: "block" }}>
          cd backend && python -m uvicorn app:app --reload
        </code>
      </div>
    );
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const calendarDays = [];
  
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  return (
    <main style={{ minHeight: "100vh" }}>
      {/* Top Navigation */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 40px",
          borderBottom: "1px solid #eaeaea",
          background: "transparent",
        }}
      >
        <strong style={{ fontSize: 18 }}>SkillBuilder</strong>
        <div style={{ display: "flex", gap: 24, color: "#555" }}>
          <span style={{ fontWeight: 600 }}>Home</span>
          <span>Practice</span>
          <span>Feedback</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Avatar selection */}
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          <Avatar />
        </div>
      </nav>

      {/* Content */}
      <div style={{ padding: "40px" }}>
        {/* Hero Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 28,
            padding: "60px 40px",
            color: "#fff",
            textAlign: "center",
            marginBottom: 20,
            boxShadow: "none",
            fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <h1 style={{
            margin: 0,
            fontSize: 52,
            fontWeight: 900,
            marginBottom: 16,
            color: '#fff',
            letterSpacing: 1.2,
            fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
            zIndex: 2,
            position: 'relative',
          }}>
            SkillBuilder
          </h1>
          <p style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
            letterSpacing: 0.5,
            zIndex: 2,
            position: 'relative',
          }}>
            Master negotiation through deliberate practice
          </p>
        </div>

        {/* Progress Card with glassmorphism, flowers, and confetti */}
        <div style={{
          marginBottom: 28,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}>
          <div style={{ flex: '0 0 auto', transform: 'rotate(-18deg) scale(1.1)' }}>
            <CuteFlower />
          </div>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <ProgressCard completed={completedTasks} total={totalTasks} userName={userName || "there"} percent={progressPercent} averageGrade={averageGrade} />
            {showConfetti && <Confetti trigger={showConfetti} />}
          </div>
          <div style={{ flex: '0 0 auto', transform: 'rotate(14deg) scale(1.1)' }}>
            <CuteFlower />
          </div>
        </div>

        {/* Main grid: Task Bubble on left, Calendar + Progress on right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 32,
          }}
        >
          {/* Left: Large Task Bubble */}
          <div>
            {currentTask ? (
              <div
                style={{
                  background: "linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)",
                  borderRadius: 32,
                  padding: 40,
                  boxShadow: "none",
                  border: "2.5px solid #e0e7ff",
                  position: 'relative',
                  fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
                  transition: "box-shadow 0.3s cubic-bezier(.4,0,.2,1)",
                }}
              >
                <h2 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Today's Practice
                </h2>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 32, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2 }}>
                  {currentTask.title}
                </h3>

                {/* Description */}
                <p style={{ margin: "0 0 28px 0", color: "#555", lineHeight: 1.8, fontSize: 15 }}>
                  {taskDescription || currentTask.coach_summary}
                </p>

                {/* Metadata Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                    marginBottom: 32,
                    padding: "24px",
                    background: "#f8f8f8",
                    borderRadius: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#999", marginBottom: 6, textTransform: "uppercase" }}>
                      Duration
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#333" }}>
                      {currentTask.estimated_time || "15 mins"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#999", marginBottom: 6, textTransform: "uppercase" }}>
                      Difficulty
                    </div>
                    <div style={{ fontSize: 18, color: "#333" }}>
                      {currentTask.difficulty || "●●"}
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#999", marginBottom: 6, textTransform: "uppercase" }}>
                      Skill Focus
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#667eea" }}>
                      {currentTask.skill_focus || "Negotiation Skills"}
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={async () => {
                      if (currentTask) {
                        // Mark task as started when user clicks "Start Practice"
                        const sessionId = localStorage.getItem("session_id");
                        if (sessionId) {
                          try {
                            console.log(`[Start Practice] Marking task ${currentTask.id} as started`);
                            await fetch(`http://localhost:8000/start-task/${sessionId}/${currentTask.id}`, {
                              method: "POST"
                            });
                          } catch (err) {
                            console.error("[Start Practice] Error marking task started:", err);
                          }
                        }
                        router.push(`/practice?task=${encodeURIComponent(currentTask.title)}`);
                      } else {
                        router.push("/practice");
                      }
                    }}
                    style={{
                      padding: "16px 32px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: 12,
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      flex: 1,
                      boxShadow: "none",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) => {
                      (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
                      (e.target as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
                    }}
                    onMouseOut={(e) => {
                      (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                      (e.target as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                    }}
                  >
                    Start Practice
                  </button>
                  <button
                    onClick={handleChooseAnother}
                    disabled={choosingAnother}
                    style={{
                      padding: "16px 32px",
                      background: "transparent",
                      color: "#667eea",
                      border: "2px solid #ddd",
                      borderRadius: 12,
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: choosingAnother ? "not-allowed" : "pointer",
                      flex: 1,
                      opacity: choosingAnother ? 0.6 : 1,
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) => {
                      if (!choosingAnother) {
                        (e.target as HTMLButtonElement).style.background = "#f5f5f5";
                        (e.target as HTMLButtonElement).style.borderColor = "#667eea";
                      }
                    }}
                    onMouseOut={(e) => {
                        (e.target as HTMLButtonElement).style.background = "transparent";
                      (e.target as HTMLButtonElement).style.borderColor = "#ddd";
                    }}
                  >
                    {choosingAnother ? "Loading..." : "Choose Another"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
                No active task. All tasks completed!
              </div>
            )}

            {/* AI Coach Insights Bubble */}
            {currentTask && (
              <div
                style={{
                  background: "linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)",
                  borderRadius: 28,
                  padding: 24,
                  border: "2.5px solid #e0e7ff",
                  boxShadow: "none",
                  fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
                  marginTop: 24,
                  position: 'relative',
                  transition: "box-shadow 0.3s cubic-bezier(.4,0,.2,1)",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 20 }}>💡</div>
                  <div>
                    <h4 style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: 700, color: "#764ba2", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Why This Matters
                    </h4>
                    <p style={{ margin: 0, color: "#555", lineHeight: 1.6, fontSize: 14 }}>
                      {taskInsights || "Loading insights..."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Compact Calendar + Progress */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Small Calendar */}
            <div
              style={{
                background: "linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)",
                borderRadius: 24,
                padding: 16,
                border: "2.5px solid #e0e7ff",
                boxShadow: "none",
                fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
                position: 'relative',
                transition: "box-shadow 0.3s cubic-bezier(.4,0,.2,1)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <button
                  onClick={prevMonth}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 18,
                    cursor: "pointer",
                    color: "#667eea",
                  }}
                >
                  ←
                </button>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#333" }}>
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button
                  onClick={nextMonth}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 18,
                    cursor: "pointer",
                    color: "#667eea",
                  }}
                >
                  →
                </button>
              </div>

              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
                {dayNames.map((day: string) => (
                  <div key={day} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "#999", padding: "4px 0" }}>
                    {day[0]}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {calendarDays.map((day: number | null, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 6,
                      background: day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                      color: day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() ? "white" : "#666",
                      cursor: day ? "pointer" : "default",
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div
              style={{
                background: "linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)",
                borderRadius: 24,
                padding: 20,
                border: "2.5px solid #e0e7ff",
                boxShadow: "none",
                fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
                position: 'relative',
                transition: "box-shadow 0.3s cubic-bezier(.4,0,.2,1)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📋 Your Progress
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {timeline.map((item: TimelineItem, idx: number) => (
                  <li
                    key={item.id}
                    onClick={() => {
                      // Allow clicking on completed or in-progress tasks
                      if (item.status === "completed" || item.status === "in_progress") {
                        console.log("[Progress Click] Selected task:", item.title, "Type:", item.task_type);
                        setCurrentTask(item);
                      }
                    }}
                    style={{
                      padding: "10px 8px",
                      marginBottom: idx < timeline.length - 1 ? 6 : 0,
                      borderRadius: 6,
                      background:
                        currentTask?.id === item.id
                          ? "rgba(102,126,234,0.25)"
                          : item.status === "in_progress"
                          ? "rgba(102,126,234,0.08)"
                          : item.status === "completed"
                          ? "rgba(120,120,255,0.06)"
                          : "transparent",
                      color:
                        item.status === "planned"
                          ? "#aaa"
                          : "#333",
                      fontWeight:
                        currentTask?.id === item.id || item.status === "in_progress"
                          ? 600
                          : 400,
                      fontSize: 13,
                      borderLeft: currentTask?.id === item.id ? "3px solid #667eea" : (item.status === "in_progress" ? "3px solid #667eea" : "none"),
                      cursor: (item.status === "completed" || item.status === "in_progress") ? "pointer" : "default",
                      transition: "background-color 0.2s, border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (item.status === "completed" || item.status === "in_progress") {
                        if (currentTask?.id !== item.id) {
                          (e.currentTarget as HTMLLIElement).style.backgroundColor = "rgba(102,126,234,0.12)";
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentTask?.id === item.id) {
                        (e.currentTarget as HTMLLIElement).style.backgroundColor = "rgba(102,126,234,0.25)";
                      } else if (item.status === "in_progress") {
                        (e.currentTarget as HTMLLIElement).style.backgroundColor = "rgba(102,126,234,0.08)";
                      } else if (item.status === "completed") {
                        (e.currentTarget as HTMLLIElement).style.backgroundColor = "rgba(120,120,255,0.06)";
                      } else {
                        (e.currentTarget as HTMLLIElement).style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span style={{ marginRight: 8, fontSize: 14 }}>
                      {item.status === "completed"
                        ? "✓"
                        : item.status === "in_progress"
                        ? "●"
                        : "○"}
                    </span>
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Task Selection Modal */}
      {showTaskModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowTaskModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 40,
              maxWidth: 600,
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, color: "#764ba2" }}>Select a Task</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {availableTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleSelectTask(task.id)}
                  disabled={selectingTaskId === task.id}
                  style={{
                    padding: "16px",
                    border: "2px solid #e0e7ff",
                    borderRadius: 8,
                    background: "#f9f5ff",
                    cursor: selectingTaskId === task.id ? "not-allowed" : "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                    opacity: selectingTaskId === task.id ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (selectingTaskId !== task.id) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#667eea";
                      (e.currentTarget as HTMLButtonElement).style.background = "#f0e7ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#e0e7ff";
                    (e.currentTarget as HTMLButtonElement).style.background = "#f9f5ff";
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#764ba2", marginBottom: 4 }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 14, color: "#667eea", marginBottom: 6 }}>
                    {task.coach_summary}
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>
                    Status: {task.status} • Difficulty: {task.difficulty}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTaskModal(false)}
              style={{
                marginTop: 24,
                padding: "12px 24px",
                background: "#f0f0f0",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                width: "100%",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
