"use client";

/**
 * Sign in. /admin/login
 *
 * Two roles arrive here and the page does not care which — Directus
 * decides, and the shell shows each of them a different menu afterwards.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSession } from "@/components/admin/Session";
import { Button, Field, Input, Notice } from "@/components/admin/ui";
import { AdminError } from "@/lib/admin/client";

export default function LoginPage() {
  const { user, loading, signIn } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Somebody already signed in who navigates here should land on the
  // panel, not stare at a login form asking who they are.
  useEffect(() => {
    if (!loading && user) router.replace("/admin/");
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/admin/");
    } catch (err) {
      // Deliberately does not distinguish "no such account" from "wrong
      // password". Which one it is, is information for somebody guessing.
      setError(
        err instanceof AdminError && err.status >= 500
          ? "The server is not responding. Try again in a moment."
          : "That email and password do not match an account.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <span className="text-heading-s text-text-primary" style={{ fontVariationSettings: "'wght' 600" }}>
            BRS
          </span>
          <h1
            className="mt-4 text-display-m text-text-primary"
            style={{ fontVariationSettings: "'wght' 600" }}
          >
            Website admin
          </h1>
          <p className="mt-3 text-body-m text-text-secondary">
            Sign in to add events, update the committee, or write a post.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 border border-line-hairline bg-bg-raised p-6">
          {error ? <Notice tone="error">{error}</Notice> : null}

          <Field label="Email" required>
            <Input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // Autofocus is right here and almost nowhere else: this page
              // has exactly one purpose and the caret belongs in the only
              // field that starts it.
              autoFocus
            />
          </Field>

          <Field label="Password" required>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <Button type="submit" variant="primary" busy={busy} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-body-s text-text-tertiary">
          Accounts are created by an Administrator. If you need one, or have lost your
          password, ask the current webmaster — there is no self-service reset.
        </p>
      </div>
    </div>
  );
}
