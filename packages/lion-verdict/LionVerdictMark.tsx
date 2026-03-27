/**
 * Small lion mark for Lion's Verdict chrome (inline SVG, no asset fetch).
 */
export function LionVerdictMark({ className = "h-7 w-7 shrink-0 text-[#FFCC6A]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="17" r="11" fill="currentColor" opacity={0.18} />
      <path
        fill="currentColor"
        d="M16 5C10.5 5 6 9 6 14.5c0 3 1.2 5.7 3.2 7.5L8 28h16l-1.2-6c2-1.8 3.2-4.5 3.2-7.5C26 9 21.5 5 16 5Zm-4.5 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm9 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM16 20c-1.8 0-3.3-.9-4-2.2h8c-.7 1.3-2.2 2.2-4 2.2Z"
      />
    </svg>
  );
}
