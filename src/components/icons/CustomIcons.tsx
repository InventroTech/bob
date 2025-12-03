import React from 'react';

export const FollowUpIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_follow_up)">
      <path
        d="M9.5 14C11.71 14 13.5 12.21 13.5 10C13.5 7.79 11.71 6 9.5 6C7.29 6 5.5 7.79 5.5 10C5.5 12.21 7.29 14 9.5 14ZM9.5 8C10.6 8 11.5 8.9 11.5 10C11.5 11.1 10.6 12 9.5 12C8.4 12 7.5 11.1 7.5 10C7.5 8.9 8.4 8 9.5 8Z"
        fill="#0B0C10"
        fillOpacity="0.8"
      />
      <path
        d="M15.89 16.56C14.21 15.7 12.03 15 9.5 15C6.97 15 4.79 15.7 3.11 16.56C2.11 17.07 1.5 18.1 1.5 19.22V22H17.5V19.22C17.5 18.1 16.89 17.07 15.89 16.56ZM15.5 20H3.5V19.22C3.5 18.84 3.7 18.5 4.02 18.34C5.21 17.73 7.13 17 9.5 17C11.87 17 13.79 17.73 14.98 18.34C15.3 18.5 15.5 18.84 15.5 19.22V20Z"
        fill="#0B0C10"
        fillOpacity="0.8"
      />
      <path
        d="M19.8272 8.18918C19.8272 6.37248 19.1369 3.95357 17.2728 2.28429C14.6746 -0.0421777 10.9629 -0.315451 8.09548 1.33521L9.02384 2.95177C11.2065 1.69474 14.0385 1.90501 16.022 3.68113C17.6164 5.10882 18 6.99995 17.9421 8.29316L15.1083 8.50464L19.1369 12.0075L22.6398 7.97887L19.8272 8.18918Z"
        fill="#0B0C10"
        fillOpacity="0.8"
      />
    </g>
    <defs>
      <clipPath id="clip0_follow_up">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export const WIPTicketIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <text x="12" y="13" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">WIP</text>
  </svg>
);

