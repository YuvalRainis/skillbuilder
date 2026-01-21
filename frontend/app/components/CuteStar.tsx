// CuteStar.tsx
import React from "react";

export default function CuteStar({ style = {} }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <polygon
        points="24,4 29.39,17.09 44,18.18 32,28.09 35.82,42.18 24,34.09 12.18,42.18 16,28.09 4,18.18 18.61,17.09"
        fill="#FFE066"
        stroke="#FFD700"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <polygon
        points="24,10 27.09,17.09 34,18.18 28,23.09 29.82,30.18 24,26.09 18.18,30.18 20,23.09 14,18.18 20.91,17.09"
        fill="#FFF9C4"
        stroke="#FFD700"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
