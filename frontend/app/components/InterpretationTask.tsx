"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTaskContent, evaluateInterpretation } from "@/lib/api";

interface InterpretationTaskProps {
  sessionId: string;
  taskTitle: string;
  taskId: number;
  onTaskComplete: () => void;
}

export default function InterpretationTask({ sessionId, taskTitle, taskId, onTaskComplete }: InterpretationTaskProps) {
  const router = useRouter();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!answer.trim()) {
      setError("Please provide an interpretation");
      return;
    }

    setEvaluating(true);
    try {
      // Mark task as completed
      await fetch(`http://localhost:8000/complete-task/${sessionId}/${taskId}`, {
        method: "POST"
      }).catch(err => console.error("Error marking task complete:", err));

      const result = await evaluateInterpretation(sessionId, taskTitle, content.statement, answer);
      
      // Set refresh flag for home page
      if (typeof window !== "undefined") {
        localStorage.setItem("refresh_timeline", "true");
      }
      
      // Navigate to feedback page with the result
      const params = new URLSearchParams({
        feedback: result.feedback || "",
        grade: result.grade?.toString() || "0",
        taskTitle: taskTitle,
        taskType: "interpretation",
        userAnswer: answer,
        taskId: taskId.toString(),
      });
      
      router.push(`/feedback?${params.toString()}`);
    } catch (err) {
      setError("Failed to evaluate answer");
      setEvaluating(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading task...</div>;
  if (error) return <div style={{ padding: 40, color: "red" }}>Error: {error}</div>;
  if (!content) return <div style={{ padding: 40 }}>No content available</div>;

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Statement Section */}
      <div style={{
        background: "#f9f5ff",
        border: "2px solid #e0e7ff",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#764ba2", fontSize: 18 }}>Position Statement</h3>
        <div style={{
          background: "#fff",
          padding: "16px",
          borderRadius: "8px",
          lineHeight: "1.6",
          color: "#333",
        }}>
          {content.statement}
        </div>
      </div>

      {/* Instruction Section */}
      <div style={{
        background: "#fff6fb",
        border: "2px solid #e0e7ff",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}>
        <h3 style={{ margin: "0 0 12px 0", color: "#764ba2", fontSize: 18 }}>Task</h3>
        <p style={{ margin: 0, fontSize: 16, color: "#333" }}>{content.instruction}</p>
      </div>

      {/* Answer Input Section */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", color: "#764ba2", fontWeight: 600 }}>
          Your Interpretation
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Explain what you think the underlying needs, interests, or motivations are..."
          style={{
            width: "100%",
            minHeight: "140px",
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
          disabled={evaluating || !answer.trim()}
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
          {evaluating ? "Evaluating..." : "Submit Answer"}
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
