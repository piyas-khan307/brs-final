import type { Metadata } from "next";
import "./globals.css";

/**
 * Root layout — a Server Component, shipping zero client JS (§10.3).
 *
 * FONTS: Archivo Variable and IBM Plex Mono are self-hosted via
 * next/font/local — no third-party font CDN (PROJECT_SPEC.md §17.6). The
 * .woff2 files are not yet in the repo; see src/app/fonts/README.md. Until
 * they land, globals.css falls back to a system stack so the build works.
 *
 * The Archivo `wdth` axis is load-bearing for display type (§3.2, §4.4).
 * Do not substitute a static-width build.
 */

export const metadata: Metadata = {
  title: "BUET Robotics Society",
  description:
    "Robots designed, built and campaigned at Bangladesh University of Engineering & Technology since 2005.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Dark is canonical (laboratory / exhibition). An explicit OS light
    // preference is honoured in globals.css; data-theme overrides both.
    <html lang="en" data-theme="dark">
      <body className="bg-bg-base text-text-primary antialiased">{children}</body>
    </html>
  );
}
