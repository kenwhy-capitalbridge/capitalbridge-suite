export async function sendRecoveryEmailAfterPayment(
  svc: Svc,
  userId: string,
  userEmail: string
  ): Promise<void> {
  const email = userEmail.trim();
  if (!email) {
  console.warn("[billing-recovery-email] skip: empty email", { userId });
  return;
  }
  
  const redirectTo = getAccessPageRedirectUrl();
  
  const { error } = await svc.auth.admin.generateLink({
  type: "recovery",
  email,
  options: { redirectTo },
  });
  
  if (error) {
  console.error("[billing-recovery-email] generateLink failed", {
  userId,
  email,
  message: error.message,
  });
  throw error; // fail loud, do NOT fallback silently
  }
  
  console.log("[billing-recovery-email] recovery email sent", { email });
  }
  