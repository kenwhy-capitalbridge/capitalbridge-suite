/** Inline loading ring for primary/secondary auth buttons (`cb-auth-ring-spin` in `@cb/ui/cb-model-base.css`). */
export function ButtonSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent opacity-90 cb-auth-ring-spin ${className}`}
      aria-hidden
    />
  );
}
