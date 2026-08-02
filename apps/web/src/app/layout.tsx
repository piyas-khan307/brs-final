import type { Metadata } from "next";
import { spaceGrotesk, plexMono } from "./fonts";
import "./globals.css";

/**
 * Root layout — a Server Component, shipping zero client JS (§10.3).
 *
 * Fonts are self-hosted via next/font/local (PROJECT_SPEC.md §17.6).
 * Space Grotesk varies on weight only — see fonts.ts.
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
    <html lang="en" className={`${spaceGrotesk.variable} ${plexMono.variable}`}>
      <body className="bg-bg-base text-text-primary antialiased">{children}</body>
    </html>
  );
}
