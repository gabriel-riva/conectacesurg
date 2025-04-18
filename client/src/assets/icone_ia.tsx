import React from "react";

export function IAIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      width="24" 
      height="24" 
      className={className}
      fill="currentColor"
    >
      <path d="M11.5 3L15 10L18.5 3H11.5Z" />
      <path d="M5.5 21L9 14L12.5 21H5.5Z" />
      <path d="M2.5 12L6 5L9.5 12H2.5Z" />
      <path d="M14.5 12L18 5L21.5 12H14.5Z" />
    </svg>
  );
}