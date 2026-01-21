"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTaskContent, evaluatePlan } from "@/lib/api";

interface PlanningTaskProps {
  sessionId: string;
  taskTitle: string;
  taskId: number;
  onTaskComplete: () => void;
}

export default function PlanningTask({ sessionId, taskTitle, taskId, onTaskComplete }: PlanningTaskProps) {
  const router = useRouter();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // Get user name from localStorage
    const name = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";
    setUserName(name);
  }, []);

  useEffect(() => {
    async function loadContent() {
      try {
        const data = await getTaskContent(sessionId, taskTitle);
        if (data.task_content) {
          setContent(JSON.parse(data.task_content));
        } else {
          setError("Task content not found");
        }
      } catch (err) {
        setError("Failed to load task content");
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [sessionId, taskTitle]);

  const handleEvaluate = async () => {
    if (!plan.trim()) {
      setError("Please provide a plan");
      return;
    }

    setEvaluating(true);
    try {
      // Mark task as completed
      await fetch(`http://localhost:8000/complete-task/${sessionId}/${taskId}`, {
        method: "POST"
      }).catch(err => console.error("Error marking task complete:", err));

      const result = await evaluatePlan(sessionId, taskTitle, content.scenario, content.constraints, plan);
            // Set refresh flag for home page
      if (typeof window !== "undefined") {
        localStorage.setItem("refresh_timeline", "true");
      }
            // Navigate to feedback page with the result
      const params = new URLSearchParams({
        feedback: result.feedback || "",
        grade: result.grade?.toString() || "0",
        taskTitle: taskTitle,
        taskType: "planning",
        userAnswer: plan,
        taskId: taskId.toString(),
      });
      
      router.push(`/feedback?${params.toString()}`);
    } catch (err) {
      setError("Failed to evaluate plan");
      setEvaluating(false);
    }
  };

  const handleNext = () => {
    onTaskComplete();
  };

  if (loading) return <div style={{ padding: 40 }}>Loading task...</div>;
  if (error) return <div style={{ padding: 40, color: "red" }}>Error: {error}</div>;
  if (!content) return <div style={{ padding: 40 }}>No content available</div>;

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Scenario Section */}
      <div style={{
        background: "#f9f5ff",
        border: "2px solid #e0e7ff",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#764ba2", fontSize: 18 }}>Scenario</h3>
        <div style={{
          background: "#fff",
          padding: "16px",
          borderRadius: "8px",
          lineHeight: "1.6",
          color: "#333",
        }}>
          {content.scenario}
        </div>
      </div>

      {/* Constraints Section */}
      <div style={{
        background: "#fff6fb",
        border: "2px solid #e0e7ff",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}>
        <h3 style={{ margin: "0 0 12px 0", color: "#764ba2", fontSize: 18 }}>Constraints & Objectives</h3>
        <div style={{ whiteSpace: "pre-wrap", color: "#333", lineHeight: "1.6" }}>
          {content.constraints}
        </div>
      </div>

      {/* Instruction Section */}
      <div style={{
        background: "#f0f4ff",
        border: "2px solid #667eea",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "24px",
      }}>
        <p style={{ margin: 0, fontSize: 16, color: "#333" }}>{content.instruction}</p>
      </div>

      {/* Plan Input Section */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", color: "#764ba2", fontWeight: 600 }}>
          Your Negotiation Plan
        </label>
        <textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="Outline your strategy step-by-step. Consider objectives, constraints, and different approaches..."
          style={{
            width: "100%",
            minHeight: "160px",
            padding: "12px",
            border: "2px solid #e0e7ff",
            borderRadius: "8px",
            fontFamily: "inherit",
            fontSize: "16px",
            color: "#333",
            boxSizing: "border-box",
          }}
          disabled={evaluating}
        />
        <button
          onClick={handleEvaluate}
          disabled={evaluating || !plan.trim()}
          style={{
            marginTop: "12px",
            padding: "12px 24px",
            background: evaluating ? "#ccc" : "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: evaluating ? "not-allowed" : "pointer",
          }}
        >
          {evaluating ? "Evaluating..." : "Submit Plan"}
        </button>
      </div>

      {error && (
        <div style={{
          background: "#ffebee",
          border: "2px solid #f44336",
          borderRadius: "12px",
          padding: "16px",
          color: "#c62828",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
