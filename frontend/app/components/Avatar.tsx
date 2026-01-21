"use client";

import { useEffect, useState, useRef } from "react";

type Gender = "male" | "female" | "other";

export default function Avatar() {
  const [gender, setGender] = useState<Gender>(() => {
    if (typeof window === "undefined") return "male";
    return (localStorage.getItem("avatar_gender") as Gender) || "male";
  });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("user_name") || "";
  });
  const [showNamePrompt, setShowNamePrompt] = useState<boolean>(!name);
  const [nameInput, setNameInput] = useState("");

  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("avatar_gender", gender);
    } catch (e) {
      // ignore
    }
  }, [gender]);

  useEffect(() => {
    try {
      if (name) localStorage.setItem("user_name", name);
      else localStorage.removeItem("user_name");
    } catch (e) {
      // ignore
    }
  }, [name]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const avatarEmoji = gender === "male" ? "👦" : gender === "female" ? "👧" : "🙂";

  function submitName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setName(trimmed);
    setShowNamePrompt(false);
    setNameInput("");
    
    // Dispatch custom event to notify other components (like home page) that name changed
    window.dispatchEvent(new CustomEvent("userNameChanged", { detail: { name: trimmed } }));
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {/* Avatar + dropdown */}
      <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
        <button
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen((s) => !s)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              background: gender === "male" ? "linear-gradient(135deg, #6fb1ff 0%, #3a8ee6 100%)" : gender === "female" ? "linear-gradient(135deg, #ffb6d5 0%, #ff7aa6 100%)" : "linear-gradient(135deg, #e0e0e0 0%, #cfcfcf 100%)",
              color: "white",
            }}
          >
            {avatarEmoji}
          </div>
        </button>

        {open && (
          <div
            role="menu"
            aria-label="Choose avatar"
            style={{
              position: "absolute",
              right: 0,
              marginTop: 8,
              background: "white",
              padding: 8,
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              minWidth: 160,
              zIndex: 40,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  setGender("male");
                  setOpen(false);
                }}
                style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "#f7fbff" }}
              >
                <span style={{ fontSize: 18 }}>👦</span>
                <span style={{ fontWeight: 600 }}>Boy</span>
              </button>
              <button
                onClick={() => {
                  setGender("female");
                  setOpen(false);
                }}
                style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "#fff7fb" }}
              >
                <span style={{ fontSize: 18 }}>👧</span>
                <span style={{ fontWeight: 600 }}>Girl</span>
              </button>
              <button
                onClick={() => {
                  setGender("other");
                  setOpen(false);
                }}
                style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "#f7f7f7" }}
              >
                <span style={{ fontSize: 18 }}>🙂</span>
                <span style={{ fontWeight: 600 }}>Other</span>
              </button>
              <hr style={{ border: "none", height: 1, background: "#eee", margin: "6px 0" }} />
              <button
                onClick={() => {
                  setShowNamePrompt(true);
                  setOpen(false);
                }}
                style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "#f7f7ff" }}
              >
                <span style={{ fontSize: 16 }}>✏️</span>
                <span style={{ fontWeight: 600 }}>Change name</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Name / greeting */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {name ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>Hi,</div>
            <div style={{ fontWeight: 700 }}>{name}</div>
          </div>
        ) : (
          <button
            onClick={() => setShowNamePrompt(true)}
            style={{ fontSize: 13, color: "#667eea", border: "none", background: "transparent", cursor: "pointer" }}
          >
            Tell us your name
          </button>
        )}
      </div>

      {/* Name prompt modal */}
      {showNamePrompt && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            zIndex: 60,
          }}
          onClick={() => setShowNamePrompt(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", padding: 20, borderRadius: 12, width: 380, maxWidth: "92%", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}
          >
            <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16 }}>What's your name?</h3>
            <p style={{ marginTop: 0, marginBottom: 12, color: "#666", fontSize: 13 }}>We’ll personalize the experience just for you.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitName(); }}
                placeholder="Your name"
                style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
              />
              <button
                onClick={submitName}
                style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#667eea", color: "white", fontWeight: 700, cursor: "pointer" }}
              >
                Save
              </button>
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowNamePrompt(false)}
                style={{ border: "none", background: "transparent", color: "#999", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
