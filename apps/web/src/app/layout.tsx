import type { Metadata } from "next";
import { plexSans, plexMono, sourceSerif } from "./fonts";
import "./globals.css";

/**
 * Root layout — a Server Component, shipping zero client JS (§10.3).
 *
 * Fonts are self-hosted via next/font/local (PROJECT_SPEC.md §17.6).
 * Both variable families vary on WEIGHT ONLY — Plex Sans 100-700, Source
 * Serif 200-900, neither with a width or optical-size axis. See fonts.ts
 * for what each family is allowed to set.
 */

export const metadata: Metadata = {
  metadataBase: new URL("https://brs.example.invalid"),
  icons: { icon: "/icon.png" },
  title: "BUET Robotics Society",
  description:
    "Robots designed, built and campaigned at Bangladesh University of Engineering & Technology since ABU Robocon 2005. Six international programmes. Nineteen workshops. One Panasonic Award.",
  openGraph: {
    title: "BUET Robotics Society",
    description:
      "Robots designed, built and campaigned at BUET since ABU Robocon 2005. Six international programmes. Nineteen workshops. One Panasonic Award.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // One ground only: the warm bone-grey defined in globals.css. The
    // dark theme was withdrawn on client direction ("dont make the
    // background pure dark"), so there is no theme to switch between.
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${sourceSerif.variable}`}
    >
      <body className="bg-bg-base text-text-primary antialiased">{children}</body>
    </html>
  );
}
