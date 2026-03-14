import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

function getValue(searchParams: SearchParams, key: string): string | null {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === "string" ? value : null;
}

export default function PaymentReturnPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const paid = getValue(searchParams ?? {}, "billplz[paid]") === "true";
  const paidAt = getValue(searchParams ?? {}, "billplz[paid_at]");
  const billId = getValue(searchParams ?? {}, "billplz[id]");
  const loginRedirect = "https://platform.thecapitalbridge.com/dashboard";

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card">
        <h1 className="cb-card-title">{paid ? "Payment received" : "Payment pending"}</h1>
        <p className="cb-card-subtitle">
          {paid
            ? "Your payment was submitted successfully. We are finishing your account setup."
            : "We could not confirm the payment status from the redirect alone."}
        </p>

        <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem", fontSize: "0.92rem", opacity: 0.9 }}>
          {billId && <p>Bill ID: {billId}</p>}
          {paidAt && <p>Paid at: {paidAt}</p>}
        </div>

        <div style={{ marginTop: "1.25rem", display: "grid", gap: "0.9rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
          <p>
            If this is your first purchase, use your payment email on{" "}
            <Link className="cb-link" href="/forgot-password">
              Forgot Password
            </Link>{" "}
            to request a password setup link, then log in.
          </p>
          <p>
            If no email arrives within a few minutes, check spam and try again later. Your account may still be finishing setup in
            the background.
          </p>
          <p>
            If you already have an account, you can go straight to{" "}
            <Link className="cb-link" href={`/login?redirectTo=${encodeURIComponent(loginRedirect)}`}>
              login
            </Link>
            .
          </p>
        </div>

        <div style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
          <Link className="cb-btn-primary" href="/forgot-password">
            Set password
          </Link>
          <Link className="cb-link" href={`/login?redirectTo=${encodeURIComponent(loginRedirect)}`}>
            Go to login
          </Link>
        </div>
      </div>
    </main>
  );
}
