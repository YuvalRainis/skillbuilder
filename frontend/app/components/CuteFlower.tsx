// CuteFlower.tsx
import React from "react";

export default function CuteFlower({ style = {} }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <circle cx="30" cy="30" r="10" fill="#FFD6E0" />
      <ellipse cx="30" cy="15" rx="7" ry="12" fill="#FFB7C5" />
      <ellipse cx="30" cy="45" rx="7" ry="12" fill="#FFB7C5" />
      <ellipse cx="15" cy="30" rx="12" ry="7" fill="#FFB7C5" />
      <ellipse cx="45" cy="30" rx="12" ry="7" fill="#FFB7C5" />
      <ellipse cx="20" cy="20" rx="6" ry="4" fill="#FFD6E0" />
      <ellipse cx="40" cy="20" rx="6" ry="4" fill="#FFD6E0" />
      <ellipse cx="20" cy="40" rx="6" ry="4" fill="#FFD6E0" />
      <ellipse cx="40" cy="40" rx="6" ry="4" fill="#FFD6E0" />
      <circle cx="30" cy="30" r="5" fill="#FF7EB3" />
    </svg>
  );
}
