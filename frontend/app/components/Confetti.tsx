"use client";
import React, { useEffect, useRef } from "react";

export default function Confetti({ trigger }: { trigger: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const confettiCount = 120;
    const confetti: any[] = [];
    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * W,
        y: Math.random() * -H,
        r: Math.random() * 6 + 4,
        d: Math.random() * confettiCount,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        tilt: Math.random() * 10 - 10,
        tiltAngle: 0,
        tiltAngleIncremental: (Math.random() * 0.07) + 0.05
      });
    }
    let angle = 0;
    let animationFrame: number;
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      angle += 0.01;
      for (let i = 0; i < confettiCount; i++) {
        let c = confetti[i];
        c.tiltAngle += c.tiltAngleIncremental;
        c.y += (Math.cos(angle + c.d) + 3 + c.r / 2) / 2;
        c.x += Math.sin(angle);
        c.tilt = Math.sin(c.tiltAngle) * 15;
        ctx.beginPath();
        ctx.lineWidth = c.r;
        ctx.strokeStyle = c.color;
        ctx.moveTo(c.x + c.tilt + c.r / 3, c.y);
        ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r);
        ctx.stroke();
      }
      animationFrame = requestAnimationFrame(draw);
    }
    draw();
    setTimeout(() => {
      cancelAnimationFrame(animationFrame);
      ctx.clearRect(0, 0, W, H);
    }, 1800);
    // eslint-disable-next-line
  }, [trigger]);

  return (
    <canvas ref={ref} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000 }} />
  );
}
