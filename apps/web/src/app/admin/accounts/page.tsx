"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * WHO CAN SIGN IN.
 *
 * Two roles and no more, on the club's instruction: an Administrator who
 * can do everything including managing accounts, and a Member who can
 * write blog posts and nothing else.
 *
 * ── ON DELETING ACCOUNTS ──
 * Removing an account does NOT remove what that person wrote. Posts carry
 * a byline (`author_name`) separately from the account that typed them
 * (`created_by`), precisely so that a graduating member's articles do not
 * vanish from the archive when their login is closed.
 * ══════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from "react";

import { useSession } from "@/components/admin/Session";
import {
  Button,
  Card,
  ConfirmButton,
  Empty,
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
  Select,
  useFlash,
} from "@/components/admin/ui";
import { directus } from "@/lib/admin/client";

type Role = { id: string; name: string };
type User = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  role: string | null;
};

export default function AccountsPage() {
  const { user: self } = useSession();
  const [users, setUsers] = useState<User[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [flash, setFlash] = useFlash();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ email: "", first_name: "", last_name: "", password: "", role: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([
        directus<User[]>("/users?fields=id,email,first_name,last_name,status,role&limit=200&sort=email"),
        directus<Role[]>("/roles?fields=id,name"),
      ]);
      setUsers(u);
      setRoles(r);
      // Default a new account to Member, not Administrator. The safe
      // option should be the one you get by not thinking about it.
      setDraft((d) => (d.role ? d : { ...d, role: r.find((x) => x.name === "Member")?.id ?? "" }));
    } catch (e) {
      setFlash({ tone: "error", text: (e as Error).message });
      setUsers([]);
    }
  }, [setFlash]);

  useEffect(() => {
    load();
  }, [load]);

  const roleName = (id: string | null) => roles.find((r) => r.id === id)?.name ?? "No role";

  async function create() {
    if (draft.password.length < 8) {
      return setFlash({ tone: "error", text: "Choose a password of at least 8 characters." });
    }
    setBusy(true);
    try {
      await directus("/users", { body: { ...draft, status: "active" } });
      setCreating(false);
      setDraft({ email: "", first_name: "", last_name: "", password: "", role: draft.role });
      await load();
      setFlash({ tone: "success", text: "Account created. Tell them the password in person." });
    } catch (e) {
      setFlash({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Administrators can change anything. Members can write blog posts and nothing else."
        action={
          !creating ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              Add an account
            </Button>
          ) : null
        }
      />

      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

      {creating ? (
        <Card>
          <div className="space-y-5">
            <Field label="Email" required hint="They sign in with this.">
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap gap-4">
              <span className="min-w-48 flex-1">
                <Field label="First name">
                  <Input
                    value={draft.first_name}
                    onChange={(e) => setDraft({ ...draft, first_name: e.target.value })}
                  />
                </Field>
              </span>
              <span className="min-w-48 flex-1">
                <Field label="Last name">
                  <Input
                    value={draft.last_name}
                    onChange={(e) => setDraft({ ...draft, last_name: e.target.value })}
                  />
                </Field>
              </span>
            </div>
            <Field
              label="Password"
              required
              hint="At least 8 characters. There is no email reset, so give it to them directly and ask them to change it."
            >
              <Input
                type="text"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            </Field>
            <Field
              label="Role"
              required
              hint="Member unless they genuinely need to change the whole site."
            >
              <Select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex gap-3">
              <Button variant="primary" busy={busy} onClick={create}>
                Create account
              </Button>
              <Button variant="quiet" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {users === null ? (
        <Loading what="accounts" />
      ) : users.length === 0 ? (
        <Empty>No accounts.</Empty>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => {
            const isSelf = u.id === self?.id;
            const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
            return (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-line-hairline bg-bg-raised px-4 py-3"
              >
                <span>
                  <span className="block text-body-m text-text-primary">
                    {name || u.email}
                    {isSelf ? <span className="ml-2 text-body-s text-text-tertiary">(you)</span> : null}
                  </span>
                  <span className="block text-body-s text-text-tertiary">{u.email}</span>
                </span>
                <span className="flex items-center gap-4">
                  <span className="font-mono text-micro uppercase text-text-secondary">
                    {roleName(u.role)}
                  </span>
                  {/* Deleting your own account locks you out of the panel
                      you are standing in, and if you are the last
                      Administrator it locks out everyone, permanently. */}
                  {isSelf ? (
                    <span className="text-body-s text-text-tertiary">cannot remove yourself</span>
                  ) : (
                    <ConfirmButton
                      what={name || u.email}
                      onConfirm={async () => {
                        try {
                          await directus(`/users/${u.id}`, { method: "DELETE" });
                          await load();
                          setFlash({ tone: "success", text: "Account removed. Their posts remain." });
                        } catch (e) {
                          setFlash({ tone: "error", text: (e as Error).message });
                        }
                      }}
                    >
                      Remove
                    </ConfirmButton>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
