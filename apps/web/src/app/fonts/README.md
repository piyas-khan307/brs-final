# Fonts

Three families, self-hosted. No third-party font CDN (`PROJECT_SPEC.md`
§17.6) — latency, privacy, and a single point of failure.

**Do not edit these files by hand.** They are fetched reproducibly:

```sh
node scripts/fetch-fonts.mjs
```

That script is the source of truth for which cuts we ship and, more
usefully, for *why* — every choice below was made against a measured byte
cost recorded in its comments. It fails the build if the total goes over
budget.

## What is here

| File | Family | Axes | Carries |
| --- | --- | --- | --- |
| `IBMPlexSans-variable-latin.woff2` | IBM Plex Sans | `wght` 100–700 | Everything not listed below — body copy, UI, the admin panel |
| `IBMPlexMono-400-latin.woff2` | IBM Plex Mono | 400 only | Placards, labels, metadata, tabular figures |
| `SourceSerif4-variable-latin.woff2` | Source Serif 4 | `wght` 200–900 | Display only — page titles, section headings, roster names |

All three are OFL.

| | Bytes | |
| --- | ---: | --- |
| IBM Plex Sans | 45,712 | |
| IBM Plex Mono | 14,708 | |
| Source Serif 4 | 50,824 | |
| **Total** | **111,244** | 108.6 KB against a **110 KB** budget (§4.7) |

**There is 1.4 KB of headroom.** Adding a weight, a subset or a fourth
family fails the gate. That is intended — the budget has been revised
upward once already, on measurement, and should not be revised again
casually.

## The rules each family carries

**IBM Plex Sans** has no `wdth` axis, and nothing may set one. Nothing may
ask it for a weight **above 700** either: the axis clamps in silence, so an
800 renders as a 700 and the bug is invisible. It declares
`font-stretch: 100%` — a fixed width, not a range, and not a width axis.

**Source Serif 4** ships **without its optical-size axis**. `opsz` costs
70 KB — more than the other two families combined — so it was dropped to
stay inside §4.7. The consequence is that the face does not redraw itself
at small sizes, so: **never set it below about 1rem**, never for body copy,
never for labels or figures. Unlike the Instrument Serif it replaced, it
*does* have a real weight axis, so `font-variation-settings` on it is legal.

## Why these three

The short version; `scripts/fetch-fonts.mjs` and `../fonts.ts` carry the
argument in full.

Plex Sans replaced **Space Grotesk** on client direction — *"its look like
ai made"*. That read is correct: Space Grotesk became the default display
face of the site-generating LLM tools, and it landed here alongside a rose
gradient button and a glass-blur panel, which is the rest of that same
house style. A face that signals "generated" is wrong for an archive whose
whole claim is that the material is real. Plex Sans is the mono's sibling —
same skeleton, same designer — so the placards and the prose became one
superfamily instead of two unrelated voices, and it is IBM's corporate type
drawn from Bauhaus-era engineering lettering: an engineering institution's
face by provenance rather than by association.

Source Serif 4 replaced **Instrument Serif** for the same reason, and buys
a weight axis the 400-only face could not offer.

The serif is the third family against a two-family rule. It exists because
the club asked for `/executive-committee` not to look like *"the current
simple font style"*, and no amount of Plex Sans answers that — a grotesque
set larger is still a grotesque. It is the last exception.
