import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Admin login — Review Agent" },
      {
        name: "description",
        content:
          "Sign in to Review Agent to analyze a business website and publish its 60-second customer review page.",
      },
      { property: "og:title", content: "Admin login — Review Agent" },
      {
        property: "og:description",
        content: "Sign in to set up a business and publish its customer review page.",
      },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/setup", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/setup", replace: true });
      } else {
        toast.success("Check your inbox to confirm your email, then sign in.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-semibold">RA</span>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Review Agent · Admin
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-sun via-ember to-terracotta p-7 md:block">
            <div className="absolute -right-10 -top-10 size-44 rounded-full bg-clementine/40" />
            <div className="relative h-full">
              <h1 className="max-w-[20ch] font-display text-2xl font-medium leading-tight text-primary-foreground">
                Turn a website into a 60-second Google review.
              </h1>
              <p className="mt-4 max-w-[34ch] text-sm text-primary-foreground/80">
                Analyze the site, extract the business, and hand customers warm, authentic review
                options to post.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-card p-7 ring-1 ring-border md:col-span-2">
            <h2 className="text-balance font-display text-2xl font-semibold tracking-tight">
              {mode === "login" ? "Sign in to your workspace" : "Create your admin account"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only verified admins can configure a business.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="w-full rounded-xl border-0 bg-background px-4 py-3 text-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-xl border-0 bg-background px-4 py-3 text-sm ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground ring-1 ring-inset ring-primary/30 transition-colors hover:bg-accent disabled:opacity-60"
              >
                {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {mode === "login"
                  ? "First time here? Create an admin account"
                  : "Already have an account? Log in"}
              </button>
              <p className="text-xs text-muted-foreground/70">
                Protected by secure authentication · sessions are scoped to one business.
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
