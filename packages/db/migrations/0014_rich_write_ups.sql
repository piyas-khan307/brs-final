-- ══════════════════════════════════════════════════════════════════════
-- A THIRD BODY FORMAT: 'doc'.
--
-- The admin editor was a contenteditable that serialised to markdown. The
-- club asked for what Blogger gives them — fonts, sizes, text and
-- highlight colour, alignment, pictures placed between the paragraphs,
-- and embedded video — and not one of those seven has a markdown
-- spelling. The storage format was the ceiling.
--
-- ── WHY NOT 'html', WHICH THIS CHECK ALREADY PERMITS ──
-- Because then the article page renders author-supplied HTML, and the
-- only thing between a compromised editor account and script running in
-- every visitor's browser is a hand-written sanitiser's allow-list. That
-- is precisely the trade apps/web/src/lib/markdown.ts refused, and the
-- reasoning does not weaken because the feature list got longer.
--
-- 'doc' is the editor's own document tree, stored as JSON:
--
--     {"type":"doc","content":[{"type":"paragraph","content":[…]}]}
--
-- The build walks that tree and emits tags it wrote itself around text it
-- escaped itself (apps/web/src/lib/richtext/render.ts). There is no code
-- path by which a byte of author input becomes markup. A <script> typed
-- into the editor is a text node whose characters happen to be
-- "<script>", and it publishes as visible text — the same guarantee the
-- markdown renderer gives, kept while gaining everything above.
--
-- ── NOTHING IS CONVERTED HERE ──
-- Every existing row stays 'md' and keeps rendering through the markdown
-- renderer, which is not going away — ~400 archive write-ups are stored
-- in it. A row becomes 'doc' when a human opens it in the editor and
-- saves, and not before, so a bad conversion can only ever affect an
-- entry somebody is looking at. Both formats are supported on the read
-- side indefinitely.
--
-- ── 'html' IS LEFT IN THE CHECK ──
-- Nothing writes it and nothing should. It predates this migration and
-- removing it would be a destructive change to defend a rule the
-- application already enforces; the API's response validation and the
-- content build are where that is held.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_body_format_check;
ALTER TABLE events
  ADD CONSTRAINT events_body_format_check CHECK (body_format IN ('md','html','doc'));

-- Posts share the editor, so they share the format. A public posts page
-- does not exist yet; when it does, it renders through the same two
-- paths the event page now has.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_body_format_check;
ALTER TABLE posts
  ADD CONSTRAINT posts_body_format_check CHECK (body_format IN ('md','html','doc'));

INSERT INTO schema_migrations (version) VALUES ('0014_rich_write_ups')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
