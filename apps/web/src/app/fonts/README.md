# Fonts

Two families, both variable, both self-hosted. No third-party font CDN
(`PROJECT_SPEC.md` §17.6) — latency, privacy, and a single point of failure.

## Required files

| File | Family | Axes | Notes |
| --- | --- | --- | --- |
| `Archivo[wdth,wght].woff2` | Archivo Variable | `wdth` 62–125, `wght` 400–700 | **The `wdth` axis is load-bearing.** Display type at §4.4 uses `wdth 112`. Do not substitute a static-width build. |
| `IBMPlexMono-Regular.woff2` | IBM Plex Mono | 400 | Placards, metadata, tabular figures. |
| `IBMPlexMono-Medium.woff2` | IBM Plex Mono | 500 | Emphasis in placards only. |

Both are open-licence (Archivo: OFL; IBM Plex: OFL).

## Before adding them

1. **Subset** to Latin + Latin-Ext. Unsubset variable fonts blow the 90 KB
   font budget (§4.7) on their own.
2. Preload **only** the two primary weights.
3. `font-display: swap` — FOIT is a performance defect (§17.6).
4. Keep total font payload under **90 KB**.

## Then wire them up

Create `src/app/fonts.ts`:

```ts
import localFont from "next/font/local";

export const archivo = localFont({
  src: "./fonts/Archivo[wdth,wght].woff2",
  variable: "--font-archivo",
  display: "swap",
  preload: true,
});

export const plexMono = localFont({
  src: "./fonts/IBMPlexMono-Regular.woff2",
  variable: "--font-plex-mono",
  display: "swap",
  preload: true,
});
```

…and add both `variable` classes to `<html>` in `layout.tsx`.

`globals.css` already references `var(--font-archivo)` and
`var(--font-plex-mono)` with a system fallback chain, so the site builds and
renders correctly before the files arrive — it simply will not have the
`wdth` axis, which means **the landing page cannot pass the Gate until these
land** (rubric check 12).

## Substitution

If Archivo is rejected, the approved fallback is **Inter Tight**. Do **not**
substitute a "techno" or squared-terminal display face — see §17.2.
