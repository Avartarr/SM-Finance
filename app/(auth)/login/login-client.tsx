"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/browser";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    searchParams.get("error") === "unauthorized"
      ? "This account is not authorized for S&M."
      : "",
  );

  useEffect(() => {
    if (searchParams.get("error") === "unauthorized") {
      void supabase.auth.signOut();
    }
  }, [searchParams, supabase]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="min-h-[40vh] rounded-[8px] border border-white/10 bg-[linear-gradient(135deg,rgba(3,7,18,0.82),rgba(7,26,51,0.72),rgba(30,64,175,0.26)),url('/finance-texture.svg')] p-8 shadow-glow">
          <Logo />
          <div className="mt-16 max-w-xl">
            <p className="text-sm font-black uppercase tracking-normal text-blueglass">
              Private household finance
            </p>
            <h1
              className="mt-4 text-5xl font-bold tracking-normal text-white sm:text-6xl"
              style={{ fontFamily: "Georgia, 'Times New Roman', Times, serif" }}
            >
              S&amp;M
            </h1>
            <p className="mt-5 text-lg leading-8 text-white/70">
              A secure monthly budget, expense, direct debit, notes, and reporting
              workspace for Snowflake and Muffin.
            </p>
          </div>
        </div>

        <form className="glass rounded-[8px] p-6" onSubmit={onSubmit}>
          <h2 className="text-2xl font-black text-white">Sign in</h2>
          <p className="mt-2 text-sm text-white/58">Supabase Auth protects all finance data.</p>

          <label className="mt-6 block">
            <span className="label">Email</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
              <input
                className="field pl-10"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </span>
          </label>

          <label className="mt-4 block">
            <span className="label">Password</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
              <input
                className="field pl-10"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </span>
          </label>

          {message ? (
            <div className="mt-4 rounded-[8px] border border-rose/40 bg-rose/12 p-3 text-sm font-semibold text-rose">
              {message}
            </div>
          ) : null}

          <button className="mt-6 w-full btn btn-primary" disabled={loading}>
            {loading ? "Signing in..." : "Enter S&M"}
          </button>
        </form>
      </section>
    </main>
  );
}
