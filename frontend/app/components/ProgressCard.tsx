"use client";
import React from "react";

export default function ProgressCard({ completed, total, userName, percent, averageGrade }: { completed: number, total: number, userName: string, percent: number, averageGrade?: number }) {
  return (
    <div
      style={{
        padding: 36,
        borderRadius: 32,
        background: "linear-gradient(135deg, #fff6fb 0%, #e0e7ff 100%)",
        boxShadow: "0 8px 32px 0 rgba(120, 120, 255, 0.18), 0 1.5px 16px 0 rgba(255, 120, 220, 0.10)",
        border: "2.5px solid #e0e7ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 36,
        width: "100%",
        maxWidth: 520,
        marginLeft: "auto",
        marginRight: "auto",
        position: "relative",
        overflow: "hidden",
        fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
        zIndex: 2,
        transition: "box-shadow 0.3s cubic-bezier(.4,0,.2,1)",
      }}
    >
      <h2 style={{
        fontSize: 34,
        fontWeight: 900,
        marginBottom: 8,
        fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
        color: '#764ba2',
        letterSpacing: 1.2,
        textShadow: '0 2px 16px #e0e7ff, 0 1px 4px #667eea44',
        textAlign: 'center',
        lineHeight: 1.1,
      }}>
        Hi, {userName}!
      </h2>
      <div style={{
        fontSize: 20,
        fontWeight: 700,
        color: '#667eea',
        marginBottom: 18,
        fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
        textAlign: 'center',
        letterSpacing: 0.5,
      }}>
        You have completed <span style={{ color: '#764ba2', fontWeight: 900 }}>{completed}</span> of <span style={{ color: '#764ba2', fontWeight: 900 }}>{total}</span> tasks
      </div>
      <div style={{ width: "100%", marginBottom: 10 }}>
        <div style={{
          width: "100%",
          height: 22,
          background: "#f3e8ff",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 2px 12px #e0e7ff88",
          border: "1.5px solid #e0e7ff",
          position: 'relative',
        }}>
          <div style={{
            height: "100%",
            width: `${percent}%`,
            background: "linear-gradient(90deg, #ff7eb3 0%, #667eea 60%, #764ba2 100%)",
            borderRadius: 12,
            transition: "width 0.7s cubic-bezier(.4,0,.2,1)",
            boxShadow: "0 2px 12px #ff7eb388, 0 0 8px #764ba2cc",
            display: 'flex',
            alignItems: 'center',
            justifyContent: percent > 10 ? 'flex-end' : 'flex-start',
            position: 'relative',
            zIndex: 2,
          }}>
            <span style={{
              fontSize: 16,
              fontWeight: 900,
              color: '#fff',
              textShadow: '0 1px 8px #764ba2, 0 1px 2px #667eea',
              padding: '0 14px',
              letterSpacing: 0.5,
              lineHeight: '22px',
              opacity: 0.98,
              background: 'rgba(120,120,255,0.22)',
              borderRadius: 10,
              margin: 2,
            }}>{percent}%</span>
          </div>
        </div>
      </div>
      <div style={{
        fontSize: 15,
        fontWeight: 700,
        color: '#764ba2',
        marginTop: 2,
        fontFamily: 'Quicksand, Poppins, Inter, Arial, sans-serif',
        letterSpacing: 0.2,
        textAlign: 'center',
      }}>
        {percent}% complete
      </div>
      {averageGrade !== undefined && completed > 0 && (
        <div style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: '2px solid #e0e7ff',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#667eea',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            Average Performance
          </div>
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            color: '#ff7eb3',
          }}>
            {averageGrade.toFixed(1)} / 5.0
          </div>
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@700;900&display=swap');
      `}</style>
    </div>
  );
}
