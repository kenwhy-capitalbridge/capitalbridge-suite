let capitalUpdatedTimeout: ReturnType<typeof setTimeout> | null = null;

export function emitCapitalUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("capital_updated"));
}

export function emitCapitalUpdatedSafely(): void {
  try {
    emitCapitalUpdated();
  } catch {
    // Event emission must never block the user flow.
  }
}

export function emitCapitalUpdatedDebounced(): void {
  if (typeof window === "undefined") return;

  if (capitalUpdatedTimeout) {
    clearTimeout(capitalUpdatedTimeout);
  }

  capitalUpdatedTimeout = setTimeout(() => {
    capitalUpdatedTimeout = null;
    emitCapitalUpdatedSafely();
  }, 150);
}
