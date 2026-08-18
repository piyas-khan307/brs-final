"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * WRITE A POST — and, if you are an Administrator, decide on it.
 *
 * One screen for both jobs, because they are the same object seen from
 * two sides, and a separate "moderation queue" screen would mean reading
 * a post in one place and acting on it in another.
 *
 * ── WHAT A MEMBER SEES ──
 * Title, body, cover, and one button: "Submit for review". No publish
 * switch, no review-status dropdown. Those are not hidden to be tidy —
 * Directus would refuse them anyway — they are hidden because a control
 * that always fails is worse than no control.
 *
 * ── WHAT AN ADMINISTRATOR SEES ──
 * The same form plus Approve / Request changes / Publish. Approving
 * records who and when, because `posts_approval_needs_attribution`
 * requires it and, more to the point, because an approval nobody signed
 * is not one.
 * ══════════════════════════════════════════════════════════════════════
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { PhotoPicker } from "@/components/admin/PhotoPicker";
import { RichText } from "@/components/admin/RichText";
import { useSession } from "@/components/admin/Session";
import {
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
  Textarea,
  useFlash,
} from "@/components/admin/ui";
import { items } from "@/lib/admin/client";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  body_format: string;
  author_name: string;
  cover_asset_id: string | null;
  tags: string[] | null;
  review_state: string;
  review_note: string | null;
  published: boolean;
};

/** "Robo Carnival 2024" → "robo-carnival-2024". Nobody should have to be
 *  told what a slug is to write a blog post. */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

function PostEditor() {
  const { user } = useSession();
  const router = useRouter();
  const id = useSearchParams().get("id");
  const isNew = !id;

  const [post, setPost] = useState<Partial<Post>>({
    title: "",
    excerpt: "",
    body: "",
    body_format: "md",
    author_name: "",
    review_state: "draft",
    published: false,
    tags: [],
  });
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useFlash();
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isNew) {
      // Sensible default byline — the account's own name. Editable,
      // because officers do post on behalf of a team.
      setPost((p) => ({
        ...p,
        author_name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
      }));
      return;
    }
    items
      .get<Post>("posts", id, { fields: "*" })
      .then((p) => {
        setPost(p);
        setSlugTouched(true);
        setLoading(false);
      })
      .catch((e) => {
        setFlash({ tone: "error", text: (e as Error).message });
        setLoading(false);
      });
  }, [id, isNew, user, setFlash]);

  const set = <K extends keyof Post>(k: K, v: Post[K]) => setPost((p) => ({ ...p, [k]: v }));

  const save = useCallback(
    async (patch: Partial<Post> = {}, message = "Saved.") => {
      setBusy(true);
      try {
        const payload = {
          slug: post.slug || slugify(post.title ?? "") || `post-${Date.now()}`,
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          body_format: post.body_format ?? "md",
          author_name: post.author_name,
          cover_asset_id: post.cover_asset_id ?? null,
          tags: post.tags ?? [],
          ...patch,
        };
        const saved = isNew
          ? await items.create<Post>("posts", payload)
          : await items.update<Post>("posts", id!, payload);
        setPost(saved);
        setFlash({ tone: "success", text: message });
        if (isNew) router.replace(`/admin/posts/edit/?id=${saved.id}`);
        return true;
      } catch (e) {
        setFlash({ tone: "error", text: (e as Error).message });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [post, isNew, id, router, setFlash],
  );

  if (loading) return <Loading what="the post" />;
  if (!user) return null;

  const admin = user.isAdministrator;
  const state = post.review_state ?? "draft";
  // A Member may edit only while the post is theirs to edit. Directus
  // enforces this; showing it read-only is how they find out without
  // losing what they typed into a form that was never going to save.
  const locked = !admin && (state === "submitted" || state === "approved" || post.published);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? "Write a post" : "Edit post"}
        description={
          locked
            ? "This post is with an Administrator. You will be able to edit it again if they ask for changes."
            : undefined
        }
        action={
          <Link href="/admin/posts/">
            <Button variant="quiet">Back to posts</Button>
          </Link>
        }
      />

      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

      {state === "changes_requested" && post.review_note ? (
        <Notice tone="warning">
          <strong>An Administrator asked for changes:</strong> {post.review_note}
        </Notice>
      ) : null}

      <div className="space-y-6">
        <Field label="Title" required>
          <Input
            value={post.title ?? ""}
            disabled={locked}
            onChange={(e) => {
              set("title", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
          />
        </Field>

        <Field
          label="Web address"
          hint="The end of the link, e.g. brs.org/blog/robo-carnival-2024. Filled in from the title; change it only if you need to."
        >
          <Input
            value={post.slug ?? ""}
            disabled={locked}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", slugify(e.target.value));
            }}
          />
        </Field>

        <Field label="Byline" hint="The name shown on the post." required>
          <Input
            value={post.author_name ?? ""}
            disabled={locked}
            onChange={(e) => set("author_name", e.target.value)}
          />
        </Field>

        <Field
          label="Summary"
          required
          hint="One or two sentences, shown on the blog index and in link previews."
        >
          <Textarea
            rows={3}
            value={post.excerpt ?? ""}
            disabled={locked}
            onChange={(e) => set("excerpt", e.target.value)}
          />
        </Field>

        <Field
          label="Body"
          required
          hint="Select words and use the toolbar. Pictures, video and colour are all available — the same editor the event write-ups use."
        >
          {/* A locked post is one an Administrator is holding. Showing a
              live editor for something that cannot be saved would invite
              somebody to type into it and lose the lot, so it goes back to
              a plain disabled box — visibly not editable. */}
          {locked ? (
            <Textarea
              rows={18}
              value={post.body ?? ""}
              disabled
              className="font-mono text-body-s"
            />
          ) : (
            <RichText
              value={post.body ?? ""}
              format={post.body_format ?? "md"}
              onChange={(next) =>
                setPost((p) => ({ ...p, body: next.content, body_format: next.format }))
              }
            />
          )}
        </Field>

        <Card>
          <PhotoPicker
            label="Cover photograph"
            hint="Shown at the top of the post and in link previews."
            value={post.cover_asset_id ?? null}
            onChange={(assetId) => set("cover_asset_id", assetId)}
          />
        </Card>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-t border-line-hairline pt-6">
        {!locked ? (
          <Button variant="secondary" busy={busy} onClick={() => save()}>
            Save draft
          </Button>
        ) : null}

        {!admin && !locked ? (
          <Button
            variant="primary"
            busy={busy}
            onClick={() => save({ review_state: "submitted" }, "Sent for approval.")}
          >
            Submit for review
          </Button>
        ) : null}

        {admin ? (
          <>
            {state !== "approved" ? (
              <Button
                variant="primary"
                busy={busy}
                onClick={() =>
                  save(
                    {
                      review_state: "approved",
                      // Who and when. Required by
                      // posts_approval_needs_attribution, and the reason
                      // that constraint exists.
                      reviewed_by: user.id,
                      reviewed_at: new Date().toISOString(),
                    } as Partial<Post>,
                    "Approved. You can publish it now.",
                  )
                }
              >
                Approve
              </Button>
            ) : null}

            {state === "approved" && !post.published ? (
              <Button
                variant="primary"
                busy={busy}
                onClick={() =>
                  save(
                    { published: true, published_at: new Date().toISOString() } as Partial<Post>,
                    "Published. It will appear on the site at the next rebuild.",
                  )
                }
              >
                Publish
              </Button>
            ) : null}

            {post.published ? (
              <Button
                variant="secondary"
                busy={busy}
                onClick={() => save({ published: false }, "Taken off the site.")}
              >
                Unpublish
              </Button>
            ) : null}

            {state === "submitted" ? (
              <Button
                variant="secondary"
                busy={busy}
                onClick={() => {
                  const note = window.prompt("What needs changing? The author will see this.");
                  if (note === null) return;
                  save(
                    { review_state: "changes_requested", review_note: note },
                    "Sent back to the author.",
                  );
                }}
              >
                Request changes
              </Button>
            ) : null}
          </>
        ) : null}

        {!isNew && (admin || state === "draft") ? (
          <span className="ml-auto">
            <ConfirmButton
              what={post.title || "this post"}
              onConfirm={async () => {
                await items.remove("posts", id!);
                router.replace("/admin/posts/");
              }}
            >
              Delete
            </ConfirmButton>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function Page() {
  // useSearchParams needs a Suspense boundary under static export.
  return (
    <Suspense fallback={<Loading what="the post" />}>
      <PostEditor />
    </Suspense>
  );
}
