import React from "react";

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 137"
      className={className}
    >
      <g>
        {/* E */}
        <path fill="#7DC577" d="M10,30 h30 v12 h-30 z" />
        <path fill="#7DC577" d="M10,60 h30 v12 h-30 z" />
        <path fill="#7DC577" d="M10,90 h30 v12 h-30 z" />

        {/* C */}
        <path
          fill="#0D3B4D"
          d="M50,30 q-20,0 -30,20 q-10,20 0,40 q10,20 30,20 h30 v-20 h-30 q-10,0 -15,-10 q-5,-10 0,-20 q5,-10 15,-10 h30 v-20 z"
        />

        {/* O with network icon */}
        <circle cx="145" cy="70" r="40" fill="#0D3B4D" />
        <circle cx="145" cy="70" r="30" fill="none" stroke="#7DC577" strokeWidth="3" />
        <circle cx="115" cy="70" r="5" fill="#7DC577" />
        <circle cx="130" cy="45" r="5" fill="#7DC577" />
        <circle cx="160" cy="45" r="5" fill="#7DC577" />
        <circle cx="175" cy="70" r="5" fill="#7DC577" />
        <circle cx="160" cy="95" r="5" fill="#7DC577" />
        <circle cx="130" cy="95" r="5" fill="#7DC577" />
        <line x1="115" y1="70" x2="130" y2="45" stroke="#7DC577" strokeWidth="2" />
        <line x1="130" y1="45" x2="160" y2="45" stroke="#7DC577" strokeWidth="2" />
        <line x1="160" y1="45" x2="175" y2="70" stroke="#7DC577" strokeWidth="2" />
        <line x1="175" y1="70" x2="160" y2="95" stroke="#7DC577" strokeWidth="2" />
        <line x1="160" y1="95" x2="130" y2="95" stroke="#7DC577" strokeWidth="2" />
        <line x1="130" y1="95" x2="115" y2="70" stroke="#7DC577" strokeWidth="2" />

        {/* N */}
        <path
          fill="#0D3B4D"
          d="M190,30 h20 v40 l40,-40 h20 v80 h-20 v-40 l-40,40 h-20 z"
        />

        {/* E */}
        <path fill="#0D3B4D" d="M280,30 h70 v15 h-50 v15 h40 v15 h-40 v15 h50 v15 h-70 z" />
        <path fill="#7DC577" d="M320,60 h30 v15 h-30 z" />

        {/* C */}
        <path
          fill="#0D3B4D"
          d="M360,30 q-20,0 -30,20 q-10,20 0,40 q10,20 30,20 h30 v-20 h-30 q-10,0 -15,-10 q-5,-10 0,-20 q5,-10 15,-10 h30 v-20 z"
        />

        {/* T */}
        <path fill="#0D3B4D" d="M400,30 h60 v15 h-20 v65 h-20 v-65 h-20 z" />

        {/* A */}
        <path
          fill="#0D3B4D"
          d="M470,30 h20 l30,80 h-20 l-5,-15 h-30 l-5,15 h-20 z M473,75 h20 l-10,-30 z"
        />
      </g>
    </svg>
  );
};
