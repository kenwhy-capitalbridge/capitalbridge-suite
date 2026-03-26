/** Inline loading ring for primary/secondary auth buttons (Tailwind). */
export function ButtonSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-90 ${className}`}
      aria-hidden
    />
  );
}
