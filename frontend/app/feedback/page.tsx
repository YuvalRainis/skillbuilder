"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function FeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  let feedback = searchParams.get("feedback") || "No feedback available.";
  let gradeRaw = searchParams.get("grade");
  let grade: number | null = null;
  if (gradeRaw && !isNaN(Number(gradeRaw))) {
    grade = Number(gradeRaw);
  }
  const taskTitle = searchParams.get("taskTitle") || "";
  const taskType = searchParams.get("taskType") || "";
  const userAnswer = searchParams.get("userAnswer") || "";
  
  if (typeof feedback !== "string") {
    feedback = "No feedback available.";
  }

  // Survey responses
  const [difficulty, setDifficulty] = useState<string>("");
  const [confidence, setConfidence] = useState<string>("");
  const [challenges, setChallenges] = useState<string>("");
  const [takeaways, setTakeaways] = useState<string>("");
  const [taskContent, setTaskContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [html2pdf, setHtml2pdf] = useState<any>(null);

  // Dynamically import html2pdf only on client side
  useEffect(() => {
    import("html2pdf.js").then((module) => {
      setHtml2pdf(() => module.default);
    }).catch(err => console.error("Failed to load html2pdf:", err));
  }, []);

  // Fetch task content when component mounts
  useEffect(() => {
    if (taskTitle) {
      setLoadingContent(true);
      const sessionId = localStorage.getItem("session_id");
      if (sessionId) {
        fetch(`http://localhost:8000/task-content/${sessionId}?task_title=${encodeURIComponent(taskTitle)}`)
          .then(res => res.json())
          .then(data => {
            if (data.task_content) {
              try {
                setTaskContent(JSON.parse(data.task_content));
              } catch (e) {
                console.error("Failed to parse task content:", e);
              }
            }
          })
          .catch(err => console.error("Failed to fetch task content:", err))
          .finally(() => setLoadingContent(false));
      }
    }
  }, [taskTitle]);

  const handleReturnHome = async () => {
    // Save grade and user feedback to backend if available
    if (grade !== null && typeof window !== "undefined") {
      const sessionId = localStorage.getItem("session_id");
      const taskIdParam = new URLSearchParams(window.location.search).get("taskId");
      
      if (sessionId && taskIdParam) {
        try {
          // Combine user's survey responses into feedback string
          const userFeedback = [
            difficulty ? `Difficulty: ${difficulty}` : null,
            confidence ? `Confidence: ${confidence}` : null,
            challenges ? `Challenges: ${challenges}` : null,
            takeaways ? `Takeaways: ${takeaways}` : null,
          ].filter(Boolean).join(" | ");

          // Send grade + user's survey feedback (not AI feedback)
          const params = new URLSearchParams({
            grade: String(grade),
            feedback: userFeedback || "No survey responses provided"
          });
          await fetch(`http://localhost:8000/save-task-grade/${sessionId}/${taskIdParam}?${params.toString()}`, {
            method: "POST"
          }).catch(err => console.error("Error saving grade:", err));
        } catch (err) {
          console.error("Failed to save grade:", err);
        }
      }
      
      localStorage.setItem("refresh_timeline", "true");
    }
    router.push("/");
  };

  const handleTryAgain = async () => {
    // Clear the conversation messages from backend before restarting
    const sessionId = localStorage.getItem("session_id");
    if (sessionId && taskTitle) {
      try {
        await fetch(`http://localhost:8000/reset-task-conversation/${sessionId}/${encodeURIComponent(taskTitle)}`, {
          method: "POST"
        });
        console.log("Conversation cleared, starting fresh attempt");
      } catch (err) {
        console.error("Error clearing conversation:", err);
      }
    }
    // Navigate back to practice page with the same task (now with cleared messages)
    router.push(`/practice?task=${encodeURIComponent(taskTitle)}`);
  };

  const handleDownloadPDF = () => {
    if (!html2pdf) {
      alert("PDF library is still loading. Please try again in a moment.");
      return;
    }

    const element = document.getElementById("feedback-content");
    if (!element) return;

    // Set explicit width to prevent overflow
    const originalWidth = element.style.width;
    element.style.width = "650px";
    element.style.margin = "0 auto";

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `skillbuilder-feedback-${taskTitle.replace(/\s+/g, '-')}.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { 
        scale: 1,
        windowWidth: 650,
        letterRendering: true,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      },
      jsPDF: { 
        orientation: "portrait", 
        unit: "mm", 
        format: "a4",
        compress: false,
      },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        // Restore original width
        element.style.width = originalWidth;
      });
  };

  const difficultyOptions = ["Very Easy", "Easy", "Moderate", "Challenging", "Very Hard"];
  const confidenceOptions = ["Not Confident", "Slightly", "Moderately", "Confident", "Very Confident"];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5d6ff 0%, #e0e7ff 100%)",
        color: "#764ba2",
        fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
      }}
    >
      <div
        id="feedback-content"
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 8px 32px #764ba244',
          maxWidth: 900,
          width: '100%',
          color: '#764ba2',
          overflow: 'hidden',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
      >
        {/* Task Information Section */}
        {taskTitle && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ marginBottom: 16, color: '#764ba2', fontWeight: 900, fontSize: 20 }}>Task Summary</h2>
            <div style={{ background: '#f9f5ff', padding: 16, borderRadius: 12, marginBottom: 16, borderLeft: '4px solid #667eea' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: '#667eea' }}>Task Title:</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#764ba2' }}>{taskTitle}</p>
            </div>
            {taskType && (
              <div style={{ background: '#f0e7ff', padding: 12, borderRadius: 8, fontSize: 13, color: '#667eea', fontWeight: 600, marginBottom: 16 }}>
                Task Type: {taskType.charAt(0).toUpperCase() + taskType.slice(1)}
              </div>
            )}

            {/* Task Content Section */}
            {taskContent && (
              <>
                {/* Transcript */}
                {taskContent.transcript && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ marginBottom: 12, color: '#764ba2', fontSize: 15, fontWeight: 700 }}>Conversation Transcript</h3>
                    <div style={{
                      background: '#f9f5ff',
                      padding: 12,
                      borderRadius: 8,
                      fontFamily: 'monospace',
                      fontSize: 12,
                      lineHeight: '1.6',
                      color: '#333',
                      whiteSpace: 'pre-wrap',
                      border: '1px solid #e0e7ff',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      maxWidth: '100%',
                    }}>
                      {taskContent.transcript}
                    </div>
                  </div>
                )}

                {/* Question */}
                {taskContent.question && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ marginBottom: 12, color: '#764ba2', fontSize: 15, fontWeight: 700 }}>Your Task</h3>
                    <div style={{
                      background: '#f0e7ff',
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 14,
                      lineHeight: '1.6',
                      color: '#333',
                      border: '1px solid #e0e7ff',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      overflow: 'hidden',
                    }}>
                      {taskContent.question}
                    </div>
                  </div>
                )}

                {/* Scenario/Background */}
                {taskContent.scenario && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ marginBottom: 12, color: '#764ba2', fontSize: 15, fontWeight: 700 }}>Scenario</h3>
                    <div style={{
                      background: '#f9f5ff',
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 13,
                      lineHeight: '1.6',
                      color: '#333',
                      border: '1px solid #e0e7ff',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      overflow: 'hidden',
                    }}>
                      {taskContent.scenario}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* User's Answer */}
            {userAnswer && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 12, color: '#764ba2', fontSize: 15, fontWeight: 700 }}>Your Answer</h3>
                <div style={{
                  background: '#fff6fb',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 14,
                  lineHeight: '1.6',
                  color: '#333',
                  border: '1px solid #ff7eb3',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                }}>
                  {userAnswer}
                </div>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '2px solid #e0e7ff', margin: '24px 0' }} />
          </div>
        )}

        {/* LLM Feedback Section */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ marginBottom: 24, color: '#ff7eb3', fontWeight: 900, textAlign: 'center', fontSize: 24 }}>Session Feedback</h2>
          <div style={{ marginBottom: 24, whiteSpace: 'pre-line', fontSize: 16, lineHeight: 1.6, color: '#333' }}>{feedback}</div>
          {grade !== null && (
            <div style={{ marginBottom: 0, fontSize: 22, color: '#764ba2', fontWeight: 900, textAlign: 'center' }}>
              Grade: <span style={{ color: '#ff7eb3', fontWeight: 900 }}>{grade} / 5</span>
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #e0e7ff', margin: '32px 0' }} />

        {/* Survey Section */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ marginBottom: 28, color: '#764ba2', fontWeight: 900, fontSize: 20 }}>Reflection & Learning</h3>

          {/* Difficulty Rating */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', marginBottom: 12, fontWeight: 700, fontSize: 16, color: '#764ba2' }}>
              How difficult was this?
            </label>
            <p style={{ marginBottom: 12, fontSize: 14, color: '#667eea' }}>Rate the cognitive challenge level</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {difficultyOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setDifficulty(option)}
                  style={{
                    padding: '10px 16px',
                    border: difficulty === option ? '2px solid #ff7eb3' : '2px solid #e0e7ff',
                    background: difficulty === option ? '#fff6fb' : '#f9f5ff',
                    color: difficulty === option ? '#ff7eb3' : '#764ba2',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: difficulty === option ? 700 : 600,
                    fontSize: 14,
                    transition: 'all 0.2s',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Confidence Rating */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', marginBottom: 12, fontWeight: 700, fontSize: 16, color: '#764ba2' }}>
              How confident do you feel?
            </label>
            <p style={{ marginBottom: 12, fontSize: 14, color: '#667eea' }}>In handling similar situations now</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {confidenceOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setConfidence(option)}
                  style={{
                    padding: '10px 16px',
                    border: confidence === option ? '2px solid #667eea' : '2px solid #e0e7ff',
                    background: confidence === option ? '#f0e7ff' : '#f9f5ff',
                    color: confidence === option ? '#667eea' : '#764ba2',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: confidence === option ? 700 : 600,
                    fontSize: 14,
                    transition: 'all 0.2s',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Challenges Text */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 16, color: '#764ba2' }}>
              What felt challenging or surprising?
            </label>
            <p style={{ marginBottom: 12, fontSize: 14, color: '#667eea' }}>Describe any moments that caught you off guard or felt difficult</p>
            <textarea
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              placeholder="Type your reflection here..."
              style={{
                width: '100%',
                minHeight: 100,
                padding: 12,
                border: '2px solid #e0e7ff',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 14,
                color: '#333',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Takeaways Text */}
          <div style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 16, color: '#764ba2' }}>
              Key takeaways & insights
            </label>
            <p style={{ marginBottom: 12, fontSize: 14, color: '#667eea' }}>What did you learn? What would you do differently next time?</p>
            <textarea
              value={takeaways}
              onChange={(e) => setTakeaways(e.target.value)}
              placeholder="Type your insights here..."
              style={{
                width: '100%',
                minHeight: 100,
                padding: 12,
                border: '2px solid #e0e7ff',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 14,
                color: '#333',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Display Survey Responses for PDF Export */}
          {(difficulty || confidence || challenges || takeaways) && (
            <div style={{ marginTop: 28, padding: 16, background: '#f9f5ff', borderRadius: 8, display: 'none' }}>
              {difficulty && <p style={{ margin: '4px 0', fontSize: 13 }}>Difficulty: {difficulty}</p>}
              {confidence && <p style={{ margin: '4px 0', fontSize: 13 }}>Confidence: {confidence}</p>}
              {challenges && <p style={{ margin: '4px 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>Challenges: {challenges}</p>}
              {takeaways && <p style={{ margin: '4px 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>Takeaways: {takeaways}</p>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleDownloadPDF}
          style={{
            padding: "16px 36px",
            background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 900,
            boxShadow: '0 2px 8px #667eea88',
            letterSpacing: 0.5,
            transition: 'all 0.2s',
          }}
        >
          📥 Download PDF
        </button>
        <button
          onClick={handleTryAgain}
          style={{
            padding: "16px 36px",
            background: "linear-gradient(90deg, #ff7eb3 0%, #667eea 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 900,
            boxShadow: '0 2px 8px #ff7eb388',
            letterSpacing: 0.5,
            transition: 'all 0.2s',
          }}
        >
          🔄 Try Again
        </button>
        <button
          onClick={handleReturnHome}
          style={{
            padding: "16px 36px",
            background: "linear-gradient(90deg, #ff7eb3 0%, #764ba2 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 900,
            boxShadow: '0 2px 8px #ff7eb388',
            letterSpacing: 0.5,
            transition: 'all 0.2s',
          }}
        >
          Return Home
        </button>
      </div>
    </main>
  );
}
