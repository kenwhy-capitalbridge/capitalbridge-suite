"use client";

import { useCallback, useState } from "react";
import styles from "./ModelAppHeader.module.css";

export function ModelAppHeaderBackButton({ href }: { href: string }) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(() => {
    if (pending) return;
    setPending(true);
    window.location.assign(href);
  }, [href, pending]);

  return (
    <button
      type="button"
      className={styles.back}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      aria-label={pending ? "Going back, please wait" : "Back to platform"}
    >
      {pending ? (
        <>
          <span className={styles.backSpinner} aria-hidden />
          <span>Back</span>
        </>
      ) : (
        "Back"
      )}
    </button>
  );
}
