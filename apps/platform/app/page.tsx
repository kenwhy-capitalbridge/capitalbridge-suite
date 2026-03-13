import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getServerUser();
  if (user) redirect("/dashboard");
  redirect("/login");
}

