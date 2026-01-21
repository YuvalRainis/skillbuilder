"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTaskContent, evaluateTechnique } from "@/lib/api";

interface TechniqueTaskProps {
  sessionId: string;
  taskTitle: string;
  taskId: number;
  onTaskComplete: () => void;
}

export default function TechniqueTask({ sessionId, taskTitle, taskId, onTaskComplete }: TechniqueTaskProps) {
  const router = useRouter();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
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
    if (!response.trim()) {
      setError("Please provide a response");
      return;
    }

    setEvaluating(true);
    try {
      // Mark task as completed
      await fetch(`http://localhost:8000/complete-task/${sessionId}/${taskId}`, {
        method: "POST"
      }).catch(err => console.error("Error marking task complete:", err));

      const result = await evaluateTechnique(
        sessionId,
        taskTitle,
        content.technique_name,
        content.technique_instruction,
        content.other_person_says,
        response
      );
      
      // Set refresh flag for home page
      if (typeof window !== "undefined") {
        localStorage.setItem("refresh_timeline", "true");
      }
      
      // Navigate to feedback page with the result
      const params = new URLSearchParams({
        feedback: result.feedback || "",
        grade: result.grade?.toString() || "0",
        taskTitle: taskTitle,
        taskType: "technique",
        userAnswer: response,
        taskId: taskId.toString(),
      });
      
      router.push(`/feedback?${params.toString()}`);
    } catch (err) {
      setError("Failed to evaluate response");
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
      {/* Context Section */}
      <div style={{
        background: "#f9f5ff",
        border: "2px solid #e0e7ff",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#764ba2", fontSize: 18 }}>Context</h3>
        <div style={{
          background: "#fff",
          padding: "16px",
          borderRadius: "8px",
          lineHeight: "1.6",
          color: "#333",
        }}>
          {content.context}
        </div>
      </div>

      {/* Technique & Instruction Section */}
      <div style={{
        background: "#fff6fb",
        border: "2px solid #e0e7ff",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}>
        <h3 style={{ margin: "0 0 12px 0", color: "#764ba2", fontSize: 18 }}>
          Technique: {content.technique_name}
        </h3>
        <p style={{ margin: "0 0 16px 0", color: "#333" }}>{content.technique_instruction}</p>
      </div>

      {/* Other Person Statement Section */}
      <div style={{
        background: "#f0f4ff",
        border: "2px solid #667eea",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
      }}>
        <p style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 600, color: "#667eea" }}>
          Other Person Says:
        </p>
        <blockquote style={{
          margin: 0,
          paddingLeft: "16px",
          borderLeft: "4px solid #667eea",
          fontStyle: "italic",
          color: "#333",
        }}>
          "{content.other_person_says}"
        </blockquote>
      </div>

      {/* Response Input Section */}
      {!feedback ? (
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", color: "#764ba2", fontWeight: 600 }}>
            Your Response
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Practice the technique by writing your response..."
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
            disabled={evaluating || !response.trim()}
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
            {evaluating ? "Evaluating..." : "Submit Response"}
          </button>
        </div>
      ) : null}

      {/* Feedback Section */}
      {feedback && (
        <div style={{
          background: "#e8f5e9",
          border: "2px solid #4caf50",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
        }}>
          <h3 style={{
            margin: "0 0 12px 0",
            color: "#2e7d32",
            fontSize: 18,
          }}>
            Technique Application Evaluation
          </h3>

          {/* Your Response Section */}
          <div style={{
            background: "rgba(76, 175, 80, 0.1)",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "16px",
            borderLeft: "4px solid #4caf50",
          }}>
            <p style={{ margin: "0 0 8px 0", color: "#2e7d32", fontWeight: 600 }}>Your Response:</p>
            <p style={{ margin: 0, color: "#333", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{answer}</p>
          </div>
          
          {/* Coach Message */}
          {feedback.coach_message && (
            <div style={{
              background: "rgba(255,255,255,0.5)",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontStyle: "italic",
              color: "#333",
              lineHeight: "1.6",
            }}>
              <p style={{ margin: 0 }}>
                <strong>Coach:</strong> {userName ? `Hi ${userName}! ` : ""}
                {feedback.coach_message}
              </p>
            </div>
          )}
          
          <div style={{ marginBottom: "12px" }}>
            <p style={{ margin: "0 0 8px 0", color: "#333" }}>
              <strong>Technique Applied Correctly:</strong> {feedback.technique_applied ? "Yes ✓" : "Needs work"}
            </p>
            <p style={{ margin: "0 0 8px 0", color: "#333" }}>
              <strong>Quality:</strong> {feedback.quality}
            </p>
          </div>

          <p style={{ margin: "0 0 12px 0", color: "#333" }}>{feedback.analysis}</p>

          {feedback.example && (
            <div style={{
              background: "rgba(0,0,0,0.05)",
              padding: "12px",
              borderRadius: "6px",
              marginTop: "12px",
            }}>
              <p style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 600, color: "#333" }}>
                Alternative Approach:
              </p>
              <p style={{ margin: 0, fontSize: "14px", color: "#555" }}>{feedback.example}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button
              onClick={handleNext}
              style={{
                flex: 1,
                padding: "12px 24px",
                background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Next Task
            </button>
            <button
              onClick={handleTryAgain}
              style={{
                flex: 1,
                padding: "12px 24px",
                background: "rgba(0, 0, 0, 0.1)",
                color: "#764ba2",
                border: "2px solid #764ba2",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

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
