"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { PlatformLogoutToMarketing } from "./PlatformLogoutToMarketing";

export function PlatformHeaderAuthCluster({ initials }: { initials: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const label = `Account profile (${initials})`;

  return (
    <div
      style={{
        justifySelf: "end",
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
      }}
    >
      <Link
        href="/profile"
        className="pf-header-profile-avatar"
        aria-label={label}
        title="Profile"
        aria-busy={isPending}
        aria-disabled={isPending}
        tabIndex={isPending ? -1 : undefined}
        onClick={(e) => {
          if (e.defaultPrevented) return;
          if (e.button !== 0) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          startTransition(() => {
            router.push("/profile");
          });
        }}
        style={{
          pointerEvents: isPending ? "none" : undefined,
          opacity: isPending ? 0.92 : 1,
        }}
      >
        {isPending ? (
          <Loader2
            className="pf-header-avatar-spin"
            size={16}
            strokeWidth={2.5}
            aria-hidden
          />
        ) : (
          initials
        )}
      </Link>
      <PlatformLogoutToMarketing inline />
    </div>
  );
}
