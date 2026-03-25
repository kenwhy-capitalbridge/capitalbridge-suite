import { redirect } from "next/navigation";

/** Default entry: plans first. Account sign-in lives at `/access` (and `/login`). */
export default function HomePage() {
  redirect("/pricing");
}
