-- ══════════════════════════════════════════════════════════════════════
-- ADVERSARIAL CONSTRAINT TESTS — Phase B1.
--
-- Every INSERT below SHOULD FAIL. The database is the last line of
-- defence: rows can arrive through Directus, through a psql session, or
-- through a future service that never imports our Zod schemas. A rule
-- that lives only in TypeScript is a convention, not a constraint.
--
-- READING THE OUTPUT
--   ERROR: ...   → the constraint fired.        GOOD.
--   INSERT 0 1   → the row was ACCEPTED.        DEFECT.
--
-- Run:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f test-constraints.sql
--
-- Everything is inside a transaction that is rolled back, so this is safe
-- against a populated database.
--
-- Column names here are taken from the LIVE schema, not from the
-- migration source. An earlier revision of this file guessed them and
-- every test errored on a missing column rather than on a constraint —
-- which looks identical to a pass if you are not reading carefully.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

\set ok_alt '''Four Team BUET members on stage holding the Panasonic Award certificate'''

\echo ''
\echo '── 1. assets.alt — empty string'
SAVEPOINT s; INSERT INTO assets (storage_key, mime, width, height, alt, lqip, ratio, checksum)
  VALUES ('k/1','image/webp',100,100,'','data:,','1:1','c1'); ROLLBACK TO s;

\echo ''
\echo '── 2. assets.alt — whitespace only'
SAVEPOINT s; INSERT INTO assets (storage_key, mime, width, height, alt, lqip, ratio, checksum)
  VALUES ('k/2','image/webp',100,100,'                ','data:,','1:1','c2'); ROLLBACK TO s;

\echo ''
\echo '── 3. assets.alt — A FILENAME. "IMG_6738.JPG" is exactly 12 chars,'
\echo '     so a bare length>=12 check lets it straight through.'
SAVEPOINT s; INSERT INTO assets (storage_key, mime, width, height, alt, lqip, ratio, checksum)
  VALUES ('k/3','image/webp',100,100,'IMG_6738.JPG','data:,','1:1','c3'); ROLLBACK TO s;

\echo ''
\echo '── 4. assets.alt — placeholder prose'
SAVEPOINT s; INSERT INTO assets (storage_key, mime, width, height, alt, lqip, ratio, checksum)
  VALUES ('k/4','image/webp',100,100,'photo photo photo','data:,','1:1','c4'); ROLLBACK TO s;

\echo ''
\echo '── 5. assets.alt — fewer than three words'
SAVEPOINT s; INSERT INTO assets (storage_key, mime, width, height, alt, lqip, ratio, checksum)
  VALUES ('k/5','image/webp',100,100,'robot photograph','data:,','1:1','c5'); ROLLBACK TO s;

\echo ''
\echo '── 6. assets.width — zero'
SAVEPOINT s; INSERT INTO assets (storage_key, mime, width, height, alt, lqip, ratio, checksum)
  VALUES ('k/6','image/webp',0,100,:ok_alt,'data:,','1:1','c6'); ROLLBACK TO s;

\echo ''
\echo '── 7. assets.ratio — unlisted ratio'
SAVEPOINT s; INSERT INTO assets (storage_key, mime, width, height, alt, lqip, ratio, checksum)
  VALUES ('k/7','image/webp',100,100,:ok_alt,'data:,','7:3','c7'); ROLLBACK TO s;

\echo ''
\echo '── 8. achievements — a RESULT without verification.'
\echo '     A recorded placement must be provable.'
SAVEPOINT s; INSERT INTO achievements (year, programme, track, result, verified)
  VALUES (2015,'Some Contest','international','1st Place',false); ROLLBACK TO s;

\echo ''
\echo '── 9. achievements — verified with no attribution'
SAVEPOINT s; INSERT INTO achievements (year, programme, track, result, verified)
  VALUES (2015,'Some Contest','international','1st Place',true); ROLLBACK TO s;

\echo ''
\echo '── 10. events — end_date before start_date'
SAVEPOINT s; INSERT INTO events (slug, title, category, start_date, end_date)
  VALUES ('x','X','workshop','2024-05-10','2024-05-01'); ROLLBACK TO s;

\echo ''
\echo '── 11. committees — term_end before term_start'
SAVEPOINT s; INSERT INTO committees (ordinal, label, term_start, term_end)
  VALUES (11,'11th',2025,2024); ROLLBACK TO s;

\echo ''
\echo '── 12. committees — ordinal zero'
SAVEPOINT s; INSERT INTO committees (ordinal, label, term_start, term_end)
  VALUES (0,'zeroth',2024,2025); ROLLBACK TO s;

\echo ''
\echo '── 13. partners.tier — unlisted tier'
SAVEPOINT s; INSERT INTO partners (name, tier) VALUES ('X','platinum'); ROLLBACK TO s;

\echo ''
\echo '── 14. asset_derivatives.format — png (avif/webp only)'
SAVEPOINT s; INSERT INTO asset_derivatives (asset_id, width, format, storage_key, bytes)
  VALUES (gen_random_uuid(),100,'png','k/d',1); ROLLBACK TO s;

\echo ''
\echo '── 15. events.category — unlisted category'
SAVEPOINT s; INSERT INTO events (slug, title, category, start_date)
  VALUES ('y','Y','hackathon','2024-05-01'); ROLLBACK TO s;

\echo ''
\echo '── 16. CONTROL — a well-formed asset MUST be ACCEPTED.'
\echo '      Expect "INSERT 0 1" here. Anything else means the'
\echo '      constraints have become too strict to hold real data.'
SAVEPOINT s; INSERT INTO assets (storage_key, mime, width, height, alt, lqip, ratio, checksum)
  VALUES ('k/ok','image/webp',960,1200,:ok_alt,'data:,','4:5','cok'); ROLLBACK TO s;

\echo ''
\echo '── 17. CONTROL — an unverified participation MUST be ACCEPTED.'
\echo '      result NULL means "competed, outcome unconfirmed" — it must'
\echo '      never be blocked, or the archive cannot record reality.'
SAVEPOINT s; INSERT INTO achievements (year, programme, track, result, verified)
  VALUES (2013,'NASA Lunabotics','international',NULL,false); ROLLBACK TO s;

\echo ''
\echo '── 18. PRIVACY — members must carry NO contact/phone column'
SELECT CASE WHEN count(*) = 0
            THEN 'PASS — no contact column on members'
            ELSE 'FAIL — found: ' || string_agg(column_name, ', ')
       END AS privacy_check
FROM information_schema.columns
WHERE table_name = 'members'
  AND column_name ~* 'contact|phone|mobile|cell|whatsapp';

ROLLBACK;
