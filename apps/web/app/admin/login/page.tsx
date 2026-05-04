import { redirect } from "next/navigation";
import { isAdmin, isAdminConfigured, setAdminCookie } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const token = String(formData.get("token") ?? "");
    const ok = await setAdminCookie(token);
    if (!ok) redirect("/admin/login?error=invalid");
    redirect("/admin");
  }

  if (!isAdminConfigured()) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <p className="label text-danger mb-3">DISABLED</p>
        <h1 className="font-display text-2xl text-foreground mb-4">
          ADMIN NOT CONFIGURED
        </h1>
        <p className="text-foreground-muted">
          Set the <code className="text-accent-gold">ADMIN_TOKEN</code> env var
          (16+ chars) and redeploy to enable the admin console.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <p className="label text-accent-gold mb-3">ADMIN</p>
      <h1 className="font-display text-2xl text-foreground mb-8">
        SIGN IN
      </h1>
      <form action={login} className="flex flex-col gap-4">
        <input
          type="password"
          name="token"
          placeholder="ADMIN TOKEN"
          autoFocus
          required
          className="bg-background-soft border border-border-soft px-3 py-2.5 font-mono text-foreground placeholder:text-foreground-faint focus:border-accent-gold outline-none"
        />
        <button
          type="submit"
          className="border border-accent-gold text-accent-gold label px-4 py-2.5 hover:bg-accent-gold/10 transition"
        >
          Sign in
        </button>
      </form>
      {error === "invalid" && (
        <p className="label-sm text-danger mt-4">INVALID TOKEN</p>
      )}
    </div>
  );
}
