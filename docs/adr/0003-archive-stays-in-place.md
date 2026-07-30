# ADR 0003 — The source archive stays in place and is gitignored

**Status** Accepted · **Date** 30 July 2026

## Context

The repository root contains the club's 2.0 GB source archive as three
directories: `BRS/` (1.3 GB), `BRS ExCom/` (693 MB), and `logo/` (1.8 MB).
1,105 images, 102 text files, 7 markdown rosters.

`implementation_plan.md` §11.1 specifies an `assets-source/` directory for
these originals. Moving 2 GB of the client's material is a structural change
to files they own and did not ask us to reorganise.

## Decision

Leave the archive where it is. Gitignore all three directories explicitly, in
a `.gitignore` written **before** `git init`.

`assets-source/` remains the documented target, and the move is a one-line
operation the client can run whenever they prefer:

```sh
mkdir -p assets-source && mv BRS "BRS ExCom" logo assets-source/
```

Both locations are gitignored, so the move requires no other change.

## Consequences

- No 2 GB of binaries can enter git history. A stray `git add .` before the
  ignore file existed would have been painful to undo, which is why ordering
  mattered.
- The ingest pipeline (`packages/media`) reads from a configurable root, so it
  is indifferent to which layout is in use.
- Non-web source files are separately ignored by extension: `.ai`, `.eps`,
  `.ARW`, `.psd`, `.heic`, `.lnk` — roughly 250 MB including a 105 MB
  `Booth 2.eps` and a 37 MB raw.
- **Exception:** `logo/BRS Logo FINAL.ai` is the source for the inline SVG
  logo. It is exported by hand once, and the resulting SVG *is* committed.

## Note

The archive is deliberately excluded from the PII gate's scan targets. Those
roster files legitimately contain ~470 phone numbers — they are what we strip
*from*. Scanning them would fail forever and teach everyone to ignore the
gate. `pnpm audit:pii --scan-archive` reports the census instead:
**386 numbers across 22 files**, which is the risk the gate exists to contain.
