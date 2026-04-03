import { redirect } from "next/navigation";

/** Alias for the advisory framework home (`/`). Used as BACK fallback from subpages like `/solutions`. */
export default function FrameworkAliasPage() {
  redirect("/");
}
